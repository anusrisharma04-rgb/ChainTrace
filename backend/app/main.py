from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.routes.auth import router as auth_router
from backend.app.routes.users import router as users_router
from backend.app.routes.roles import router as roles_router
from backend.app.routes.cases import router as cases_router
from backend.app.routes.case_members import router as case_members_router
from backend.app.routes.locations import router as locations_router
from backend.app.routes.evidence import router as evidence_router
from backend.app.routes.evidence_transfers import router as transfer_router
from backend.app.routes.examinations import router as examinations_router
from backend.app.routes.evidence_access import router as evidence_access_router
from backend.app.routes.audit_log import router as audit_log_router
from backend.app.database.mongodb import is_mongodb_available

app = FastAPI(
    title="ChainTrace API",
    description="Digital Forensic Evidence Provenance & Integrity Management System (DBMS Level 3)",
    version="1.0.0"
)

# Enable CORS for Next.js frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routes
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(roles_router)
app.include_router(cases_router)
app.include_router(case_members_router)
app.include_router(locations_router)
app.include_router(evidence_router)
app.include_router(transfer_router)
app.include_router(examinations_router)
app.include_router(evidence_access_router)
app.include_router(audit_log_router)


@app.get("/")
def home():
    return {
        "project": "ChainTrace — Digital Evidence Provenance & Integrity Management System",
        "system_status": "ONLINE",
        "api_version": "1.0.0",
        "database": {
            "relational": "PostgreSQL 15 (Active)",
            "nosql": "MongoDB Forensic Document Store (" + ("Connected" if is_mongodb_available() else "Resilient Fallback Mode") + ")"
        }
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "mongodb_connected": is_mongodb_available()
    }
