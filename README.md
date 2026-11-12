# ChainTrace — Digital Evidence Provenance & Integrity Management System
**Academic Level:** DBMS Level 3  
**Technology Stack:** Next.js 14, Python FastAPI, PostgreSQL 15, MongoDB NoSQL, SQLAlchemy ORM, SHA-256 Cryptography

---

## Overview

ChainTrace is an end-to-end digital forensic evidence management system engineered to safeguard evidence integrity, record comprehensive chain of custody provenance, and provide flexible unstructured artifact analysis reporting.

The application leverages a **hybrid polyglot persistence architecture**:
- **PostgreSQL 15:** Master relational database enforcing ACID transactions, row-level locking, foreign key constraints, composite indexing, advanced views, and tamper-resistant database triggers.
- **MongoDB:** Flexible document store capturing semi-structured forensic artifact reports, tool outputs, entropy metrics, and analyst notes.

---

## Forensic Color Palette Design System

The frontend strictly enforces the specified forensic palette:
- **Charcoal (`#292727`):** Primary sidebar and dark navigation elements.
- **Deep Burgundy (`#701F36`):** Primary action buttons, transfer requests, and critical alerts.
- **Warm Ivory (`#F4EFE5`):** Main workspace canvas, background, and panels.
- **Forest Green (`#244C3A`):** Intact evidence status, successful operations, and active indicators.

---

## Advanced DBMS Concepts Implemented (6 Demonstrable Features)

1. **ACID Transactions & Row-Level Locking:** `SELECT FOR UPDATE` prevents concurrent race conditions during custody transfers.
2. **Database Immutability Trigger (`trg_protect_audit_log`):** Strictly enforces append-only security, raising an exception if an `UPDATE` or `DELETE` is attempted on `audit_log`.
3. **Automatic Status Audit Trigger (`trg_evidence_status_audit`):** Intercepts evidence status transitions and records old/new values automatically in `audit_log`.
4. **Stored Functions (`fn_process_transfer_atomic`):** Executes custody state transition, custodian assignment, and logging in a single atomic database function.
5. **Advanced Database Views:**
   - `v_case_forensic_summary`: Multi-table analytical aggregate view.
   - `v_evidence_custody_chain`: Denormalized evidence provenance join.
6. **Composite & Covering Indexes:** `idx_transfer_evidence_status`, `idx_evidence_case_status`, `idx_access_evidence_time`, `idx_audit_evidence_time`.

---

## Demonstration Credentials

| Role | Email | Password | Access Level |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@chaintrace.local` | `admin123` | Full administrative control, user creation, case setup |
| **Investigator** | `investigator@chaintrace.com` | `investigator123` | Case management, evidence upload, custody transfer authorization |
| **Forensic Analyst** | `analyst@chaintrace.com` | `analyst123` | Evidence inspection, integrity verification, NoSQL reports |

---

## Quick Start Instructions

### 1. Start the Backend API
```bash
cd backend
# Or from root with virtualenv activated:
source .venv/bin/activate
export PYTHONPATH=.
uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```
Swagger API Documentation is available at: `http://127.0.0.1:8000/docs`

### 2. Start the Frontend Dashboard
```bash
cd frontend
npm run dev
```
Open web browser to: `http://localhost:3000`

### 3. Run Automated Tests
```bash
PYTHONPATH=. .venv/bin/pytest tests/test_chaintrace_backend.py -v
```

---

## Documentation Links
- Full Architecture, ER Diagram, and Data Dictionary: [`documentation/CHAINTRACE_SYSTEM_DOCUMENTATION.md`](file:///Users/anu/Downloads/ChainTrace/documentation/CHAINTRACE_SYSTEM_DOCUMENTATION.md)
- Advanced DBMS SQL Script: [`database/advanced_features.sql`](file:///Users/anu/Downloads/ChainTrace/database/advanced_features.sql)
