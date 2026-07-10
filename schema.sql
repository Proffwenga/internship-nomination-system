-- Internship Nomination System — PostgreSQL schema
-- Safe to re-run: every statement uses IF NOT EXISTS, so running this again
-- against an already-set-up database only adds what's missing (e.g. the
-- users table added when account-based login was introduced).

CREATE TABLE IF NOT EXISTS institutions (
  id                        SERIAL PRIMARY KEY,
  name                      TEXT NOT NULL UNIQUE,
  officer_name              TEXT NOT NULL,
  officer_email             TEXT,
  officer_phone             TEXT,
  declaration_final_year    BOOLEAN NOT NULL DEFAULT false,
  declaration_availability  BOOLEAN NOT NULL DEFAULT false,
  declaration_unpaid        BOOLEAN NOT NULL DEFAULT false,
  interview_status          TEXT NOT NULL DEFAULT 'Not Started',
  notes                     TEXT,
  submitted_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS students (
  id                 SERIAL PRIMARY KEY,
  institution_id     INTEGER NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  full_name          TEXT NOT NULL,
  gender             TEXT,
  national_id        TEXT,
  phone              TEXT,
  email              TEXT,
  year_of_study      TEXT,
  department         TEXT,
  area_of_interest   TEXT,
  vernacular         BOOLEAN NOT NULL DEFAULT false,
  cv_filename        TEXT,
  cv_mimetype        TEXT,
  cv_data            BYTEA,
  cv_size_bytes      INTEGER,
  interview_outcome  TEXT NOT NULL DEFAULT 'Pending',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_students_institution ON students(institution_id);
CREATE INDEX IF NOT EXISTS idx_institutions_name_lower ON institutions (lower(name));

-- Individual login accounts. 'facilitator' = placement officer at a partner
-- institution (self-registers); 'hr' and 'admin' are created by an existing
-- admin. 'admin' can additionally manage other accounts.
CREATE TABLE IF NOT EXISTS users (
  id                           SERIAL PRIMARY KEY,
  email                        TEXT NOT NULL UNIQUE,
  password_hash                TEXT NOT NULL,
  role                         TEXT NOT NULL CHECK (role IN ('admin','hr','facilitator')),
  full_name                    TEXT NOT NULL,
  institution_name             TEXT,
  phone                        TEXT,
  is_active                    BOOLEAN NOT NULL DEFAULT true,
  email_verified               BOOLEAN NOT NULL DEFAULT false,
  verification_token           TEXT,
  verification_token_expires   TIMESTAMPTZ,
  reset_token                  TEXT,
  reset_token_expires          TIMESTAMPTZ,
  created_at                   TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at                TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users (lower(email));

-- Dean / Head of Department contact for the institution, and the fourth
-- declaration (code of conduct). Added via ALTER so this is safe to re-run
-- against a database that already has the institutions table.
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS hod_name TEXT;
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS hod_title TEXT;
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS hod_phone TEXT;
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS hod_email TEXT;
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS declaration_code_of_conduct BOOLEAN NOT NULL DEFAULT false;

-- Course undertaken by the student, and the specific vernacular language
-- (when applicable), added the same way.
ALTER TABLE students ADD COLUMN IF NOT EXISTS course TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS vernacular_language TEXT;
