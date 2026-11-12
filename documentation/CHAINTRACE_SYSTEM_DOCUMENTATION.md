# CHAINTRACE — DIGITAL EVIDENCE PROVENANCE & INTEGRITY MANAGEMENT SYSTEM
## DBMS Level 3 Comprehensive System Architecture, Database Design & Verification Manual

---

### Executive Summary

**ChainTrace** is an enterprise-grade digital forensic evidence provenance and chain-of-custody platform engineered to ensure the strict integrity, authenticity, and non-repudiation of digital evidence from point of seizure to judicial presentation. Built upon a robust **hybrid polyglot database architecture** (PostgreSQL 15 relational master store + MongoDB flexible NoSQL document store), ChainTrace guarantees end-to-end auditability through cryptographic **SHA-256 integrity verification**, **database-level immutability triggers**, **atomic custody transfer stored procedures**, and comprehensive **Role-Based Access Control (RBAC)**.

---

## 1. System Architecture & Polyglot Persistence

ChainTrace employs a multi-tiered forensic architecture:

```
+-------------------------------------------------------------------------+
|                         NEXT.JS 14 FRONTEND                             |
|  - Forensic Color Palette: Charcoal (#292727), Burgundy (#701F36),      |
|    Warm Ivory (#F4EFE5), Forest Green (#244C3A)                         |
|  - Real-Time Integrity Verification Engine UI                           |
|  - Custody Transfer Authorization Console                               |
|  - NoSQL Forensic Artifact Report Explorer                              |
+------------------------------------+------------------------------------+
                                     | RESTful JSON (CORS Enabled)
                                     v
+-------------------------------------------------------------------------+
|                         FASTAPI BACKEND CORE                            |
|  - Argon2id Password Hashing (pwdlib)                                   |
|  - PyJWT Bearer Authentication & Role Enforcement                       |
|  - Server-Side SHA-256 Cryptographic Hashing Engine                     |
|  - Automated Access & Audit Log Generation                              |
+-------------------+---------------------------------+-------------------+
                    |                                 |
                    v                                 v
+---------------------------------------+ +-------------------------------+
|       POSTGRESQL 15 (Relational)      | |      MONGODB (NoSQL Store)    |
|  - Master Schema: 10 Relational Tables| |  - Database:                  |
|  - ACID Concurrency (SELECT FOR UPDATE)  `chaintrace_forensics`       |
|  - Triggers: Tamper-Proof Audit &     | |  - Collection:                |
|    Automatic Status Audit Logging     | |    `forensic_reports`         |
|  - Views: v_case_forensic_summary &   | |  - Flexible semi-structured   |
|    v_evidence_custody_chain           | |    artifacts, tool outputs,   |
|  - Stored Function: Transfer Processor| |    entropy, hex signatures    |
+---------------------------------------+ +-------------------------------+
```

### Why Polyglot Persistence?
1. **Relational PostgreSQL:** Evidence metadata, chain of custody movement, case membership, and role authorizations require strict ACID transactions, foreign key constraints, and relational provenance.
2. **NoSQL MongoDB:** Digital forensic examinations generate semi-structured, highly dynamic artifacts (e.g. volatile memory memory maps, EXIF metadata streams, packet capture protocol trees, malware indicators, and hex dump extractions) whose schema varies by forensic tool and cannot be shoehorned into a static relational schema without severe schema pollution.

---

## 2. Advanced DBMS Concepts Implemented

The system explicitly integrates and demonstrates six demonstrable advanced DBMS concepts:

### 1. ACID Transactions & Row-Level Locking (`SELECT FOR UPDATE`)
- **Location:** `backend/app/routes/evidence_transfers.py` & `fn_process_transfer_atomic`
- **Purpose:** Prevents race conditions during concurrent transfer requests or approvals. By locking the specific evidence row (`SELECT FOR UPDATE`), multiple concurrent transfer requests cannot leave evidence in contradictory custody states.

### 2. Database Triggers
- **Trigger 1: `trg_evidence_status_audit`**  
  *Implementation:* `AFTER UPDATE OF status ON evidence`  
  *Function:* Automatically intercepts any evidence status change (e.g. `collected` -> `in_transfer` -> `stored` -> `under_examination`) and writes a forensic audit record to `audit_log` with `OLD.status` and `NEW.status`.
