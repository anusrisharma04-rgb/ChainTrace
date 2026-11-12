
-- ============================================
-- CHAINTRACE
-- Digital Evidence Provenance & Integrity
-- Management System
-- PostgreSQL Database Schema
-- ============================================

-- 1. ROLE TABLE
CREATE TABLE roles (
    role_id SERIAL PRIMARY KEY,
    role_name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT
);

-- 2. USER TABLE
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    role_id INTEGER NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    department VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_user_role
        FOREIGN KEY (role_id)
        REFERENCES roles(role_id),

    CONSTRAINT chk_user_status
        CHECK (status IN ('active', 'inactive', 'suspended'))
);

-- 3. CASE TABLE
CREATE TABLE cases (
    case_id SERIAL PRIMARY KEY,
    case_number VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'open',
    created_by INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_case_creator
        FOREIGN KEY (created_by)
        REFERENCES users(user_id),

    CONSTRAINT chk_case_status
        CHECK (status IN ('open', 'under_investigation', 'closed'))
);

-- ============================================
-- 4. CASE MEMBERS TABLE
-- Implements the many-to-many relationship
-- between users and cases.
-- ============================================

CREATE TABLE case_members (
    case_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (case_id, user_id),

    FOREIGN KEY (case_id) REFERENCES cases(case_id)
        ON DELETE CASCADE,

    FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE CASCADE
);


-- ============================================
-- 5. LOCATION TABLE
-- ============================================

CREATE TABLE locations (
    location_id SERIAL PRIMARY KEY,
    location_name VARCHAR(150) NOT NULL,
    location_type VARCHAR(50) NOT NULL,
    description TEXT
);


-- ============================================
-- 6. EVIDENCE TABLE
-- ============================================

CREATE TABLE evidence (
    evidence_id SERIAL PRIMARY KEY,
    case_id INTEGER NOT NULL,
    evidence_type VARCHAR(100) NOT NULL,
    description TEXT,
    serial_number VARCHAR(100),
    collection_time TIMESTAMP NOT NULL,
    collected_by INTEGER NOT NULL,
    current_location_id INTEGER,
    current_custodian_id INTEGER,
    status VARCHAR(30) NOT NULL DEFAULT 'collected',
    original_hash VARCHAR(128) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (case_id) REFERENCES cases(case_id),
    FOREIGN KEY (collected_by) REFERENCES users(user_id),
    FOREIGN KEY (current_location_id) REFERENCES locations(location_id),
    FOREIGN KEY (current_custodian_id) REFERENCES users(user_id),

    CONSTRAINT chk_evidence_status
        CHECK (status IN ('collected', 'in_transfer', 'stored', 'under_examination', 'released'))
);

-- ============================================
-- 7. EVIDENCE TRANSFER TABLE
-- Tracks chain of custody and evidence movement.
-- ============================================

CREATE TABLE evidence_transfer (
    transfer_id SERIAL PRIMARY KEY,
    evidence_id INTEGER NOT NULL,
    from_user_id INTEGER NOT NULL,
    to_user_id INTEGER NOT NULL,
    from_location_id INTEGER NOT NULL,
    to_location_id INTEGER NOT NULL,
    transfer_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reason TEXT NOT NULL,
    authorization_status VARCHAR(30) NOT NULL DEFAULT 'pending',

    FOREIGN KEY (evidence_id) REFERENCES evidence(evidence_id),
    FOREIGN KEY (from_user_id) REFERENCES users(user_id),
    FOREIGN KEY (to_user_id) REFERENCES users(user_id),
    FOREIGN KEY (from_location_id) REFERENCES locations(location_id),
    FOREIGN KEY (to_location_id) REFERENCES locations(location_id),

    CONSTRAINT chk_transfer_authorization
        CHECK (authorization_status IN ('pending', 'approved', 'rejected'))
);


-- ============================================
-- 8. EXAMINATION TABLE
-- Records forensic examination activities.
-- ============================================

CREATE TABLE examination (
    examination_id SERIAL PRIMARY KEY,
    evidence_id INTEGER NOT NULL,
    analyst_id INTEGER NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    tool_used VARCHAR(150),
    purpose TEXT NOT NULL,
    findings TEXT,
    result TEXT,

    FOREIGN KEY (evidence_id) REFERENCES evidence(evidence_id),
    FOREIGN KEY (analyst_id) REFERENCES users(user_id),

    CONSTRAINT chk_examination_time
        CHECK (end_time IS NULL OR end_time >= start_time)
);


-- ============================================
-- 9. EVIDENCE ACCESS TABLE
-- Tracks who accessed evidence and when.
-- ============================================

CREATE TABLE evidence_access (
    access_id SERIAL PRIMARY KEY,
    evidence_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    action VARCHAR(100) NOT NULL,
    access_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    access_status VARCHAR(30) NOT NULL,
    ip_address VARCHAR(45),

    FOREIGN KEY (evidence_id) REFERENCES evidence(evidence_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id),

    CONSTRAINT chk_access_status
        CHECK (access_status IN ('granted', 'denied'))
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- ============================================
-- 10. AUDIT LOG TABLE
-- ============================================

CREATE TABLE audit_log (
    audit_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    evidence_id INTEGER,
    action VARCHAR(100) NOT NULL,
    event_timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    old_value TEXT,
    new_value TEXT,
    status VARCHAR(30) NOT NULL,

    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (evidence_id) REFERENCES evidence(evidence_id)
);


CREATE INDEX idx_evidence_case
    ON evidence(case_id);

CREATE INDEX idx_evidence_collector
    ON evidence(collected_by);

CREATE INDEX idx_transfer_evidence
    ON evidence_transfer(evidence_id);

CREATE INDEX idx_examination_evidence
    ON examination(evidence_id);

CREATE INDEX idx_access_evidence
    ON evidence_access(evidence_id);

CREATE INDEX idx_audit_user
    ON audit_log(user_id);

CREATE INDEX idx_audit_timestamp
    ON audit_log(event_timestamp);
