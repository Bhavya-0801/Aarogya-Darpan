-- =============================================================
-- Aarogya Darpan — Supabase PostgreSQL Schema
-- Paste this entire file into the Supabase SQL Editor and Run.
-- =============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================
-- 1. hospitals
-- =============================================================
CREATE TABLE IF NOT EXISTS hospitals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  street          TEXT DEFAULT '',
  city            TEXT NOT NULL DEFAULT '',
  state           TEXT NOT NULL DEFAULT '',
  pincode         TEXT DEFAULT '',
  phone           TEXT NOT NULL DEFAULT '',
  email           TEXT NOT NULL DEFAULT '',
  license_number  TEXT UNIQUE,
  admin_id        UUID,
  departments     TEXT[] DEFAULT ARRAY['General Medicine','Emergency'],
  total_beds      INT DEFAULT 0,
  website         TEXT,
  logo            TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
-- 2. users
-- =============================================================
CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  email           TEXT NOT NULL UNIQUE,
  password_hash   TEXT NOT NULL,
  role            TEXT NOT NULL CHECK (role IN ('patient','hospital_admin','doctor','receptionist','lab_technician','pharmacy')),
  hospital_id     UUID REFERENCES hospitals(id) ON DELETE SET NULL,
  is_active       BOOLEAN DEFAULT TRUE,
  profile_image   TEXT,
  phone           TEXT DEFAULT '',
  specialization  TEXT DEFAULT '',
  department      TEXT DEFAULT '',
  opd_fee         NUMERIC(10,2) DEFAULT 300,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE hospitals ADD CONSTRAINT fk_hospital_admin
  FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE SET NULL;

