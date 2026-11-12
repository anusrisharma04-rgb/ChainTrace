from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from datetime import datetime

from backend.app.database.connection import get_db
from backend.app.models.examination import Examination
from backend.app.models.evidence import Evidence
from backend.app.models.user import User
from backend.app.schemas.examination import ExaminationCreate, ExaminationResponse
from backend.app.services.auth_service import get_current_user, require_roles
from backend.app.services.audit_service import log_audit_event
from backend.app.database.mongodb import save_forensic_report, get_forensic_reports


router = APIRouter(
    prefix="/examinations",
    tags=["Forensic Examinations"]
)


class MongoReportCreate(BaseModel):
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)
    extracted_artifacts: Optional[List[str]] = Field(default_factory=list)
    tool_outputs: Optional[Dict[str, Any]] = Field(default_factory=dict)
    notes: Optional[str] = ""


@router.post("/", response_model=ExaminationResponse)
def create_examination(
    exam_data: ExaminationCreate,
    current_user: User = Depends(require_roles(["Administrator", "Forensic Analyst"])),
    db: Session = Depends(get_db)
):
    evidence = db.query(Evidence).filter(Evidence.evidence_id == exam_data.evidence_id).first()
    if not evidence:
        raise HTTPException(status_code=404, detail="Evidence not found")

    analyst = db.query(User).filter(User.user_id == exam_data.analyst_id).first()
    if not analyst:
        raise HTTPException(status_code=404, detail="Analyst user not found")

    # If end_time is provided, ensure it's not before start_time
    if exam_data.end_time and exam_data.end_time < exam_data.start_time:
        raise HTTPException(
            status_code=400,
            detail="End time cannot be earlier than start time"
        )

    new_exam = Examination(
        evidence_id=exam_data.evidence_id,
        analyst_id=exam_data.analyst_id,
        start_time=exam_data.start_time,
        end_time=exam_data.end_time,
        tool_used=exam_data.tool_used,
        purpose=exam_data.purpose,
        findings=exam_data.findings,
        result=exam_data.result
    )

    try:
        db.add(new_exam)
        # Update evidence status to under_examination if not already
        if evidence.status != "under_examination":
            evidence.status = "under_examination"

        db.flush()

        log_audit_event(
            db=db,
            user_id=current_user.user_id,
            action="EXAMINATION_CREATED",
            evidence_id=evidence.evidence_id,
            new_value=f"Examination #{new_exam.examination_id} started using {new_exam.tool_used or 'Manual'}",
            status="SUCCESS"
        )

        db.commit()
        db.refresh(new_exam)
        return new_exam

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create examination: {str(e)}")


@router.get("/", response_model=List[ExaminationResponse])
def get_examinations(
    evidence_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Examination)
    if evidence_id:
        query = query.filter(Examination.evidence_id == evidence_id)
    return query.order_by(Examination.start_time.desc()).all()


@router.get("/{examination_id}", response_model=ExaminationResponse)
def get_examination_by_id(
    examination_id: int,
    db: Session = Depends(get_db)
):
    exam = db.query(Examination).filter(Examination.examination_id == examination_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Examination not found")
    return exam


@router.put("/{examination_id}", response_model=ExaminationResponse)
def update_examination(
    examination_id: int,
    exam_update: ExaminationCreate,
    current_user: User = Depends(require_roles(["Administrator", "Forensic Analyst"])),
    db: Session = Depends(get_db)
):
    exam = db.query(Examination).filter(Examination.examination_id == examination_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Examination not found")

    old_findings = exam.findings

    exam.start_time = exam_update.start_time
    exam.end_time = exam_update.end_time
    exam.tool_used = exam_update.tool_used
    exam.purpose = exam_update.purpose
    exam.findings = exam_update.findings
    exam.result = exam_update.result

    log_audit_event(
        db=db,
        user_id=current_user.user_id,
        action="EXAMINATION_UPDATED",
        evidence_id=exam.evidence_id,
        old_value=f"Findings: {old_findings}",
        new_value=f"Findings: {exam.findings} | Result: {exam.result}",
        status="SUCCESS"
    )

    db.commit()
    db.refresh(exam)
    return exam


# MongoDB NoSQL Document Integration Endpoints
@router.post("/{examination_id}/report")
def add_forensic_report_document(
    examination_id: int,
    report_in: MongoReportCreate,
    current_user: User = Depends(require_roles(["Administrator", "Forensic Analyst"])),
    db: Session = Depends(get_db)
):
    exam = db.query(Examination).filter(Examination.examination_id == examination_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Examination not found")

    doc = {
        "examination_id": examination_id,
        "evidence_id": exam.evidence_id,
        "analyst_id": current_user.user_id,
        "metadata": report_in.metadata,
        "extracted_artifacts": report_in.extracted_artifacts,
        "tool_outputs": report_in.tool_outputs,
        "notes": report_in.notes
    }

    saved_doc = save_forensic_report(doc)

    log_audit_event(
        db=db,
        user_id=current_user.user_id,
        action="NOSQL_REPORT_ATTACHED",
        evidence_id=exam.evidence_id,
        new_value=f"Attached forensic report doc ID {saved_doc.get('_id')}",
        status="SUCCESS"
    )
    db.commit()

    return {
        "message": "Forensic NoSQL report document saved successfully",
        "document": saved_doc
    }


@router.get("/{examination_id}/reports")
def list_forensic_reports_for_examination(
    examination_id: int,
    db: Session = Depends(get_db)
):
    exam = db.query(Examination).filter(Examination.examination_id == examination_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Examination not found")

    reports = get_forensic_reports(examination_id=examination_id)
    return reports
