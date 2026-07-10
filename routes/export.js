const express = require('express');
const router = express.Router();
const pool = require('../db');
const { requireRole } = require('../auth');

function toCsv(rows) {
  return rows.map(r => r.map(v => {
    v = (v === undefined || v === null) ? '' : String(v);
    return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
  }).join(',')).join('\r\n');
}

router.get('/export/students.csv', requireRole('hr', 'admin'), async (req, res) => {
  const { rows } = await pool.query(`
    SELECT i.name AS institution, s.full_name, s.gender, s.national_id, s.phone, s.email,
           s.year_of_study, s.course, s.department, s.area_of_interest, s.vernacular,
           s.vernacular_language, (s.cv_data IS NOT NULL) AS has_cv, s.interview_outcome
    FROM students s JOIN institutions i ON i.id = s.institution_id
    ORDER BY i.name ASC, s.full_name ASC
  `);
  const header = ['Institution','Full Name','Gender','National ID','Phone','Email','Year of Study',
    'Course','Department','Area of Interest','Vernacular','Vernacular Language','Has CV','Interview Outcome'];
  const body = rows.map(r => [r.institution, r.full_name, r.gender, r.national_id, r.phone, r.email,
    r.year_of_study, r.course, r.department, r.area_of_interest, r.vernacular ? 'Yes' : 'No',
    r.vernacular_language, r.has_cv ? 'Yes' : 'No', r.interview_outcome]);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="master_nominations.csv"');
  res.send(toCsv([header, ...body]));
});

router.get('/export/institutions.csv', requireRole('hr', 'admin'), async (req, res) => {
  const { rows } = await pool.query(`
    SELECT i.name, i.officer_name, i.officer_email, i.officer_phone,
           i.hod_name, i.hod_title, i.hod_phone, i.hod_email,
           i.interview_status, i.submitted_at,
           COUNT(s.id)::int AS students_count,
           SUM(CASE WHEN s.vernacular THEN 1 ELSE 0 END)::int AS vernacular_count
    FROM institutions i LEFT JOIN students s ON s.institution_id = i.id
    GROUP BY i.id, i.name, i.officer_name, i.officer_email, i.officer_phone,
             i.hod_name, i.hod_title, i.hod_phone, i.hod_email,
             i.interview_status, i.submitted_at
    ORDER BY i.name ASC
  `);
  const header = ['Institution','Officer Name','Officer Email','Officer Phone',
    'Dean/HOD Name','Dean/HOD Title','Dean/HOD Phone','Dean/HOD Email','Interview Status',
    'Submitted At','Students Nominated','Vernacular Nominated','Max 10 Compliant','Min 4 Vernacular Compliant'];
  const body = rows.map(r => {
    const vc = r.vernacular_count || 0;
    return [r.name, r.officer_name, r.officer_email, r.officer_phone,
      r.hod_name, r.hod_title, r.hod_phone, r.hod_email,
      r.interview_status, r.submitted_at, r.students_count, vc,
      r.students_count <= 10 ? 'Yes' : 'No', vc >= 4 ? 'Yes' : 'No'];
  });
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="institution_summary.csv"');
  res.send(toCsv([header, ...body]));
});

module.exports = router;
