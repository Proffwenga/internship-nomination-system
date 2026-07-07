-- Internship Nomination System — PostgreSQL schema
-- Run this once against your cloud database before starting the server.

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
