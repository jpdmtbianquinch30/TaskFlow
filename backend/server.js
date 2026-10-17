import bcrypt from 'bcryptjs';
import cors from 'cors';
import express from 'express';
import { rateLimit } from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import { config } from './config.js';
import { sendResetMail, sendVerificationMail } from './mail.js';
import { createUser, findByEmail, listUsers, findByResetHash, findByVerificationHash, initStore, removeUser, updateUser } from './store.js';
import { hashToken, newToken } from './tokens.js';

// ------------------------------------------------------------------ utilitaires

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_RE = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/; // 8 caractères, 1 lettre, 1 chiffre (même règle que le front)

// On n'accepte que des chaînes : un corps JSON du type {"email": {"$ne": null}} ne doit jamais passer.
const asString = (value) => (typeof value === 'string' ? value.trim() : '');
const asEmail = (value) => asString(value).toLowerCase();

// Format d'erreur unique : { code, message }. Le front se base sur "code" (stable),
// jamais sur "message" (qu'on peut reformuler).
const fail = (res, status, code, message) => res.status(status).json({ code, message });

// Hash factice : sert à faire le même travail (bcrypt) quand l'email n'existe pas,
// pour que le temps de réponse ne révèle pas si un compte existe.
const DUMMY_HASH = bcrypt.hashSync('mot-de-passe-factice', 10);

// ------------------------------------------------------------------ application

const app = express();
app.use(cors({ origin: config.appUrl }));   // seul le front Angular a le droit d'appeler cette API
app.use(express.json({ limit: '10kb' }));   // corps JSON limité : pas de gros envois

// Anti force brute : 100 requêtes / 15 min / IP sur toute l'authentification...
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { code: 'TOO_MANY_REQUESTS', message: 'Trop de requêtes. Réessayez dans quelques minutes.' },
});
// ...et 10 / 15 min pour les routes qui ENVOIENT un mail (évite d'utiliser ton SMTP pour spammer).
const mailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { code: 'TOO_MANY_REQUESTS', message: "Trop de demandes d'email. Réessayez dans quelques minutes." },
});
app.use('/auth', generalLimiter);

// ------------------------------------------------------------------ INSCRIPTION

// Utilisé par le validateur asynchrone du formulaire (même rôle que uniqueProjectNameValidator).
app.get('/auth/email-exists', (req, res) => {
  res.json({ exists: Boolean(findByEmail(asEmail(req.query.email))) });
});

app.post('/auth/register', mailLimiter, async (req, res) => {
  const name = asString(req.body?.name);
  const email = asEmail(req.body?.email);
  const password = asString(req.body?.password);

  // On revalide TOUT côté serveur : les validations Angular sont de simples confort d'utilisation,
  // n'importe qui peut appeler l'API sans passer par le formulaire.
  if (name.length < 2) return fail(res, 400, 'INVALID_NAME', 'Le nom est trop court.');
  if (!EMAIL_RE.test(email)) return fail(res, 400, 'INVALID_EMAIL', "Format d'email invalide.");
  if (!PASSWORD_RE.test(password)) {
    return fail(res, 400, 'WEAK_PASSWORD', 'Le mot de passe doit faire 8 caractères avec une lettre et un chiffre.');
  }
  if (findByEmail(email)) return fail(res, 409, 'EMAIL_TAKEN', 'Un compte existe déjà avec cet email.');

  const { raw, hash } = newToken();
  const user = await createUser({
    name,
    email,
    passwordHash: await bcrypt.hash(password, 10), // jamais le mot de passe en clair
    verified: false,                               // le compte est inactif tant que l'email n'est pas confirmé
    verificationHash: hash,
    verificationExpiresAt: Date.now() + config.verificationTtlMs,
  });

  try {
    await sendVerificationMail(user, raw);
  } catch (err) {
    // Si le mail ne part pas, on annule la création : sinon l'utilisateur aurait un compte
    // inutilisable ET se verrait répondre "email déjà pris" au second essai.
    console.error('Échec envoi mail de confirmation :', err);
    await removeUser(user);
    return fail(res, 502, 'MAIL_FAILED', "L'email de confirmation n'a pas pu être envoyé. Réessayez.");
  }

  res.status(201).json({ message: 'Compte créé. Vérifiez votre boîte mail pour le confirmer.' });
});

// POST et pas GET : l'action change l'état du compte. Les antivirus/messageries "pré-visitent" les liens
// des mails (GET) : si le lien activait le compte tout seul, il serait consommé avant le clic réel.
// Ici le lien ouvre une page Angular, et c'est elle qui envoie ce POST.
app.post('/auth/verify-email', async (req, res) => {
  const token = asString(req.body?.token);
  const user = token ? findByVerificationHash(hashToken(token)) : undefined;

  if (!user) return fail(res, 400, 'INVALID_TOKEN', 'Lien invalide ou déjà utilisé.');
  if (user.verificationExpiresAt < Date.now()) {
    return fail(res, 400, 'EXPIRED_TOKEN', 'Ce lien a expiré. Demandez un nouvel email de confirmation.');
  }

  await updateUser(user, { verified: true, verificationHash: null, verificationExpiresAt: null }); // usage unique
  res.json({ message: 'Email confirmé. Vous pouvez vous connecter.' });
});