- **Trigger 2: `trg_protect_audit_log` (Forensic Immutability)**  
  *Implementation:* `BEFORE UPDATE OR DELETE ON audit_log`  
  *Function:* Forensically guarantees that audit records are strictly **append-only**. Any attempt to modify or delete audit records is aborted with:  
  `ERROR: ChainTrace Security Policy: Audit log records are strictly immutable and cannot be modified or deleted.`

### 3. Stored Functions / Procedures
- **Function: `fn_process_transfer_atomic(p_transfer_id INT, p_approve BOOLEAN, p_operator_id INT)`**  
  *Implementation:* PL/pgSQL stored function in `database/advanced_features.sql`  
  *Function:* Executes the entire custody transfer lifecycle inside the PostgreSQL engine: locks transfer and evidence records, validates pending state, updates evidence custodian and location, updates authorization status, and logs the event to `audit_log` in a single atomic transaction.

### 4. Database Views
- **View 1: `v_evidence_custody_chain`**  
  *Purpose:* A denormalized provenance view joining `evidence`, `cases`, `locations`, `users` (as collector), and `users` (as current custodian) to output complete forensic chain-of-custody data without requiring repetitive application-level multi-table joins.
- **View 2: `v_case_forensic_summary`**  
  *Purpose:* An aggregate analytical view utilizing multi-table `LEFT JOIN` and `GROUP BY` to aggregate total evidence count, evidence under examination, pending transfers, total examinations conducted, and assigned team members per case.

### 5. Composite & Covering Indexing
- `idx_transfer_evidence_status` ON `evidence_transfer(evidence_id, authorization_status)`
- `idx_evidence_case_status` ON `evidence(case_id, status)`
- `idx_access_evidence_time` ON `evidence_access(evidence_id, access_time DESC)`
- `idx_audit_evidence_time` ON `audit_log(evidence_id, event_timestamp DESC)`

### 6. Complex Joins & Relational Integrity Constraints
- Foreign keys with `ON DELETE CASCADE` on `case_members`.
- Check constraints enforcing state machine boundaries (`chk_user_status`, `chk_case_status`, `chk_evidence_status`, `chk_transfer_authorization`, `chk_examination_time`, `chk_access_status`).

---

## 3. Relational Schema & Data Dictionary

### Entity-Relationship Diagram (ERD)

```
[roles] 1 ────< [users] 1 ────< [cases] 1 ────< [evidence] 1 ────< [examination]
                   │   │            │                 │  │
                   │   │            │                 │  └─────< [evidence_access]
                   │   │            │                 │
                   │   │            └─────< [case_members] >─────┘
                   │   │                              │
                   │   └──────────────< [evidence_transfer] >────────< [locations]
                   │                                  │
                   └──────────────────< [audit_log] >─┘
```

### Table 1: `roles`
Stores authorization roles defining system permissions.
- `role_id` (INT, PK, SERIAL)
- `role_name` (VARCHAR(50), UNIQUE, NOT NULL): `Administrator`, `Investigator`, `Forensic Analyst`
- `description` (TEXT)

### Table 2: `users`
Authorized law enforcement and laboratory personnel.
- `user_id` (INT, PK, SERIAL)
- `role_id` (INT, FK -> roles.role_id, NOT NULL)
- `name` (VARCHAR(100), NOT NULL)
- `email` (VARCHAR(150), UNIQUE, NOT NULL)
- `password_hash` (TEXT, NOT NULL): Argon2id password hash
- `department` (VARCHAR(100))
- `status` (VARCHAR(20), CHECK status IN ('active', 'inactive', 'suspended'))
- `created_at` (TIMESTAMP, DEFAULT CURRENT_TIMESTAMP)

### Table 3: `cases`
Investigation case records.
- `case_id` (INT, PK, SERIAL)
- `case_number` (VARCHAR(50), UNIQUE, NOT NULL): e.g. `CT-2026-001`
- `title` (VARCHAR(200), NOT NULL)
- `description` (TEXT)
- `status` (VARCHAR(30), CHECK status IN ('open', 'under_investigation', 'closed'))
- `created_by` (INT, FK -> users.user_id, NOT NULL)
- `created_at` (TIMESTAMP, DEFAULT CURRENT_TIMESTAMP)

