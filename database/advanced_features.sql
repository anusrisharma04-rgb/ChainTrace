-- ====================================================================
-- CHAINTRACE — ADVANCED DBMS FEATURES MIGRATION
-- Level 3 DBMS Concepts: Views, Stored Functions, Triggers, Indexes
-- ====================================================================

-- --------------------------------------------------------------------
-- 1. ADVANCED DATABASE VIEWS
-- --------------------------------------------------------------------

-- View 1: Denormalized Chain-of-Custody and Evidence Provenance View
-- Integrates evidence, cases, locations, collectors, and current custodians
CREATE OR REPLACE VIEW v_evidence_custody_chain AS
SELECT 
    e.evidence_id,
    e.case_id,
    c.case_number,
    c.title AS case_title,
    e.evidence_type,
    e.serial_number,
    e.description AS evidence_description,
    e.status AS evidence_status,
    e.original_hash,
    e.file_path,
    e.collection_time,
    collector.user_id AS collector_id,
    collector.name AS collector_name,
    collector.email AS collector_email,
    custodian.user_id AS custodian_id,
    custodian.name AS custodian_name,
    custodian.email AS custodian_email,
    loc.location_id,
    loc.location_name,
    loc.location_type,
    e.created_at AS registered_at
FROM evidence e
JOIN cases c ON e.case_id = c.case_id
JOIN users collector ON e.collected_by = collector.user_id
LEFT JOIN users custodian ON e.current_custodian_id = custodian.user_id
LEFT JOIN locations loc ON e.current_location_id = loc.location_id;


-- View 2: Aggregate Forensic Summary per Case
-- Computes counts of evidence, active transfers, examinations, and team members
CREATE OR REPLACE VIEW v_case_forensic_summary AS
SELECT 
    c.case_id,
    c.case_number,
    c.title AS case_title,
    c.status AS case_status,
    c.created_at,
    u.name AS lead_investigator,
    COUNT(DISTINCT e.evidence_id) AS total_evidence_count,
    COUNT(DISTINCT CASE WHEN e.status = 'under_examination' THEN e.evidence_id END) AS evidence_under_examination,
    COUNT(DISTINCT CASE WHEN et.authorization_status = 'pending' THEN et.transfer_id END) AS pending_transfers,
    COUNT(DISTINCT ex.examination_id) AS total_examinations_conducted,
    COUNT(DISTINCT cm.user_id) AS assigned_team_members
FROM cases c
JOIN users u ON c.created_by = u.user_id
LEFT JOIN evidence e ON c.case_id = e.case_id
LEFT JOIN evidence_transfer et ON e.evidence_id = et.evidence_id
LEFT JOIN examination ex ON e.evidence_id = ex.evidence_id
LEFT JOIN case_members cm ON c.case_id = cm.case_id
GROUP BY c.case_id, c.case_number, c.title, c.status, c.created_at, u.name;


-- --------------------------------------------------------------------
-- 2. DATABASE TRIGGERS
-- --------------------------------------------------------------------

