import nodemailer from 'nodemailer';
import { config } from './config.js';

// Le "transporter" est l'objet Nodemailer qui sait parler à ton serveur SMTP.
// Port 587 = connexion en clair qui passe en TLS via STARTTLS (secure:false est normal).
// Port 465 = TLS dès le départ (secure:true).
const transporter = nodemailer.createTransport({
  host: config.smtp.host,
  port: config.smtp.port,
  secure: config.smtp.port === 465,
  auth: { user: config.smtp.user, pass: config.smtp.pass },
});

// Le nom saisi par l'utilisateur est inséré dans du HTML : on neutralise les caractères
// spéciaux pour qu'on ne puisse pas injecter de balises dans le mail.
const escapeHtml = (s) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

async function sendMail({ to, subject, text, html }) {
  const info = await transporter.sendMail({ from: config.smtp.from, to, subject, text, html });
  // Avec Ethereal, getTestMessageUrl renvoie le lien pour VOIR le mail dans le navigateur.
  // Avec un vrai SMTP (Brevo...) il renvoie false : rien n'est affiché.
  const preview = nodemailer.getTestMessageUrl(info);
  if (preview) console.log(`Aperçu du mail "${subject}" : ${preview}`);
}

// Gabarit commun : un paragraphe, un bouton, et le lien en clair au cas où le bouton ne marche pas.
function layout({ title, intro, buttonLabel, link, outro }) {
  return `
  <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;color:#222">
    <h2 style="margin-top:0">${title}</h2>
    <p>${intro}</p>
    <p style="margin:28px 0">
      <a href="${link}" style="background:#1a73e8;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none">
        ${buttonLabel}
      </a>
    </p>
    <p style="font-size:13px;color:#555">Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br>${link}</p>
    <p style="font-size:13px;color:#555">${outro}</p>
  </div>`;
}

export function sendVerificationMail(user, rawToken) {
  const link = `${config.appUrl}/verify-email?token=${rawToken}`;
  const name = escapeHtml(user.name);
  return sendMail({
    to: user.email,
    subject: 'Confirmez votre adresse email - TaskFlow',
    text: `Bonjour ${user.name},\n\nConfirmez votre adresse email pour activer votre compte TaskFlow (lien valable 24 h) :\n${link}\n\nSi vous n'êtes pas à l'origine de cette inscription, ignorez ce message.`,
    html: layout({
      title: 'Bienvenue sur TaskFlow',
      intro: `Bonjour ${name}, confirmez votre adresse email pour activer votre compte.`,
      buttonLabel: 'Confirmer mon email',
      link,
      outro: "Ce lien est valable 24 heures. Si vous n'êtes pas à l'origine de cette inscription, ignorez ce message.",
    }),
  });
}

export function sendResetMail(user, rawToken) {
  const link = `${config.appUrl}/reset-password?token=${rawToken}`;
  const name = escapeHtml(user.name);
  return sendMail({
    to: user.email,
    subject: 'Réinitialisation de votre mot de passe - TaskFlow',
    text: `Bonjour ${user.name},\n\nPour choisir un nouveau mot de passe (lien valable 1 h) :\n${link}\n\nSi vous n'avez rien demandé, ignorez ce message : votre mot de passe reste inchangé.`,
    html: layout({
      title: 'Nouveau mot de passe',
      intro: `Bonjour ${name}, vous avez demandé à réinitialiser votre mot de passe.`,
      buttonLabel: 'Choisir un nouveau mot de passe',
      link,
      outro: "Ce lien est valable 1 heure. Si vous n'avez rien demandé, ignorez ce message : votre mot de passe reste inchangé.",
    }),
  });
}