### Table 4: `case_members`
Many-to-many relationship linking investigators/analysts to cases.
- `case_id` (INT, PK, FK -> cases.case_id ON DELETE CASCADE)
- `user_id` (INT, PK, FK -> users.user_id ON DELETE CASCADE)
- `joined_at` (TIMESTAMP, DEFAULT CURRENT_TIMESTAMP)

### Table 5: `locations`
Physical repositories, lockers, and labs.
- `location_id` (INT, PK, SERIAL)
- `location_name` (VARCHAR(150), NOT NULL)
- `location_type` (VARCHAR(50), NOT NULL)
- `description` (TEXT)

### Table 6: `evidence`
Master forensic evidence inventory.
- `evidence_id` (INT, PK, SERIAL)
- `case_id` (INT, FK -> cases.case_id, NOT NULL)
- `evidence_type` (VARCHAR(100), NOT NULL)
- `description` (TEXT)
- `serial_number` (VARCHAR(100))
- `collection_time` (TIMESTAMP, NOT NULL)
- `collected_by` (INT, FK -> users.user_id, NOT NULL)
- `current_location_id` (INT, FK -> locations.location_id)
- `current_custodian_id` (INT, FK -> users.user_id)
- `status` (VARCHAR(30), CHECK status IN ('collected', 'in_transfer', 'stored', 'under_examination', 'released'))
- `original_hash` (VARCHAR(128), NOT NULL): Cryptographic SHA-256 computed on backend at upload
- `file_path` (TEXT): Server-side physical storage path
- `created_at` (TIMESTAMP, DEFAULT CURRENT_TIMESTAMP)

### Table 7: `evidence_transfer`
Chain of custody transfer ledger.
- `transfer_id` (INT, PK, SERIAL)
- `evidence_id` (INT, FK -> evidence.evidence_id, NOT NULL)
- `from_user_id` (INT, FK -> users.user_id, NOT NULL)
- `to_user_id` (INT, FK -> users.user_id, NOT NULL)
- `from_location_id` (INT, FK -> locations.location_id, NOT NULL)
- `to_location_id` (INT, FK -> locations.location_id, NOT NULL)
- `transfer_time` (TIMESTAMP, DEFAULT CURRENT_TIMESTAMP)
- `reason` (TEXT, NOT NULL)
- `authorization_status` (VARCHAR(30), CHECK authorization_status IN ('pending', 'approved', 'rejected'))
- `previous_evidence_status` (VARCHAR(30))

### Table 8: `examination`
Forensic examination records.
- `examination_id` (INT, PK, SERIAL)
- `evidence_id` (INT, FK -> evidence.evidence_id, NOT NULL)
- `analyst_id` (INT, FK -> users.user_id, NOT NULL)
- `start_time` (TIMESTAMP, NOT NULL)
- `end_time` (TIMESTAMP, CHECK end_time IS NULL OR end_time >= start_time)
- `tool_used` (VARCHAR(150))
- `purpose` (TEXT, NOT NULL)
- `findings` (TEXT)
- `result` (TEXT)

### Table 9: `evidence_access`
Detailed log of evidence interactions.
- `access_id` (INT, PK, SERIAL)
- `evidence_id` (INT, FK -> evidence.evidence_id, NOT NULL)
- `user_id` (INT, FK -> users.user_id, NOT NULL)
- `action` (VARCHAR(100), NOT NULL): `VIEW`, `DOWNLOAD`, `VERIFY`, `UPLOAD`
- `access_time` (TIMESTAMP, DEFAULT CURRENT_TIMESTAMP)
- `access_status` (VARCHAR(30), CHECK access_status IN ('granted', 'denied'))
- `ip_address` (VARCHAR(45))

