import io
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from backend.app.main import app
from backend.app.database.connection import SessionLocal

client = TestClient(app)


def test_01_health_and_home():
    """Verify system health and metadata endpoints."""
    r_home = client.get("/")
    assert r_home.status_code == 200
    assert r_home.json()["system_status"] == "ONLINE"

    r_health = client.get("/health")
    assert r_health.status_code == 200
    assert r_health.json()["status"] == "healthy"


def test_02_authentication_and_jwt_tokens():
    """Verify login for Administrator, Investigator, and Forensic Analyst."""
    # 1. Admin login
    r_admin = client.post("/auth/login", json={"email": "admin@chaintrace.local", "password": "admin123"})
    assert r_admin.status_code == 200
    assert "access_token" in r_admin.json()
    assert r_admin.json()["user"]["role_name"] == "Administrator"

    # 2. Investigator login
    r_inv = client.post("/auth/login", json={"email": "investigator@chaintrace.com", "password": "investigator123"})
    assert r_inv.status_code == 200
    assert r_inv.json()["user"]["role_name"] == "Investigator"

    # 3. Analyst login
    r_ana = client.post("/auth/login", json={"email": "analyst@chaintrace.com", "password": "analyst123"})
    assert r_ana.status_code == 200
    assert r_ana.json()["user"]["role_name"] == "Forensic Analyst"

    # 4. Check profile with token
    token = r_admin.json()["access_token"]
    r_me = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r_me.status_code == 200
    assert r_me.json()["email"] == "admin@chaintrace.local"


def test_03_login_failure_and_audit():
    """Verify failed login returns 401 and records failed event in audit_log."""
    r = client.post("/auth/login", json={"email": "admin@chaintrace.local", "password": "wrongpassword"})
    assert r.status_code == 401

    # Verify audit log recorded the failure
    db = SessionLocal()
    recent = db.execute(text("SELECT * FROM audit_log WHERE action = 'USER_LOGIN_FAILED' ORDER BY audit_id DESC LIMIT 1")).mappings().first()
    assert recent is not None
    assert recent["status"] == "FAILED"
    db.close()


def test_04_case_management_and_summary_view():
    """Verify case creation, status update, and DBMS view v_case_forensic_summary."""
    r_admin = client.post("/auth/login", json={"email": "admin@chaintrace.local", "password": "admin123"})
    token = r_admin.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    case_num = f"CT-TEST-{pytest.__version__.replace('.', '')[:4]}"
    r_create = client.post("/cases/", json={
        "case_number": case_num,
        "title": "Automated Security Test Case",
        "description": "Verification of case integrity and DBMS summary view",
        "created_by": 1
    }, headers=headers)
    assert r_create.status_code == 200
    created_id = r_create.json()["case_id"]

    # Update case status
    r_update = client.put(f"/cases/{created_id}", json={"status": "under_investigation"}, headers=headers)
    assert r_update.status_code == 200
    assert r_update.json()["status"] == "under_investigation"

    # Test advanced DBMS view v_case_forensic_summary
    r_summary = client.get("/cases/summary/stats", headers=headers)
    assert r_summary.status_code == 200
    assert len(r_summary.json()) >= 1


def test_05_evidence_upload_and_backend_sha256():
    """Verify evidence upload generates authentic SHA-256 hash strictly on backend."""
    r_admin = client.post("/auth/login", json={"email": "admin@chaintrace.local", "password": "admin123"})
    token = r_admin.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    content = b"ChainTrace Forensic Test Evidence Payload Content Bytes 2026"
    import hashlib
    expected_hash = hashlib.sha256(content).hexdigest()

    file_tuple = ("test_artifact.bin", io.BytesIO(content), "application/octet-stream")

    r_upload = client.post("/evidence/upload", data={
        "case_id": 1,
        "evidence_type": "Binary Forensic Payload",
        "collection_time": "2026-11-12T08:00:00",
        "collected_by": 1,
        "description": "Automated test artifact",
        "serial_number": "SN-AUTOTEST-001",
        "current_location_id": 1,
        "current_custodian_id": 1
    }, files={"file": file_tuple}, headers=headers)

    assert r_upload.status_code == 200
    uploaded_data = r_upload.json()
    assert uploaded_data["sha256_hash"] == expected_hash
    assert uploaded_data["status"] == "collected"


def test_06_evidence_integrity_verification_intact_and_modified():
    """Verify cryptographic integrity verification returns INTACT for valid files and MODIFIED for tampered files."""
    r_admin = client.post("/auth/login", json={"email": "admin@chaintrace.local", "password": "admin123"})
    token = r_admin.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Evidence 2 is intact
    r_v2 = client.get("/evidence/2/verify", headers=headers)
    assert r_v2.status_code == 200
    assert r_v2.json()["integrity_status"] == "INTACT"
    assert r_v2.json()["is_intact"] is True

    # Evidence 1 has deliberate hash mismatch (simulated tampering)
    r_v1 = client.get("/evidence/1/verify", headers=headers)
    assert r_v1.status_code == 200
    assert r_v1.json()["integrity_status"] == "MODIFIED"
    assert r_v1.json()["is_intact"] is False


