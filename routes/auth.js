const express = require('express');
const router = express.Router();
const pool = require('../db');
const { issueToken } = require('../auth');
const { hashPassword, comparePassword, generateToken, isValidPassword } = require('../password');
const { sendVerificationEmail, sendSetPasswordEmail } = require('../mailer');

const VERIFY_EXPIRY_HOURS = 24;
const RESET_EXPIRY_HOURS = 1;

// Facilitators self-register. Creates an unverified account and emails a
// verification link. HR/admin accounts are not created here — see routes/admin.js.
router.post('/auth/register', async (req, res) => {
  const { email, password, fullName, institutionName, phone } = req.body || {};
  const cleanEmail = String(email || '').trim().toLowerCase();

  if (!cleanEmail || !cleanEmail.includes('@')) {
    return res.status(400).json({ error: 'A valid email address is required.' });
  }
  if (!fullName || !fullName.trim()) {
    return res.status(400).json({ error: 'Your name is required.' });
  }
  if (!institutionName || !institutionName.trim()) {
    return res.status(400).json({ error: 'Name of institution is required.' });
  }
  if (!isValidPassword(password)) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }

  const existing = await pool.query('SELECT id FROM users WHERE lower(email) = $1', [cleanEmail]);
  if (existing.rows.length) {
    return res.status(400).json({ error: 'An account with this email already exists. Try logging in, or use "Forgot password".' });
  }

  const passwordHash = await hashPassword(password);
  const token = generateToken();
  const expires = new Date(Date.now() + VERIFY_EXPIRY_HOURS * 3600 * 1000);

  await pool.query(
    `INSERT INTO users (email, password_hash, role, full_name, institution_name, phone,
       email_verified, verification_token, verification_token_expires)
     VALUES ($1,$2,'facilitator',$3,$4,$5,false,$6,$7)`,
    [cleanEmail, passwordHash, fullName.trim(), institutionName.trim(), phone || '', token, expires]
  );

  await sendVerificationEmail(cleanEmail, token);
  res.json({ ok: true, message: 'Account created. Check your email for a verification link before logging in.' });
});

router.get('/auth/verify', async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: 'Missing verification token.' });

  const { rows } = await pool.query(
    `SELECT id FROM users WHERE verification_token = $1 AND verification_token_expires > now()`,
    [token]
  );
  if (!rows.length) {
    return res.status(400).json({ error: 'This verification link is invalid or has expired. Request a new one from the login page.' });
  }
  await pool.query(
    `UPDATE users SET email_verified = true, verification_token = NULL, verification_token_expires = NULL WHERE id = $1`,
    [rows[0].id]
  );
  res.json({ ok: true, message: 'Email verified. You can now log in.' });
});

router.post('/auth/resend-verification', async (req, res) => {
  const cleanEmail = String((req.body || {}).email || '').trim().toLowerCase();
  const generic = { ok: true, message: 'If that account exists and needs verification, a new email has been sent.' };
  if (!cleanEmail) return res.json(generic);

  const { rows } = await pool.query(
    `SELECT id, email_verified FROM users WHERE lower(email) = $1 AND role = 'facilitator'`, [cleanEmail]
  );
  if (rows.length && !rows[0].email_verified) {
    const token = generateToken();
    const expires = new Date(Date.now() + VERIFY_EXPIRY_HOURS * 3600 * 1000);
    await pool.query(
      `UPDATE users SET verification_token=$1, verification_token_expires=$2 WHERE id=$3`,
      [token, expires, rows[0].id]
    );
    await sendVerificationEmail(cleanEmail, token);
  }
  res.json(generic);
});

router.post('/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  const cleanEmail = String(email || '').trim().toLowerCase();

  const { rows } = await pool.query('SELECT * FROM users WHERE lower(email) = $1', [cleanEmail]);
  if (!rows.length) {
    return res.status(401).json({ error: 'Incorrect email or password.' });
  }
  const user = rows[0];
  if (!user.is_active) {
    return res.status(403).json({ error: 'This account has been deactivated. Contact HR.' });
  }
  const ok = await comparePassword(password || '', user.password_hash);
  if (!ok) {
    return res.status(401).json({ error: 'Incorrect email or password.' });
  }
  if (user.role === 'facilitator' && !user.email_verified) {
    return res.status(403).json({ error: 'Please verify your email before logging in. Check your inbox, or request a new link.', needsVerification: true });
  }

  await pool.query('UPDATE users SET last_login_at = now() WHERE id = $1', [user.id]);
  const token = issueToken(user);
  res.json({
    token,
    role: user.role,
    fullName: user.full_name,
    institutionName: user.institution_name,
    email: user.email,
  });
});

router.post('/auth/forgot-password', async (req, res) => {
  const cleanEmail = String((req.body || {}).email || '').trim().toLowerCase();
  const generic = { ok: true, message: 'If that email is registered, a password reset link has been sent.' };
  if (!cleanEmail) return res.json(generic);

  const { rows } = await pool.query('SELECT id, is_active FROM users WHERE lower(email) = $1', [cleanEmail]);
  if (rows.length && rows[0].is_active) {
    const token = generateToken();
    const expires = new Date(Date.now() + RESET_EXPIRY_HOURS * 3600 * 1000);
    await pool.query('UPDATE users SET reset_token=$1, reset_token_expires=$2 WHERE id=$3',
      [token, expires, rows[0].id]);
    await sendSetPasswordEmail(cleanEmail, token, { isNewAccount: false });
  }
  res.json(generic);
});

router.post('/auth/reset-password', async (req, res) => {
  const { token, password } = req.body || {};
  if (!token) return res.status(400).json({ error: 'Missing reset token.' });
  if (!isValidPassword(password)) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }
  const { rows } = await pool.query(
    `SELECT id FROM users WHERE reset_token = $1 AND reset_token_expires > now()`, [token]
  );
  if (!rows.length) {
    return res.status(400).json({ error: 'This link is invalid or has expired. Request a new one.' });
  }
  const passwordHash = await hashPassword(password);
  await pool.query(
    `UPDATE users SET password_hash=$1, reset_token=NULL, reset_token_expires=NULL,
       email_verified = true WHERE id=$2`,
    [passwordHash, rows[0].id]
  );
  res.json({ ok: true, message: 'Password set. You can now log in.' });
});

module.exports = router;