### Table 10: `audit_log`
Immutable, trigger-protected system audit trail.
- `audit_id` (INT, PK, SERIAL)
- `user_id` (INT, FK -> users.user_id, NOT NULL)
- `evidence_id` (INT, FK -> evidence.evidence_id)
- `action` (VARCHAR(100), NOT NULL)
- `event_timestamp` (TIMESTAMP, DEFAULT CURRENT_TIMESTAMP)
- `old_value` (TEXT)
- `new_value` (TEXT)
- `status` (VARCHAR(30), NOT NULL)

---

## 4. Security & Role-Based Access Control (RBAC)

| Capability | Administrator | Investigator | Forensic Analyst |
| :--- | :---: | :---: | :---: |
| Authenticate & View Dashboard | Yes | Yes | Yes |
| Create Cases & Assign Members | Yes | Yes | No |
| Upload & Register Evidence | Yes | Yes | No |
| Verify Evidence Integrity (SHA-256) | Yes | Yes | Yes |
| Request Custody Transfer | Yes | Yes | Yes |
| Authorize / Reject Transfer | Yes | Yes | No |
| Perform Examination & Attach NoSQL Reports | Yes | No | Yes |
| Download Physical Evidence File | Yes | Yes | Yes |
| View Immutable System Audit Trail | Yes | Yes | Yes |
| Create & Manage User Accounts | Yes | No | No |

---

## 5. System Execution Manual

### Prerequisites
- Python 3.9.6 in `.venv`
- PostgreSQL 15 running locally (`chaintrace` database)
- Node.js v22.x & npm 10.x

### Step 1: Start the FastAPI Backend
```bash
cd /Users/anu/Downloads/ChainTrace
source .venv/bin/activate
export PYTHONPATH=.
uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```
API Documentation will be accessible at: `http://127.0.0.1:8000/docs`

### Step 2: Start the Next.js Frontend
```bash
cd /Users/anu/Downloads/ChainTrace/frontend
npm run dev
```
Open web browser to: `http://localhost:3000`

### Step 3: MongoDB Configuration (Optional)
If local MongoDB is installed:
```bash
brew services start mongodb-community
```
If MongoDB is not installed, ChainTrace automatically falls back to its built-in in-memory document store without blocking PostgreSQL or crashing any application workflows.

---

## 6. Demonstration Script for Examiners

1. **Login & Role Verification:**
   - Go to `http://localhost:3000/login`.
   - Click "Administrator" demo account (`admin@chaintrace.local` / `admin123`) to log in.
   - Observe the Charcoal (`#292727`), Burgundy (`#701F36`), and Warm Ivory (`#F4EFE5`) design system.

2. **Demonstrate Advanced View `v_case_forensic_summary`:**
   - On the Dashboard, show the "Case Forensic Summary" table. Point out that the metrics (total evidence, under examination, pending transfers, total examinations, team size) are computed by a multi-table aggregate database view.

3. **Demonstrate Real-Time Cryptographic Integrity Verification:**
   - In the "Real-Time Evidence Integrity Monitor", click **Verify Hash** for Evidence #2.
   - Point out the **INTACT** badge (Forest Green `#244C3A`) where calculated hash matches the master hash.
   - Click **Verify Hash** for Evidence #1. Point out the **MODIFIED / TAMPERED** badge (Burgundy `#701F36`) where the hash difference detects simulated evidence tampering.

4. **Demonstrate Chain of Custody & Dual Sign-off:**
   - Go to `/transfers`. Click "Initiate Custody Transfer".
   - Select Evidence #1, transfer from User 3 to User 2 at Forensic Lab. Submit transfer.
   - Show the transfer in "Pending Custody Transfer Approvals".
   - Click **Approve & Update Custody**. Show that custodian and location are atomically updated.

5. **Demonstrate NoSQL MongoDB Integration:**
   - Go to `/examinations`.
   - Click "MongoDB Reports" for Examination #1. Show the flexible semi-structured JSON document with metadata, extracted artifacts, and tool outputs.

6. **Demonstrate Database Immutability Trigger:**
   - Go to `/audit-logs`. Show that every login, transfer, verification, and case update is permanently logged.
   - Run in psql: `DELETE FROM audit_log WHERE audit_id = 1;`
   - Show the examiner the active PostgreSQL error:  
     `ERROR: ChainTrace Security Policy: Audit log records are strictly immutable and cannot be modified or deleted.`
