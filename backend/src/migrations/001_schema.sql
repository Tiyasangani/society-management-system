-- ============================================================
-- Society Management System - Database Schema
-- PostgreSQL - Normalized to 3NF
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---------- ROLES (lookup table instead of hardcoded strings) ----------
CREATE TABLE roles (
    role_id     SERIAL PRIMARY KEY,
    role_name   VARCHAR(20) UNIQUE NOT NULL CHECK (role_name IN ('admin', 'committee', 'resident'))
);

INSERT INTO roles (role_name) VALUES ('admin'), ('committee'), ('resident');

-- ---------- BUILDINGS / BLOCKS ----------
CREATE TABLE buildings (
    building_id   SERIAL PRIMARY KEY,
    name          VARCHAR(100) NOT NULL,
    total_floors  INTEGER
);

-- ---------- FLATS / UNITS ----------
CREATE TABLE flats (
    flat_id       SERIAL PRIMARY KEY,
    building_id   INTEGER NOT NULL REFERENCES buildings(building_id) ON DELETE CASCADE,
    flat_number   VARCHAR(20) NOT NULL,
    floor_number  INTEGER,
    area_sqft     NUMERIC(8,2),
    UNIQUE (building_id, flat_number)
);

-- ---------- USERS (single table for admin/committee/resident, differentiated by role_id) ----------
CREATE TABLE users (
    user_id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name      VARCHAR(150) NOT NULL,
    email          VARCHAR(150) UNIQUE NOT NULL,
    phone          VARCHAR(20),
    password_hash  VARCHAR(255) NOT NULL,
    role_id        INTEGER NOT NULL REFERENCES roles(role_id),
    flat_id        INTEGER REFERENCES flats(flat_id) ON DELETE SET NULL, -- null for admin
    is_active      BOOLEAN DEFAULT TRUE,
    created_at     TIMESTAMPTZ DEFAULT NOW(),
    updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_role ON users(role_id);
CREATE INDEX idx_users_flat ON users(flat_id);
CREATE INDEX idx_users_email ON users(email);

-- ---------- COMMITTEE MEMBER DETAILS (extends users for committee-specific fields) ----------
CREATE TABLE committee_members (
    committee_member_id SERIAL PRIMARY KEY,
    user_id       UUID UNIQUE NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    designation   VARCHAR(100), -- e.g. Secretary, Treasurer
    can_publish_notices BOOLEAN DEFAULT FALSE,
    assigned_date DATE DEFAULT CURRENT_DATE
);

-- ---------- ANNOUNCEMENTS / NOTICES ----------
CREATE TABLE announcements (
    announcement_id SERIAL PRIMARY KEY,
    title         VARCHAR(200) NOT NULL,
    content       TEXT NOT NULL,
    posted_by     UUID NOT NULL REFERENCES users(user_id),
    is_urgent     BOOLEAN DEFAULT FALSE,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    expires_at    TIMESTAMPTZ
);

CREATE INDEX idx_announcements_created ON announcements(created_at DESC);

-- ---------- COMPLAINT CATEGORIES (lookup) ----------
CREATE TABLE complaint_categories (
    category_id   SERIAL PRIMARY KEY,
    name          VARCHAR(100) UNIQUE NOT NULL
);

INSERT INTO complaint_categories (name) VALUES
  ('Plumbing'), ('Electrical'), ('Security'), ('Cleanliness'),
  ('Parking'), ('Noise'), ('Lift/Elevator'), ('Other');

-- ---------- COMPLAINTS ----------
CREATE TABLE complaints (
    complaint_id   SERIAL PRIMARY KEY,
    raised_by      UUID NOT NULL REFERENCES users(user_id),
    category_id    INTEGER NOT NULL REFERENCES complaint_categories(category_id),
    title          VARCHAR(200) NOT NULL,
    description    TEXT NOT NULL,
    status         VARCHAR(20) NOT NULL DEFAULT 'open'
                     CHECK (status IN ('open', 'in_progress', 'resolved', 'rejected')),
    priority       VARCHAR(10) NOT NULL DEFAULT 'medium'
                     CHECK (priority IN ('low', 'medium', 'high')),
    assigned_to    UUID REFERENCES users(user_id), -- committee member / admin
    created_at     TIMESTAMPTZ DEFAULT NOW(),
    resolved_at    TIMESTAMPTZ
);

CREATE INDEX idx_complaints_status ON complaints(status);
CREATE INDEX idx_complaints_raised_by ON complaints(raised_by);

-- ---------- COMPLAINT IMAGES (1-to-many; a complaint can have multiple images) ----------
CREATE TABLE complaint_images (
    image_id       SERIAL PRIMARY KEY,
    complaint_id   INTEGER NOT NULL REFERENCES complaints(complaint_id) ON DELETE CASCADE,
    file_path      VARCHAR(500) NOT NULL,
    uploaded_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ---------- COMPLAINT STATUS HISTORY (audit trail of status changes) ----------
CREATE TABLE complaint_status_history (
    history_id     SERIAL PRIMARY KEY,
    complaint_id   INTEGER NOT NULL REFERENCES complaints(complaint_id) ON DELETE CASCADE,
    old_status     VARCHAR(20),
    new_status     VARCHAR(20) NOT NULL,
    changed_by     UUID NOT NULL REFERENCES users(user_id),
    remarks        TEXT,
    changed_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ---------- SERVICE REQUESTS ----------
CREATE TABLE service_requests (
    request_id     SERIAL PRIMARY KEY,
    requested_by   UUID NOT NULL REFERENCES users(user_id),
    service_type   VARCHAR(100) NOT NULL, -- e.g. Plumber visit, Pest control
    description    TEXT,
    preferred_date DATE,
    status         VARCHAR(20) NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
    processed_by   UUID REFERENCES users(user_id),
    created_at     TIMESTAMPTZ DEFAULT NOW(),
    updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_service_requests_status ON service_requests(status);

-- ---------- MAINTENANCE BILLS ----------
CREATE TABLE maintenance_bills (
    bill_id        SERIAL PRIMARY KEY,
    flat_id        INTEGER NOT NULL REFERENCES flats(flat_id),
    billing_month  DATE NOT NULL, -- store first-of-month for the billing period
    amount         NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
    due_date       DATE NOT NULL,
    status         VARCHAR(20) NOT NULL DEFAULT 'unpaid'
                     CHECK (status IN ('unpaid', 'paid', 'overdue', 'partial')),
    generated_by   UUID NOT NULL REFERENCES users(user_id),
    created_at     TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (flat_id, billing_month)
);

CREATE INDEX idx_bills_flat ON maintenance_bills(flat_id);
CREATE INDEX idx_bills_status ON maintenance_bills(status);

-- ---------- PAYMENTS ----------
CREATE TABLE payments (
    payment_id     SERIAL PRIMARY KEY,
    bill_id        INTEGER NOT NULL REFERENCES maintenance_bills(bill_id),
    paid_by        UUID NOT NULL REFERENCES users(user_id),
    amount_paid    NUMERIC(10,2) NOT NULL CHECK (amount_paid > 0),
    payment_method VARCHAR(30) NOT NULL DEFAULT 'online'
                     CHECK (payment_method IN ('online', 'cash', 'cheque', 'upi')),
    transaction_ref VARCHAR(100),
    razorpay_order_id VARCHAR(100), -- Razorpay order_id, set when checkout is initiated
    paid_at        TIMESTAMPTZ DEFAULT NOW(),
    recorded_by    UUID REFERENCES users(user_id) -- admin, if manually recorded
);

CREATE INDEX idx_payments_bill ON payments(bill_id);

-- ---------- AUDIT LOGS ----------
CREATE TABLE audit_logs (
    log_id         SERIAL PRIMARY KEY,
    user_id        UUID REFERENCES users(user_id),
    action         VARCHAR(100) NOT NULL,   -- e.g. 'LOGIN', 'CREATE_BILL', 'UPDATE_COMPLAINT'
    entity_type    VARCHAR(50),             -- e.g. 'complaint', 'bill'
    entity_id      VARCHAR(50),
    details        JSONB,
    ip_address     VARCHAR(45),
    created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);

-- ---------- REFRESH TOKENS (optional, for JWT refresh flow) ----------
CREATE TABLE refresh_tokens (
    token_id       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id        UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    token_hash     VARCHAR(255) NOT NULL,
    expires_at     TIMESTAMPTZ NOT NULL,
    created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Trigger: auto-update `updated_at` on users / service_requests
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_service_requests_updated_at
BEFORE UPDATE ON service_requests
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
