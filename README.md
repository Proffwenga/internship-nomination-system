# Internship Nomination System

Web-based nomination system for the Royal Media Services September–December 2026
internship cohort. Placement officers submit nominations (with CV attachments)
through a web form; HR reviews everything on a live dashboard. Data is stored in
a PostgreSQL database on your cloud server, not in any one person's browser.

## What this is

- `index.js` — the server (Node.js + Express). Serves the web pages and the API.
- `public/index.html` — the page placement officers use to submit nominations.
- `public/dashboard.html` — the page HR uses to review nominations, download CVs,
  update interview status, and export CSVs.
- `schema.sql` — the two database tables this needs (`institutions`, `students`).
- `routes/` — the API endpoints.

CVs are stored as file attachments directly inside the `students` table
(PostgreSQL `bytea` column), so there is no separate file storage service to
configure.

## Requirements

- Node.js 18 or later on whatever server will run the app.
- A PostgreSQL database reachable from that server (version 12+).

## Setup

1. **Install dependencies**
   ```
   npm install
   ```

2. **Create your `.env` file**
   ```
   cp .env.example .env
   ```
   Then fill in:
   - `DATABASE_URL` — your cloud PostgreSQL connection string.
   - `SESSION_SECRET` — any long random string (used to sign login sessions).
   - `OFFICER_ACCESS_CODE` — the code you give to placement officers.
   - `HR_ACCESS_CODE` — the code only HR should know.

3. **Create the database tables**
   ```
   npm run migrate
   ```
   This runs `schema.sql` against `DATABASE_URL`. Safe to re-run — it won't
   duplicate tables.

4. **Start the app**
   ```
   npm start
   ```
   By default it listens on port 3000 (change with `PORT` in `.env`).

5. **Share the two links**
   - Placement officers go to: `https://your-domain/` (or `/index.html`)
   - HR goes to: `https://your-domain/dashboard.html`

   Both pages ask for an access code before showing anything — give officers
   `OFFICER_ACCESS_CODE` and keep `HR_ACCESS_CODE` internal to HR.

## How it works day to day

1. You send invited institutions the officer link and the officer access code,
   plus the deadline (currently set to 19 July 2026).
2. Each placement officer logs in, fills in their institution and officer
   details, adds up to 10 students, picks a department and area of interest
   per student (the list filters automatically), marks who's a vernacular
   placement, and can attach a CV per student. A live counter shows whether
   they're within the 10-student cap and the 4-vernacular minimum before they
   submit.
3. Submitting again under the same institution name replaces their previous
   submission rather than duplicating it, so officers can correct mistakes by
   resubmitting.
4. On the HR dashboard, you see institutions and students roll in live:
   overall counts, gender split, department distribution, and which
   institutions breach the 10-student cap or fall short of the 4-vernacular
   minimum. You can download any attached CV, mark interview status per
   institution and per student, remove a bad submission, and export both the
   consolidated student list and the institution summary as CSV.

## Notes on the access-code approach

This uses two shared secrets (one for officers, one for HR) rather than
individual accounts, matching the scale of this problem — a fixed intake
window with a known, small number of invited institutions. Access codes are
compared server-side and never stored in the database. Rotate a code any time
by changing it in `.env` and restarting the app; anyone still using the old
code will be asked to log in again.

CV downloads and CSV exports use the access token as a link (`?token=...`) so
they work as plain clickable links from the dashboard, rather than requiring
JavaScript-driven downloads. Tokens expire after 12 hours.

## Adjusting dates and limits

`routes/meta.js` and `routes/dashboard.js` currently hard-code the 19 July
2026 deadline, the 7 August 2026 interview date, the 10-student cap, and the
4-vernacular minimum for the September–December 2026 cohort. Update the
values in both files (and re-deploy) for the next intake round.

## Adjusting departments and areas of interest

Edit `departments.js` — it's the single source both the officer form and the
dashboard department-distribution chart read from.

## Security notes for whoever deploys this

- `PGSSL=true` in `.env.example` connects with `rejectUnauthorized: false`,
  which works with most managed Postgres providers out of the box but does
  not verify the server's certificate chain. If your provider gives you a CA
  certificate, tightening this in `db.js` is straightforward — ask your
  developer or come back to this conversation.
- CVs live in the database. At the scale of this intake (a few hundred
  institutions × up to 10 students), that's simple and sufficient. If this
  system is later reused for a much larger, ongoing programme, moving CV
  storage to an object store (e.g. an S3-compatible bucket) would be the
  next step — the code is structured so that's a contained change (only
  `routes/nominations.js` and `routes/students.js` touch CV storage).