// Renvoi du mail de confirmation (mail perdu, lien expiré...).
app.post('/auth/resend-verification', mailLimiter, async (req, res) => {
  const user = findByEmail(asEmail(req.body?.email));

  if (user && !user.verified) {
    const { raw, hash } = newToken(); // le nouveau jeton remplace l'ancien : l'ancien lien est invalidé
    await updateUser(user, { verificationHash: hash, verificationExpiresAt: Date.now() + config.verificationTtlMs });
    await sendVerificationMail(user, raw).catch((err) => console.error('Échec renvoi confirmation :', err));
  }
  // Réponse IDENTIQUE dans tous les cas : on ne révèle pas si l'adresse a un compte.
  res.json({ message: "Si un compte non confirmé existe avec cette adresse, un nouvel email vient d'être envoyé." });
});

// ------------------------------------------------------------------ CONNEXION

app.post('/auth/login', async (req, res) => {
  const email = asEmail(req.body?.email);
  const password = asString(req.body?.password);
  const user = findByEmail(email);

  // On compare TOUJOURS un hash (le vrai, ou le factice) : même durée de traitement dans les deux cas.
  const passwordOk = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);

  // Même message pour "email inconnu" et "mauvais mot de passe" : on ne dit pas lequel est faux.
  if (!user || !passwordOk) {
    return fail(res, 401, 'INVALID_CREDENTIALS', 'Email ou mot de passe incorrect.');
  }
  // On ne révèle "email non confirmé" qu'APRÈS avoir vérifié le mot de passe : seul le vrai propriétaire le voit.
  if (!user.verified) {
    return fail(res, 403, 'EMAIL_NOT_VERIFIED', "Votre email n'est pas encore confirmé.");
  }

  const token = jwt.sign({ sub: user.id }, config.jwtSecret, { expiresIn: config.sessionSeconds });
  res.json({
    token,
    expiresAt: Date.now() + config.sessionSeconds * 1000,
    user: { id: user.id, name: user.name, email: user.email }, // JAMAIS le hash ni les jetons
  });
});

// ------------------------------------------------------------------ LISTE DES UTILISATEURS

// Pour assigner des tâches à des membres : le front a besoin de leurs noms.
// Réservé aux utilisateurs connectés (JWT valide) et sans aucun secret dans la réponse.
const requireAuth = (req, res, next) => {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  try {
    jwt.verify(token, config.jwtSecret);
    next();
  } catch {
    fail(res, 401, 'UNAUTHORIZED', 'Session invalide ou expirée.');
  }
};

app.get('/auth/users', requireAuth, (_req, res) => {
  res.json(listUsers().filter((u) => u.verified).map(({ id, name, email }) => ({ id, name, email })));
});

// ------------------------------------------------------------------ MOT DE PASSE OUBLIÉ

app.post('/auth/forgot-password', mailLimiter, async (req, res) => {
  const user = findByEmail(asEmail(req.body?.email));

  if (user) {
    try {
      if (user.verified) {
        const { raw, hash } = newToken();
        await updateUser(user, { resetHash: hash, resetExpiresAt: Date.now() + config.resetTtlMs });
        await sendResetMail(user, raw);
      } else {
        // Compte jamais confirmé : réinitialiser ne servirait à rien (connexion refusée),
        // on renvoie donc plutôt le mail de confirmation.
        const { raw, hash } = newToken();
        await updateUser(user, { verificationHash: hash, verificationExpiresAt: Date.now() + config.verificationTtlMs });
        await sendVerificationMail(user, raw);
      }
    } catch (err) {
      console.error('Échec envoi mail forgot-password :', err);
    }
  }
  // Même réponse que l'email existe ou non (anti-énumération des comptes).
  res.json({ message: "Si un compte existe avec cette adresse, un email vient d'être envoyé." });
});

app.post('/auth/reset-password', async (req, res) => {
  const token = asString(req.body?.token);
  const password = asString(req.body?.password);

  if (!PASSWORD_RE.test(password)) {
    return fail(res, 400, 'WEAK_PASSWORD', 'Le mot de passe doit faire 8 caractères avec une lettre et un chiffre.');
  }
  const user = token ? findByResetHash(hashToken(token)) : undefined;
  if (!user) return fail(res, 400, 'INVALID_TOKEN', 'Lien invalide ou déjà utilisé.');
  if (user.resetExpiresAt < Date.now()) {
    return fail(res, 400, 'EXPIRED_TOKEN', 'Ce lien a expiré. Refaites une demande.');
  }

  await updateUser(user, {
    passwordHash: await bcrypt.hash(password, 10),
    resetHash: null,          // usage unique : le lien ne marchera plus jamais
    resetExpiresAt: null,
  });
  res.json({ message: 'Mot de passe modifié. Vous pouvez vous connecter.' });
});

// ------------------------------------------------------------------ ERREURS & DÉMARRAGE

// Filet de sécurité : toute erreur imprévue (JSON invalide, bug...) devient une réponse propre,
// sans jamais afficher la trace de l'erreur au client.
app.use((err, _req, res, _next) => {
  console.error(err);
  const status = err.status ?? 500;
  fail(res, status, status === 400 ? 'BAD_REQUEST' : 'SERVER_ERROR', status === 400 ? 'Requête invalide.' : 'Erreur interne du serveur.');
});

await initStore();
app.listen(config.port, () => console.log(`API d'authentification sur http://localhost:${config.port}`));