-- =============================================================
-- 3. patients
-- =============================================================
CREATE TABLE IF NOT EXISTS patients (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  hospital_id          UUID REFERENCES hospitals(id) ON DELETE SET NULL,
  uhid                 TEXT NOT NULL UNIQUE,
  dob                  DATE NOT NULL,
  gender               TEXT NOT NULL,
  blood_group          TEXT,
  address              TEXT,
  allergies            TEXT[] DEFAULT '{}',
  chronic_conditions   TEXT[] DEFAULT '{}',
  emergency_name       TEXT,
  emergency_relation   TEXT,
  emergency_phone      TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
-- 4. appointments
-- =============================================================
CREATE TABLE IF NOT EXISTS appointments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id       UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  hospital_id      UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  type             TEXT NOT NULL CHECK (type IN ('OPD','IPD','Emergency','Follow-up')),
  status           TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','completed','cancelled','no-show')),
  scheduled_at     TIMESTAMPTZ NOT NULL,
  duration         INT DEFAULT 30,
  notes            TEXT,
  room_number      TEXT,
  chief_complaint  TEXT,
  created_by       UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
-- 5. beds
-- =============================================================
CREATE TABLE IF NOT EXISTS beds (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id   UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  ward          TEXT NOT NULL,
  bed_number    TEXT NOT NULL,
  type          TEXT NOT NULL CHECK (type IN ('general','ICU','HDU','private','pediatric')),
  status        TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available','occupied','maintenance')),
  patient_id    UUID REFERENCES patients(id) ON DELETE SET NULL,
  admitted_at   TIMESTAMPTZ,
  floor         TEXT,
  daily_rate    NUMERIC(10,2) DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
-- 6. bills
-- =============================================================
CREATE TABLE IF NOT EXISTS bills (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  hospital_id     UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  appointment_id  UUID REFERENCES appointments(id) ON DELETE SET NULL,
  bill_number     TEXT NOT NULL UNIQUE,
  items           JSONB NOT NULL DEFAULT '[]',
  subtotal        NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount        NUMERIC(12,2) DEFAULT 0,
  tax             NUMERIC(12,2) DEFAULT 0,
  total_amount    NUMERIC(12,2) NOT NULL DEFAULT 0,
  paid_amount     NUMERIC(12,2) DEFAULT 0,
  status          TEXT DEFAULT 'pending' CHECK (status IN ('pending','partial','paid','cancelled')),
  payment_method  TEXT CHECK (payment_method IN ('cash','card','UPI','insurance','cheque')),
  payment_date    TIMESTAMPTZ,
  notes           TEXT,
  created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
-- 7. lab_reports
-- =============================================================
CREATE TABLE IF NOT EXISTS lab_reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  requested_by    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  processed_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  hospital_id     UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  appointment_id  UUID REFERENCES appointments(id) ON DELETE SET NULL,
  tests           JSONB NOT NULL DEFAULT '[]',
  status          TEXT DEFAULT 'pending' CHECK (status IN ('pending','processing','completed')),
  report_url      TEXT,
  urgency         TEXT DEFAULT 'routine' CHECK (urgency IN ('routine','urgent','stat')),
  notes           TEXT,
  collected_at    TIMESTAMPTZ,
  reported_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
-- 8. medical_records
-- =============================================================
CREATE TABLE IF NOT EXISTS medical_records (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  appointment_id  UUID REFERENCES appointments(id) ON DELETE SET NULL,
  hospital_id     UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  diagnosis       TEXT NOT NULL,
  icd_code        TEXT,
  symptoms        TEXT[] DEFAULT '{}',
  prescriptions   JSONB DEFAULT '[]',
  vitals          JSONB DEFAULT '{}',
  investigations  TEXT[] DEFAULT '{}',
  follow_up_date  TIMESTAMPTZ,
  notes           TEXT,
  attachments     TEXT[] DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
-- 9. medicines
-- =============================================================
CREATE TABLE IF NOT EXISTS medicines (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id      UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  generic_name     TEXT DEFAULT '',
  category         TEXT NOT NULL,
  manufacturer     TEXT DEFAULT '',
  batch_number     TEXT DEFAULT '',
  expiry_date      DATE NOT NULL,
  quantity         INT NOT NULL DEFAULT 0,
  min_stock_level  INT DEFAULT 10,
  unit_price       NUMERIC(10,2) DEFAULT 0,
  selling_price    NUMERIC(10,2) DEFAULT 0,
  unit             TEXT DEFAULT 'tablet',
  description      TEXT,
  added_by         UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
-- 10. prescriptions
-- =============================================================
CREATE TABLE IF NOT EXISTS prescriptions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  hospital_id     UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  appointment_id  UUID REFERENCES appointments(id) ON DELETE SET NULL,
  token_number    TEXT NOT NULL UNIQUE,
  diagnosis       TEXT NOT NULL,
  symptoms        TEXT[] DEFAULT '{}',
  medicines       JSONB NOT NULL DEFAULT '[]',
  vitals          JSONB DEFAULT '{}',
  notes           TEXT,
  follow_up_date  TIMESTAMPTZ,
  dispensed       BOOLEAN DEFAULT FALSE,
  dispensed_at    TIMESTAMPTZ,
  dispensed_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
-- 11. emergency_registrations
-- =============================================================
CREATE TABLE IF NOT EXISTS emergency_registrations (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  temp_id               TEXT NOT NULL UNIQUE,
  bed_id                UUID REFERENCES beds(id) ON DELETE SET NULL,
  bed_number            TEXT,
  ward                  TEXT,
  hospital_id           UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  patient_name          TEXT NOT NULL,
  patient_age           INT,
  patient_gender        TEXT,
  phone_number          TEXT,
  chief_complaint       TEXT NOT NULL,
  admitted_at           TIMESTAMPTZ DEFAULT NOW(),
  status                TEXT DEFAULT 'active' CHECK (status IN ('active','shifted','discharged')),
  shifted_to_patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
  shifted_at            TIMESTAMPTZ,
  created_by            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
-- 12. family_members
-- =============================================================
CREATE TABLE IF NOT EXISTS family_members (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  primary_patient_id   UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  name                 TEXT NOT NULL,
  relation             TEXT NOT NULL,
  dob                  DATE,
  gender               TEXT,
  blood_group          TEXT,
  phone                TEXT,
  allergies            TEXT[] DEFAULT '{}',
  chronic_conditions   TEXT[] DEFAULT '{}',
  uhid                 TEXT,
  linked_patient_id    UUID REFERENCES patients(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
-- 13. access_requests
-- =============================================================
CREATE TABLE IF NOT EXISTS access_requests (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  doctor_name      TEXT NOT NULL,
  hospital_name    TEXT DEFAULT '',
  patient_id       UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  patient_user_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status           TEXT DEFAULT 'pending' CHECK (status IN ('pending','accepted','denied')),
  requested_at     TIMESTAMPTZ DEFAULT NOW(),
  responded_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
-- 14. notifications
-- =============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type         TEXT NOT NULL CHECK (type IN ('access_request','appointment','prescription','lab_result','bill','general')),
  title        TEXT NOT NULL,
  message      TEXT NOT NULL,
  data         JSONB DEFAULT '{}',
  read         BOOLEAN DEFAULT FALSE,
  actionable   BOOLEAN DEFAULT FALSE,
  action_taken TEXT CHECK (action_taken IN ('accepted','denied')),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
-- INDEXES
-- =============================================================
CREATE INDEX IF NOT EXISTS idx_users_hospital_role ON users(hospital_id, role);
CREATE INDEX IF NOT EXISTS idx_patients_hospital ON patients(hospital_id);
CREATE INDEX IF NOT EXISTS idx_patients_uhid ON patients(uhid);
CREATE INDEX IF NOT EXISTS idx_appointments_hospital_date ON appointments(hospital_id, scheduled_at DESC);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON appointments(doctor_id, scheduled_at DESC);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id, scheduled_at DESC);
CREATE INDEX IF NOT EXISTS idx_beds_hospital_status ON beds(hospital_id, status);
CREATE INDEX IF NOT EXISTS idx_bills_hospital ON bills(hospital_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bills_patient ON bills(patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lab_reports_hospital ON lab_reports(hospital_id, status);
CREATE INDEX IF NOT EXISTS idx_lab_reports_patient ON lab_reports(patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_medicines_hospital ON medicines(hospital_id);
CREATE INDEX IF NOT EXISTS idx_medicines_expiry ON medicines(expiry_date);
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient ON prescriptions(patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prescriptions_token ON prescriptions(token_number);
CREATE INDEX IF NOT EXISTS idx_emergency_hospital_status ON emergency_registrations(hospital_id, status);
CREATE INDEX IF NOT EXISTS idx_family_primary ON family_members(primary_patient_id);
CREATE INDEX IF NOT EXISTS idx_access_requests_patient ON access_requests(patient_user_id, status);
CREATE INDEX IF NOT EXISTS idx_access_requests_doctor ON access_requests(doctor_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read, created_at DESC);

-- =============================================================
-- auto-update updated_at trigger
-- =============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'hospitals','users','patients','appointments','beds','bills',
    'lab_reports','medical_records','medicines','prescriptions',
    'emergency_registrations','family_members','access_requests','notifications'
  ] LOOP
    EXECUTE format(
      'CREATE OR REPLACE TRIGGER trg_%s_updated_at BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION update_updated_at()',
      tbl, tbl
    );
  END LOOP;
END $$;