-- Trigger 1: Automatic Audit Logging on Evidence Status Transitions
CREATE OR REPLACE FUNCTION fn_trg_evidence_status_audit()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO audit_log (
            user_id,
            evidence_id,
            action,
            event_timestamp,
            old_value,
            new_value,
            status
        ) VALUES (
            COALESCE(NEW.current_custodian_id, NEW.collected_by),
            NEW.evidence_id,
            'TRIGGER_EVIDENCE_STATUS_CHANGE',
            CURRENT_TIMESTAMP,
            'Status changed from ' || OLD.status,
            'Status changed to ' || NEW.status,
            'SUCCESS'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_evidence_status_audit ON evidence;
CREATE TRIGGER trg_evidence_status_audit
AFTER UPDATE OF status ON evidence
FOR EACH ROW
EXECUTE FUNCTION fn_trg_evidence_status_audit();


-- Trigger 2: Forensic Immutability Protection for Audit Log
-- Prevents UPDATE or DELETE operations on audit_log to guarantee tamper resistance
CREATE OR REPLACE FUNCTION fn_trg_prevent_audit_tampering()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'ChainTrace Security Policy: Audit log records are strictly immutable and cannot be modified or deleted.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_audit_log ON audit_log;
CREATE TRIGGER trg_protect_audit_log
BEFORE UPDATE OR DELETE ON audit_log
FOR EACH ROW
EXECUTE FUNCTION fn_trg_prevent_audit_tampering();


-- --------------------------------------------------------------------
-- 3. STORED FUNCTIONS & PROCEDURES
-- --------------------------------------------------------------------

-- Stored Function 1: Atomic Custody Transfer Processor
CREATE OR REPLACE FUNCTION fn_process_transfer_atomic(
    p_transfer_id INT,
    p_approve BOOLEAN,
    p_operator_id INT
)
RETURNS TABLE (
    transfer_id INT,
    evidence_id INT,
    authorization_status VARCHAR,
    new_custodian_id INT,
    new_location_id INT,
    evidence_status VARCHAR
) AS $$
DECLARE
    v_transfer RECORD;
    v_evidence RECORD;
    v_old_custodian INT;
    v_old_location INT;
    v_new_status VARCHAR;
BEGIN
    -- Select and lock transfer record
    SELECT * INTO v_transfer
    FROM evidence_transfer
    WHERE evidence_transfer.transfer_id = p_transfer_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Transfer record % not found', p_transfer_id;
    END IF;

    IF v_transfer.authorization_status != 'pending' THEN
        RAISE EXCEPTION 'Transfer % is already processed with status %', p_transfer_id, v_transfer.authorization_status;
    END IF;

    -- Select and lock evidence record
    SELECT * INTO v_evidence
    FROM evidence
    WHERE evidence.evidence_id = v_transfer.evidence_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Evidence record % not found', v_transfer.evidence_id;
    END IF;

    v_old_custodian := v_evidence.current_custodian_id;
    v_old_location := v_evidence.current_location_id;
    v_new_status := COALESCE(v_transfer.previous_evidence_status, 'stored');

    IF p_approve THEN
        UPDATE evidence_transfer
        SET authorization_status = 'approved'
        WHERE evidence_transfer.transfer_id = p_transfer_id;

        UPDATE evidence
        SET current_custodian_id = v_transfer.to_user_id,
            current_location_id = v_transfer.to_location_id,
            status = v_new_status
        WHERE evidence.evidence_id = v_transfer.evidence_id;

        INSERT INTO audit_log (user_id, evidence_id, action, event_timestamp, old_value, new_value, status)
        VALUES (
            p_operator_id,
            v_transfer.evidence_id,
            'STORED_PROC_TRANSFER_APPROVED',
            CURRENT_TIMESTAMP,
            'Custodian: ' || v_old_custodian || ', Location: ' || v_old_location,
            'Custodian: ' || v_transfer.to_user_id || ', Location: ' || v_transfer.to_location_id || ', Status: ' || v_new_status,
            'SUCCESS'
        );

        RETURN QUERY
        SELECT 
            p_transfer_id, 
            v_transfer.evidence_id, 
            'approved'::VARCHAR, 
            v_transfer.to_user_id, 
            v_transfer.to_location_id, 
            v_new_status;
    ELSE
        UPDATE evidence_transfer
        SET authorization_status = 'rejected'
        WHERE evidence_transfer.transfer_id = p_transfer_id;

        UPDATE evidence
        SET status = v_new_status
        WHERE evidence.evidence_id = v_transfer.evidence_id;

        INSERT INTO audit_log (user_id, evidence_id, action, event_timestamp, old_value, new_value, status)
        VALUES (
            p_operator_id,
            v_transfer.evidence_id,
            'STORED_PROC_TRANSFER_REJECTED',
            CURRENT_TIMESTAMP,
            'Status: pending',
            'Rejected. Custody remains unchanged.',
            'REJECTED'
        );

        RETURN QUERY
        SELECT 
            p_transfer_id, 
            v_transfer.evidence_id, 
            'rejected'::VARCHAR, 
            v_old_custodian, 
            v_old_location, 
            v_new_status;
    END IF;
END;
$$ LANGUAGE plpgsql;


-- --------------------------------------------------------------------
-- 4. PERFORMANCE & COMPOSITE INDEXES
-- --------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_transfer_evidence_status
    ON evidence_transfer(evidence_id, authorization_status);

CREATE INDEX IF NOT EXISTS idx_evidence_case_status
    ON evidence(case_id, status);

CREATE INDEX IF NOT EXISTS idx_access_evidence_time
    ON evidence_access(evidence_id, access_time DESC);

CREATE INDEX IF NOT EXISTS idx_audit_evidence_time
    ON audit_log(evidence_id, event_timestamp DESC);
