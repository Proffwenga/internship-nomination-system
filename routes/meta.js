const express = require('express');
const router = express.Router();
const DEPARTMENTS = require('../departments');
const VERNACULAR = require('../vernacular');

router.get('/meta', (req, res) => {
  res.json({
    deadline: '2026-07-25',
    interviewDate: '2026-08-07',
    cohort: 'September–December 2026',
    maxStudents: 10,
    minVernacular: 4,
    maxCvSizeMb: Number(process.env.MAX_CV_SIZE_MB || 5),
    departments: DEPARTMENTS,
    vernacularRules: VERNACULAR,
  });
});

module.exports = router;
