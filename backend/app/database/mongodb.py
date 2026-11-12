import os
import datetime
from typing import Optional, List, Dict, Any
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
MONGODB_DB_NAME = os.getenv("MONGODB_DB_NAME", "chaintrace_forensics")

# In-memory document fallback store if MongoDB server is offline
_in_memory_reports: List[Dict[str, Any]] = []

_client: Optional[MongoClient] = None
_db = None


def get_mongodb_client():
    global _client, _db
    if _client is None:
        try:
            _client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=2000)
            # Trigger quick server ping
            _client.admin.command('ping')
            _db = _client[MONGODB_DB_NAME]
            print(f"[MongoDB] Successfully connected to {MONGODB_URI} -> {MONGODB_DB_NAME}")
        except (ConnectionFailure, ServerSelectionTimeoutError, Exception) as err:
            _client = None
            _db = None
            print(f"[MongoDB] Notice: MongoDB daemon not reached at {MONGODB_URI} ({err}). Running in resilient fallback mode.")
    return _db


def is_mongodb_available() -> bool:
    try:
        db = get_mongodb_client()
        return db is not None
    except Exception:
        return False


def save_forensic_report(report_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Saves a flexible forensic report document associated with PostgreSQL evidence_id and examination_id.
    """
    report_data = report_data.copy()
    if "created_at" not in report_data:
        report_data["created_at"] = datetime.datetime.utcnow().isoformat()

    db = get_mongodb_client()
    if db is not None:
        try:
            collection = db["forensic_reports"]
            result = collection.insert_one(report_data)
            report_data["_id"] = str(result.inserted_id)
            report_data["storage_backend"] = "MongoDB"
            return report_data
        except Exception as e:
            print(f"[MongoDB] Write failed ({e}), saving to fallback store.")

    # Resilient fallback store
    report_data["_id"] = f"mem_report_{len(_in_memory_reports) + 1}"
    report_data["storage_backend"] = "In-Memory Resilient Store (MongoDB Offline)"
    _in_memory_reports.append(report_data)
    return report_data


def get_forensic_reports(evidence_id: Optional[int] = None, examination_id: Optional[int] = None) -> List[Dict[str, Any]]:
    """
    Retrieves forensic report documents filtered by evidence_id or examination_id.
    """
    db = get_mongodb_client()
    if db is not None:
        try:
            collection = db["forensic_reports"]
            query = {}
            if evidence_id is not None:
                query["evidence_id"] = int(evidence_id)
            if examination_id is not None:
                query["examination_id"] = int(examination_id)
            docs = list(collection.find(query, {"_id": 1, "examination_id": 1, "evidence_id": 1, "analyst_id": 1, "metadata": 1, "extracted_artifacts": 1, "tool_outputs": 1, "notes": 1, "created_at": 1}))
            for d in docs:
                d["_id"] = str(d["_id"])
                d["storage_backend"] = "MongoDB"
            return docs
        except Exception as e:
            print(f"[MongoDB] Query failed ({e}), falling back.")

    # Search in fallback store
    results = []
    for d in _in_memory_reports:
        match = True
        if evidence_id is not None and d.get("evidence_id") != int(evidence_id):
            match = False
        if examination_id is not None and d.get("examination_id") != int(examination_id):
            match = False
        if match:
            results.append(d)
    return results