def test_07_evidence_custody_chain_view_and_download():
    """Verify v_evidence_custody_chain view and evidence physical download with access logging."""
    r_admin = client.post("/auth/login", json={"email": "admin@chaintrace.local", "password": "admin123"})
    token = r_admin.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Query view
    r_chain = client.get("/evidence/2/custody-chain", headers=headers)
    assert r_chain.status_code == 200
    assert r_chain.json()["case_number"] == "CT-2026-001"
    assert r_chain.json()["evidence_type"] == "pdf doc"

    # Download evidence file
    r_dl = client.get("/evidence/2/download", headers=headers)
    assert r_dl.status_code == 200
    assert len(r_dl.content) > 0

    # Verify download was recorded in evidence_access
    db = SessionLocal()
    access = db.execute(text("SELECT * FROM evidence_access WHERE evidence_id = 2 AND action = 'DOWNLOAD' ORDER BY access_id DESC LIMIT 1")).mappings().first()
    assert access is not None
    assert access["access_status"] == "granted"
    db.close()


def test_08_chain_of_custody_transfer_workflow():
    """Verify transfer request, validation of invalid sender, approval, and custodian update."""
    r_admin = client.post("/auth/login", json={"email": "admin@chaintrace.local", "password": "admin123"})
    token = r_admin.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Reject transfer if sender and receiver are the same
    r_invalid = client.post("/transfers/", json={
        "evidence_id": 2,
        "from_user_id": 2,
        "to_user_id": 2,
        "from_location_id": 2,
        "to_location_id": 1,
        "reason": "Invalid same-user transfer"
    }, headers=headers)
    assert r_invalid.status_code == 400

    # Create valid transfer from analyst (custodian) to admin
    r_tr = client.post("/transfers/", json={
        "evidence_id": 2,
        "from_user_id": 2,
        "to_user_id": 1,
        "from_location_id": 2,
        "to_location_id": 1,
        "reason": "Transfer to laboratory admin for archival"
    }, headers=headers)
    assert r_tr.status_code == 200
    transfer_id = r_tr.json()["transfer_id"]

    # Duplicate transfer on same evidence must be rejected
    r_dup = client.post("/transfers/", json={
        "evidence_id": 2,
        "from_user_id": 2,
        "to_user_id": 3,
        "from_location_id": 2,
        "to_location_id": 3,
        "reason": "Duplicate transfer attempt"
    }, headers=headers)
    assert r_dup.status_code == 409

    # Approve transfer
    r_app = client.patch(f"/transfers/{transfer_id}/approve", headers=headers)
    assert r_app.status_code == 200
    assert r_app.json()["authorization_status"] == "approved"
    assert r_app.json()["new_custodian_id"] == 1


def test_09_forensic_examinations_and_nosql_reports():
    """Verify recording examination and attaching semi-structured NoSQL report documents."""
    r_ana = client.post("/auth/login", json={"email": "analyst@chaintrace.com", "password": "analyst123"})
    token = r_ana.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Record examination
    r_exam = client.post("/examinations/", json={
        "evidence_id": 2,
        "analyst_id": 2,
        "start_time": "2026-11-12T09:00:00",
        "end_time": "2026-11-12T10:30:00",
        "tool_used": "Autopsy Forensic Browser 4.19",
        "purpose": "Automated regression examination",
        "findings": "Verified file header integrity and metadata properties",
        "result": "Intact and verified"
    }, headers=headers)
    assert r_exam.status_code == 200
    exam_id = r_exam.json()["examination_id"]

    # Attach NoSQL flexible document
    r_report = client.post(f"/examinations/{exam_id}/report", json={
        "metadata": {"test_suite": "pytest", "format": "PDF"},
        "extracted_artifacts": ["Header: %PDF-1.7", "EOF Marker Present"],
        "tool_outputs": {"entropy": 7.42, "status": "clean"},
        "notes": "NoSQL document stored in MongoDB flexible collection"
    }, headers=headers)
    assert r_report.status_code == 200
    assert "document" in r_report.json()

    # Query NoSQL reports
    r_list = client.get(f"/examinations/{exam_id}/reports", headers=headers)
    assert r_list.status_code == 200
    assert len(r_list.json()) >= 1


def test_10_database_trigger_audit_log_immutability():
    """Demonstrate PostgreSQL trigger trg_protect_audit_log blocks UPDATE or DELETE."""
    db = SessionLocal()
    with pytest.raises(Exception) as excinfo:
        # Attempt to delete the earliest audit log record
        db.execute(text("DELETE FROM audit_log WHERE audit_id = (SELECT MIN(audit_id) FROM audit_log)"))
        db.commit()
    db.rollback()
    db.close()
    assert "Audit log records are strictly immutable" in str(excinfo.value)
