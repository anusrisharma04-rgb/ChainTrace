import hashlib
import uuid
from pathlib import Path
from datetime import datetime
from typing import Optional, List

from fastapi import (
    APIRouter,
    UploadFile,
    File,
    Form,
    HTTPException,
    Depends,
    Request
)
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import text

from backend.app.database.connection import get_db
from backend.app.models.evidence import Evidence
from backend.app.models.case import Case
from backend.app.models.user import User
from backend.app.schemas.evidence import EvidenceResponse
from backend.app.services.audit_service import log_audit_event
from backend.app.services.access_service import log_evidence_access
from backend.app.services.auth_service import get_optional_user


router = APIRouter(
    prefix="/evidence",
    tags=["Evidence"]
)

# Store uploads in the project's uploads directory
PROJECT_ROOT = Path(__file__).resolve().parents[3]
UPLOAD_DIR = PROJECT_ROOT / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

MAX_FILE_SIZE = 150 * 1024 * 1024  # 150 MB limit


def resolve_evidence_file_path(stored_path: Optional[str]) -> Optional[Path]:
    if not stored_path:
        return None
    # 1. Direct path check
    p1 = (PROJECT_ROOT / stored_path).resolve()
    if p1.is_file():
        return p1
    # 2. Check filename in UPLOAD_DIR
    p2 = (UPLOAD_DIR / Path(stored_path).name).resolve()
    if p2.is_file():
        return p2
    return None


