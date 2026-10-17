// Lit les variables d'environnement UNE seule fois, vérifie qu'elles existent,
// et les expose dans un objet simple. Si une valeur manque, on arrête tout de suite
// avec un message clair plutôt que de planter plus tard au moment d'envoyer un mail.
const REQUIRED = ['APP_URL', 'JWT_SECRET', 'SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'MAIL_FROM'];

const missing = REQUIRED.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(`Variables manquantes dans backend/.env : ${missing.join(', ')}`);
  process.exit(1);
}
if (process.env.JWT_SECRET.length < 32) {
  console.error('JWT_SECRET est trop court : utilise au moins 32 caractères aléatoires.');
  process.exit(1);
}

const HOUR = 60 * 60 * 1000;

export const config = {
  port: Number(process.env.PORT ?? 4000),
  appUrl: process.env.APP_URL.replace(/\/$/, ''),
  jwtSecret: process.env.JWT_SECRET,
  sessionSeconds: 60 * 60,        // la connexion dure 1 heure
  verificationTtlMs: 24 * HOUR,   // le lien de confirmation d'email vit 24 h
  resetTtlMs: 1 * HOUR,           // le lien "mot de passe oublié" vit 1 h
  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.MAIL_FROM,
  },
};