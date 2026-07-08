const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const SALT_ROUNDS = 10;

function hashPassword(plain) {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

function comparePassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function generateTempPassword() {
  // Human-typeable one-time password, e.g. "kQ7m-Zx2p-Vr9t"
  const part = () => crypto.randomBytes(3).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 4);
  return `${part()}-${part()}-${part()}`;
}

function isValidPassword(plain) {
  return typeof plain === 'string' && plain.length >= 8;
}

module.exports = { hashPassword, comparePassword, generateToken, generateTempPassword, isValidPassword };