# 1. Upload and register evidence
@router.post("/upload")
async def upload_evidence(
    request: Request,
    file: UploadFile = File(...),
    case_id: int = Form(...),
    evidence_type: str = Form(...),
    collection_time: datetime = Form(...),
    collected_by: int = Form(...),
    description: str = Form(None),
    serial_number: str = Form(None),
    current_location_id: int = Form(None),
    current_custodian_id: int = Form(None),
    db: Session = Depends(get_db)
):
    # Validate case existence
    case = db.query(Case).filter(Case.case_id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Associated case not found")

    # Validate collector existence
    collector = db.query(User).filter(User.user_id == collected_by).first()
    if not collector:
        raise HTTPException(status_code=404, detail="Collector user not found")

    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="No file selected"
        )

    file_content = await file.read()

    if not file_content:
        raise HTTPException(
            status_code=400,
            detail="Uploaded file is empty"
        )

    if len(file_content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail="Uploaded file exceeds 150MB limit"
        )

    # Compute SHA-256 hash strictly on backend
    sha256_hash = hashlib.sha256(file_content).hexdigest()

    original_filename = Path(
        file.filename.replace("\\", "/")
    ).name

    safe_filename = f"{uuid.uuid4().hex}_{original_filename}"
    file_path = UPLOAD_DIR / safe_filename

    try:
        with open(file_path, "wb") as uploaded_file:
            uploaded_file.write(file_content)

        # Default custodian to collector if not provided
        custodian_id = current_custodian_id if current_custodian_id is not None else collected_by

        evidence = Evidence(
            case_id=case_id,
            evidence_type=evidence_type,
            description=description,
            serial_number=serial_number,
            collection_time=collection_time,
            collected_by=collected_by,
            current_location_id=current_location_id,
            current_custodian_id=custodian_id,
            status="collected",
            original_hash=sha256_hash,
            file_path=f"uploads/{safe_filename}"
        )

        db.add(evidence)
        db.flush()

        # Record audit log
        log_audit_event(
            db=db,
            user_id=collected_by,
            action="EVIDENCE_REGISTERED",
            evidence_id=evidence.evidence_id,
            new_value=f"Evidence {original_filename} registered. SHA-256: {sha256_hash}",
            status="SUCCESS"
        )

        # Record access log
        client_ip = request.client.host if request.client else "127.0.0.1"
        log_evidence_access(
            db=db,
            evidence_id=evidence.evidence_id,
            user_id=collected_by,
            action="UPLOAD",
            access_status="granted",
            ip_address=client_ip
        )

        db.commit()
        db.refresh(evidence)

        return {
            "message": "Evidence uploaded and registered successfully",
            "evidence_id": evidence.evidence_id,
            "filename": original_filename,
            "sha256_hash": sha256_hash,
            "status": evidence.status,
            "current_custodian_id": evidence.current_custodian_id,
            "current_location_id": evidence.current_location_id
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        if file_path.exists():
            file_path.unlink()
        raise HTTPException(
            status_code=500,
            detail=f"Evidence upload failed: {str(e)}"
        )
    finally:
        await file.close()


# 2. Retrieve all evidence records (with optional case_id filtering)
@router.get("/", response_model=List[EvidenceResponse])
def get_all_evidence(
    case_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Evidence)
    if case_id is not None:
        query = query.filter(Evidence.case_id == case_id)

    evidence_records = (
        query.order_by(Evidence.evidence_id.desc())
        .all()
    )

    return evidence_records


# 3. Retrieve one evidence record
@router.get("/{evidence_id}", response_model=EvidenceResponse)
def get_evidence_by_id(
    evidence_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    evidence = (
        db.query(Evidence)
        .filter(Evidence.evidence_id == evidence_id)
        .first()
    )

    if evidence is None:
        raise HTTPException(
            status_code=404,
            detail="Evidence record not found"
        )

    # Log access view
    user_id = current_user.user_id if current_user else evidence.collected_by
    client_ip = request.client.host if request.client else "127.0.0.1"
    log_evidence_access(
        db=db,
        evidence_id=evidence.evidence_id,
        user_id=user_id,
        action="VIEW",
        access_status="granted",
        ip_address=client_ip
    )
    db.commit()

    return evidence


# 4. Verify evidence integrity
@router.get("/{evidence_id}/verify")
def verify_evidence_integrity(
    evidence_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    # Find the evidence record
    evidence = db.query(Evidence).filter(
        Evidence.evidence_id == evidence_id
    ).first()

    if evidence is None:
        raise HTTPException(
            status_code=404,
            detail="Evidence record not found"
        )

    file_path = resolve_evidence_file_path(evidence.file_path)

    user_id = current_user.user_id if current_user else evidence.collected_by
    client_ip = request.client.host if request.client else "127.0.0.1"

    if file_path is None or not file_path.is_file():
        # Record failed access attempt
        log_evidence_access(
            db=db,
            evidence_id=evidence.evidence_id,
            user_id=user_id,
            action="VERIFY",
            access_status="denied",
            ip_address=client_ip
        )
        log_audit_event(
            db=db,
            user_id=user_id,
            action="INTEGRITY_VERIFICATION_FAILED",
            evidence_id=evidence.evidence_id,
            new_value=f"Evidence file missing on disk: {evidence.file_path}",
            status="FAILED"
        )
        db.commit()

        raise HTTPException(
            status_code=404,
            detail="Stored evidence file not found on disk"
        )

    # Recalculate SHA-256 using the stored file
    sha256 = hashlib.sha256()

    with open(file_path, "rb") as stored_file:
        for chunk in iter(lambda: stored_file.read(4096), b""):
            sha256.update(chunk)

    calculated_hash = sha256.hexdigest()

    # Compare with the original hash in PostgreSQL
    is_intact = calculated_hash == evidence.original_hash
    status_label = "INTACT" if is_intact else "MODIFIED"

    # Log access and audit
    log_evidence_access(
        db=db,
        evidence_id=evidence.evidence_id,
        user_id=user_id,
        action="VERIFY",
        access_status="granted",
        ip_address=client_ip
    )

    log_audit_event(
        db=db,
        user_id=user_id,
        action="INTEGRITY_VERIFICATION",
        evidence_id=evidence.evidence_id,
        old_value=f"Original: {evidence.original_hash}",
        new_value=f"Calculated: {calculated_hash} (Status: {status_label})",
        status="SUCCESS" if is_intact else "INTEGRITY_BREACH"
    )
    db.commit()

    return {
        "evidence_id": evidence.evidence_id,
        "original_hash": evidence.original_hash,
        "calculated_hash": calculated_hash,
        "integrity_status": status_label,
        "is_intact": is_intact,
        "verified_at": datetime.utcnow().isoformat()
    }


# 5. Securely download uploaded evidence file
@router.get("/{evidence_id}/download")
def download_evidence(
    evidence_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    evidence = db.query(Evidence).filter(
        Evidence.evidence_id == evidence_id
    ).first()

    if evidence is None:
        raise HTTPException(status_code=404, detail="Evidence not found")

    file_path = resolve_evidence_file_path(evidence.file_path)

    user_id = current_user.user_id if current_user else evidence.collected_by
    client_ip = request.client.host if request.client else "127.0.0.1"

    if file_path is None or not file_path.is_file():
        log_evidence_access(
            db=db,
            evidence_id=evidence.evidence_id,
            user_id=user_id,
            action="DOWNLOAD_FAILED",
            access_status="denied",
            ip_address=client_ip
        )
        db.commit()
        raise HTTPException(status_code=404, detail="Physical evidence file not found on server")

    # Record successful download access
    log_evidence_access(
        db=db,
        evidence_id=evidence.evidence_id,
        user_id=user_id,
        action="DOWNLOAD",
        access_status="granted",
        ip_address=client_ip
    )
    log_audit_event(
        db=db,
        user_id=user_id,
        action="EVIDENCE_DOWNLOADED",
        evidence_id=evidence.evidence_id,
        new_value=f"File {file_path.name} downloaded",
        status="SUCCESS"
    )
    db.commit()

    return FileResponse(
        path=str(file_path),
        filename=file_path.name,
        media_type="application/octet-stream"
    )


# 6. Retrieve provenance and custody chain view record
@router.get("/{evidence_id}/custody-chain")
def get_evidence_custody_chain(
    evidence_id: int,
    db: Session = Depends(get_db)
):
    row = db.execute(
        text("SELECT * FROM v_evidence_custody_chain WHERE evidence_id = :eid"),
        {"eid": evidence_id}
    ).mappings().first()

    if not row:
        raise HTTPException(status_code=404, detail="Evidence not found in custody chain")
    return dict(row)

