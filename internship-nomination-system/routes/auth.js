const express = require('express');
const router = express.Router();
const { issueToken } = require('../auth');

router.post('/auth', (req, res) => {
  const { role, code } = req.body || {};
  if (role === 'officer' && code === process.env.OFFICER_ACCESS_CODE) {
    return res.json({ token: issueToken('officer'), role: 'officer' });
  }
  if (role === 'hr' && code === process.env.HR_ACCESS_CODE) {
    return res.json({ token: issueToken('hr'), role: 'hr' });
  }
  return res.status(401).json({ error: 'Incorrect access code.' });
});

module.exports = router;
