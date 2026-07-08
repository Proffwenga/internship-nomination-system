// Sends account emails (verification, password set/reset) via generic SMTP.
// If SMTP isn't configured (no SMTP_HOST set), emails are logged to the
// console instead of sent — this lets the app run and be tested without an
// email provider connected yet, rather than crashing on startup.
const nodemailer = require('nodemailer');

const APP_URL = (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
const FROM = process.env.SMTP_FROM || 'Internship Nomination System <no-reply@example.com>';

let transporter = null;
if (process.env.SMTP_HOST) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER ? {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    } : undefined,
  });
}

async function sendMail({ to, subject, html }) {
  if (!transporter) {
    console.log('--- SMTP not configured; email would have been sent ---');
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log(html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
    console.log('--- end email ---');
    return { simulated: true };
  }
  return transporter.sendMail({ from: FROM, to, subject, html });
}

function sendVerificationEmail(to, token) {
  const link = `${APP_URL}/verify.html?token=${encodeURIComponent(token)}`;
  return sendMail({
    to,
    subject: 'Verify your Internship Nomination System account',
    html: `
      <p>Hello,</p>
      <p>Thanks for registering as a placement officer on the Royal Media Services
      Internship Nomination System. Confirm your email address to activate your account:</p>
      <p><a href="${link}">${link}</a></p>
      <p>This link expires in 24 hours. If you didn't request this, you can ignore this email.</p>
    `,
  });
}

function sendSetPasswordEmail(to, token, { isNewAccount = true } = {}) {
  const link = `${APP_URL}/reset-password.html?token=${encodeURIComponent(token)}`;
  return sendMail({
    to,
    subject: isNewAccount
      ? 'Set your password — Internship Nomination System'
      : 'Reset your password — Internship Nomination System',
    html: `
      <p>Hello,</p>
      <p>${isNewAccount
        ? 'An account has been created for you on the Royal Media Services Internship Nomination System.'
        : 'A password reset was requested for your Internship Nomination System account.'}</p>
      <p>Click below to set your password:</p>
      <p><a href="${link}">${link}</a></p>
      <p>This link expires in 1 hour. If you didn't request this, you can ignore this email.</p>
    `,
  });
}

module.exports = { sendMail, sendVerificationEmail, sendSetPasswordEmail };
