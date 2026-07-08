const express = require('express');
const router = express.Router();
const pool = require('../db');
const { requireRole } = require('../auth');
const { generateToken } = require('../password');
const { sendSetPasswordEmail, sendVerificationEmail } = require('../mailer');

const RESET_EXPIRY_HOURS = 1;

// List every account. Admin only.
router.get('/admin/users', requireRole('admin'), async (req, res) => {
  const { rows } = await pool.query(`
    SELECT id, email, role, full_name, institution_name, phone, is_active,
           email_verified, created_at, last_login_at
    FROM users ORDER BY created_at DESC
  `);
  res.json(rows);
});

// Create an HR or admin account (facilitators self-register instead).
// Emails the person a link to set their own password.
router.post('/admin/users', requireRole('admin'), async (req, res) => {
  const { email, fullName, role } = req.body || {};
  const cleanEmail = String(email || '').trim().toLowerCase();

  if (!cleanEmail || !cleanEmail.includes('@')) {
    return res.status(400).json({ error: 'A valid email address is required.' });
  }
  if (!fullName || !fullName.trim()) {
    return res.status(400).json({ error: 'Full name is required.' });
  }
  if (!['hr', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Role must be "hr" or "admin".' });
  }

  const existing = await pool.query('SELECT id FROM users WHERE lower(email) = $1', [cleanEmail]);
  if (existing.rows.length) {
    return res.status(400).json({ error: 'An account with this email already exists.' });
  }

  // Placeholder password hash — unusable until they set a real one via the
  // emailed link (login is blocked before that because password_hash below
  // can never match any input password).
  const token = generateToken();
  const expires = new Date(Date.now() + RESET_EXPIRY_HOURS * 3600 * 1000);
  await pool.query(
    `INSERT INTO users (email, password_hash, role, full_name, is_active, email_verified,
       reset_token, reset_token_expires)
     VALUES ($1, 'unset', $2, $3, true, false, $4, $5)`,
    [cleanEmail, role, fullName.trim(), token, expires]
  );

  await sendSetPasswordEmail(cleanEmail, token, { isNewAccount: true });
  res.json({ ok: true, message: `Account created. An email has been sent to ${cleanEmail} to set their password.` });
});

// Activate / deactivate / change role.
router.patch('/admin/users/:id', requireRole('admin'), async (req, res) => {
  const { isActive, role } = req.body || {};
  const fields = [];
  const values = [];
  let i = 1;
  if (typeof isActive === 'boolean') { fields.push(`is_active = $${i++}`); values.push(isActive); }
  if (role && ['hr', 'admin', 'facilitator'].includes(role)) { fields.push(`role = $${i++}`); values.push(role); }
  if (!fields.length) return res.status(400).json({ error: 'Nothing to update.' });
  values.push(req.params.id);
  await pool.query(`UPDATE users SET ${fields.join(', ')} WHERE id = $${i}`, values);
  res.json({ ok: true });
});

// Resend the set-password / verification email for an account that hasn't
// activated yet.
router.post('/admin/users/:id/resend', requireRole('admin'), async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Account not found.' });
  const user = rows[0];

  if (user.role === 'facilitator') {
    const token = generateToken();
    const expires = new Date(Date.now() + 24 * 3600 * 1000);
    await pool.query('UPDATE users SET verification_token=$1, verification_token_expires=$2 WHERE id=$3',
      [token, expires, user.id]);
    await sendVerificationEmail(user.email, token);
  } else {
    const token = generateToken();
    const expires = new Date(Date.now() + RESET_EXPIRY_HOURS * 3600 * 1000);
    await pool.query('UPDATE users SET reset_token=$1, reset_token_expires=$2 WHERE id=$3',
      [token, expires, user.id]);
    await sendSetPasswordEmail(user.email, token, { isNewAccount: !user.email_verified });
  }
  res.json({ ok: true, message: `Email resent to ${user.email}.` });
});

module.exports = router;
