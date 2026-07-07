const express = require('express');
const router = express.Router();
const pool = require('../db');
const { requireRole } = require('../auth');
const DEPARTMENTS = require('../departments');

router.get('/dashboard', requireRole('hr'), async (req, res) => {
  const institutionsCount = await pool.query('SELECT COUNT(*)::int AS n FROM institutions');
  const studentsCount = await pool.query('SELECT COUNT(*)::int AS n FROM students');
  const vernacularCount = await pool.query('SELECT COUNT(*)::int AS n FROM students WHERE vernacular');
  const genderRows = await pool.query(`
    SELECT lower(gender) AS g, COUNT(*)::int AS n FROM students GROUP BY lower(gender)
  `);
  const deptRows = await pool.query(`
    SELECT department, COUNT(*)::int AS n FROM students GROUP BY department
  `);
  const perInstitution = await pool.query(`
    SELECT i.id,
           COUNT(s.id)::int AS students_count,
           SUM(CASE WHEN s.vernacular THEN 1 ELSE 0 END)::int AS vernacular_count
    FROM institutions i LEFT JOIN students s ON s.institution_id = i.id
    GROUP BY i.id
  `);

  const genderSplit = { male: 0, female: 0 };
  genderRows.rows.forEach(r => {
    if (r.g === 'male') genderSplit.male = r.n;
    if (r.g === 'female') genderSplit.female = r.n;
  });

  const deptMap = {};
  deptRows.rows.forEach(r => { deptMap[r.department] = r.n; });
  const departmentCounts = DEPARTMENTS.map(d => ({ name: d.name, count: deptMap[d.name] || 0 }));
  const recognisedTotal = departmentCounts.reduce((a, d) => a + d.count, 0);
  const otherCount = studentsCount.rows[0].n - recognisedTotal;

  const overLimit = perInstitution.rows.filter(r => r.students_count > 10).length;
  const underVernacular = perInstitution.rows.filter(r => (r.vernacular_count || 0) < 4).length;

  res.json({
    deadline: '2026-07-19',
    interviewDate: '2026-08-07',
    institutionsCount: institutionsCount.rows[0].n,
    studentsCount: studentsCount.rows[0].n,
    vernacularCount: vernacularCount.rows[0].n,
    genderSplit,
    departmentCounts,
    otherDepartmentCount: otherCount > 0 ? otherCount : 0,
    overLimitInstitutions: overLimit,
    underVernacularInstitutions: underVernacular,
  });
});

module.exports = router;
