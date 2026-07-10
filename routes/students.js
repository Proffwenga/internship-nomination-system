const express = require('express');
const router = express.Router();
const pool = require('../db');
const { requireRole } = require('../auth');

// Full master list of nominated students. HR/admin only.
router.get('/students', requireRole('hr', 'admin'), async (req, res) => {
  const { rows } = await pool.query(`
    SELECT s.id, s.full_name, s.gender, s.national_id, s.phone, s.email, s.year_of_study,
           s.course, s.department, s.area_of_interest, s.vernacular, s.vernacular_language, s.interview_outcome,
           (s.cv_data IS NOT NULL) AS has_cv, s.cv_filename,
           i.id AS institution_id, i.name AS institution_name
    FROM students s
    JOIN institutions i ON i.id = s.institution_id
    ORDER BY i.name ASC, s.full_name ASC
  `);
  res.json(rows);
});

// Update a student's interview outcome. HR/admin only.
router.patch('/students/:id', requireRole('hr', 'admin'), async (req, res) => {
  const { interviewOutcome } = req.body || {};
  await pool.query('UPDATE students SET interview_outcome=$1 WHERE id=$2',
    [interviewOutcome || 'Pending', req.params.id]);
  res.json({ ok: true });
});

// Download a student's CV. HR/admin only. Accepts either an Authorization
// header or a "?token=" query string so it can be used as a plain link.
router.get('/students/:id/cv', requireRole('hr', 'admin'), async (req, res) => {
  const { rows } = await pool.query(
    'SELECT cv_filename, cv_mimetype, cv_data FROM students WHERE id=$1', [req.params.id]
  );
  if (!rows.length || !rows[0].cv_data) {
    return res.status(404).json({ error: 'No CV on file for this student.' });
  }
  const { cv_filename, cv_mimetype, cv_data } = rows[0];
  res.setHeader('Content-Type', cv_mimetype || 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="${(cv_filename || 'cv').replace(/"/g,'')}"`);
  res.send(cv_data);
});

module.exports = router;
