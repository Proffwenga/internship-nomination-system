const express = require('express');
const multer = require('multer');
const router = express.Router();
const pool = require('../db');
const { requireRole } = require('../auth');

const MAX_CV_MB = Number(process.env.MAX_CV_SIZE_MB || 5);
const ALLOWED_CV_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_CV_MB * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_CV_TYPES.has(file.mimetype)) {
      return cb(new Error(`"${file.originalname}" is not a PDF or Word document.`));
    }
    cb(null, true);
  },
});

// Submit or update a nomination. Officer role only.
router.post('/nominations', requireRole('officer'), upload.any(), async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      officerName, institutionName, officerEmail, officerPhone,
      declarationFinalYear, declarationAvailability, declarationUnpaid,
      studentsJson,
    } = req.body;

    if (!institutionName || !institutionName.trim()) {
      return res.status(400).json({ error: 'Name of institution is required.' });
    }
    if (!officerName || !officerName.trim()) {
      return res.status(400).json({ error: 'Placement officer name is required.' });
    }
    let students;
    try {
      students = JSON.parse(studentsJson || '[]');
    } catch (e) {
      return res.status(400).json({ error: 'Student list was not sent correctly.' });
    }
    students = students.filter(s => s && s.name && s.name.trim());
    if (students.length === 0) {
      return res.status(400).json({ error: 'Add at least one student.' });
    }
    if (students.length > 10) {
      return res.status(400).json({ error: 'A maximum of 10 students may be nominated per institution.' });
    }

    const isYes = v => String(v).toLowerCase() === 'yes' || String(v).toLowerCase() === 'true';

    await client.query('BEGIN');

    const existing = await client.query(
      'SELECT id FROM institutions WHERE lower(name) = lower($1)', [institutionName.trim()]
    );

    let institutionId;
    if (existing.rows.length) {
      institutionId = existing.rows[0].id;
      await client.query(
        `UPDATE institutions SET officer_name=$1, officer_email=$2, officer_phone=$3,
         declaration_final_year=$4, declaration_availability=$5, declaration_unpaid=$6,
         updated_at=now() WHERE id=$7`,
        [officerName.trim(), officerEmail || '', officerPhone || '',
         isYes(declarationFinalYear), isYes(declarationAvailability), isYes(declarationUnpaid),
         institutionId]
      );
      await client.query('DELETE FROM students WHERE institution_id=$1', [institutionId]);
    } else {
      const ins = await client.query(
        `INSERT INTO institutions
         (name, officer_name, officer_email, officer_phone,
          declaration_final_year, declaration_availability, declaration_unpaid)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
        [institutionName.trim(), officerName.trim(), officerEmail || '', officerPhone || '',
         isYes(declarationFinalYear), isYes(declarationAvailability), isYes(declarationUnpaid)]
      );
      institutionId = ins.rows[0].id;
    }

    const filesByField = {};
    (req.files || []).forEach(f => { filesByField[f.fieldname] = f; });

    for (let i = 0; i < students.length; i++) {
      const s = students[i];
      const file = filesByField[`cv_${i}`];
      await client.query(
        `INSERT INTO students
         (institution_id, full_name, gender, national_id, phone, email, year_of_study,
          department, area_of_interest, vernacular, cv_filename, cv_mimetype, cv_data, cv_size_bytes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
        [institutionId, s.name.trim(), s.gender || '', s.nationalId || '', s.phone || '',
         s.email || '', s.year || '', s.department || '', s.area || '',
         isYes(s.vernacular),
         file ? file.originalname : null,
         file ? file.mimetype : null,
         file ? file.buffer : null,
         file ? file.size : null]
      );
    }

    await client.query('COMMIT');

    const vernacularCount = students.filter(s => isYes(s.vernacular)).length;
    res.json({
      ok: true,
      institutionId,
      studentsCount: students.length,
      vernacularCount,
      maxCompliant: students.length <= 10,
      vernacularCompliant: vernacularCount >= 4,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(400).json({ error: err.message || 'Could not save this nomination.' });
  } finally {
    client.release();
  }
});

// List institutions with summary counts. HR only.
router.get('/institutions', requireRole('hr'), async (req, res) => {
  const { rows } = await pool.query(`
    SELECT i.id, i.name, i.officer_name, i.officer_email, i.officer_phone,
           i.interview_status, i.notes, i.submitted_at,
           COUNT(s.id)::int AS students_count,
           SUM(CASE WHEN s.vernacular THEN 1 ELSE 0 END)::int AS vernacular_count,
           SUM(CASE WHEN s.cv_data IS NOT NULL THEN 1 ELSE 0 END)::int AS cv_count
    FROM institutions i
    LEFT JOIN students s ON s.institution_id = i.id
    GROUP BY i.id, i.name, i.officer_name, i.officer_email, i.officer_phone,
             i.interview_status, i.notes, i.submitted_at
    ORDER BY i.name ASC
  `);
  rows.forEach(r => {
    r.vernacular_count = r.vernacular_count || 0;
    r.cv_count = r.cv_count || 0;
  });
  res.json(rows);
});

// Update interview status / notes for an institution. HR only.
router.patch('/institutions/:id', requireRole('hr'), async (req, res) => {
  const { interviewStatus, notes } = req.body || {};
  await pool.query(
    `UPDATE institutions SET
       interview_status = COALESCE($1, interview_status),
       notes = COALESCE($2, notes),
       updated_at = now()
     WHERE id = $3`,
    [interviewStatus || null, notes ?? null, req.params.id]
  );
  res.json({ ok: true });
});

// Remove an institution and its students entirely. HR only.
router.delete('/institutions/:id', requireRole('hr'), async (req, res) => {
  await pool.query('DELETE FROM institutions WHERE id=$1', [req.params.id]);
  res.json({ ok: true });
});

module.exports = router;
