import json
import os
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

from pymongo import MongoClient, ReturnDocument
from pymongo.collection import Collection
from werkzeug.security import generate_password_hash

BASE_DIR = Path(__file__).resolve().parent
USERS_FILE = BASE_DIR / "data" / "users.json"

# AWS DocumentDB, MongoDB Atlas, or local MongoDB — set via MONGODB_URI
MONGODB_URI = os.environ.get(
    "MONGODB_URI",
    os.environ.get("AWS_DOCUMENTDB_URI", "mongodb://127.0.0.1:27017"),
)
MONGODB_DB_NAME = os.environ.get("MONGODB_DB_NAME", "tricipher")
PASSWORD_ROTATION_DAYS = int(os.environ.get("PASSWORD_ROTATION_DAYS", "182"))
PASSWORD_REMINDER_DAYS = int(os.environ.get("PASSWORD_REMINDER_DAYS", "14"))

_client: MongoClient | None = None
_users: Collection | None = None


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def parse_utc_iso(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.strptime(value, "%Y-%m-%d %H:%M:%S UTC").replace(tzinfo=timezone.utc)
    except ValueError:
        return None


def password_expiry_status(user: dict) -> dict:
    changed_at = user.get("password_changed_at") or user.get("created_at")
    changed_dt = parse_utc_iso(changed_at) or utc_now()
    expires_dt = changed_dt + timedelta(days=PASSWORD_ROTATION_DAYS)
    now = utc_now()
    days_until = (expires_dt - now).days
    is_expired = days_until < 0

    return {
        "password_changed_at": changed_at,
        "password_expires_at": expires_dt.strftime("%Y-%m-%d %H:%M:%S UTC"),
        "days_until_expiry": days_until,
        "is_expired": is_expired,
        "reminder_due": is_expired or days_until <= PASSWORD_REMINDER_DAYS,
        "rotation_days": PASSWORD_ROTATION_DAYS,
        "rotation_months": round(PASSWORD_ROTATION_DAYS / 30.44),
    }


def password_expiry_public(status: dict) -> dict:
    return {
        "password_changed_at": status["password_changed_at"],
        "password_expires_at": status["password_expires_at"],
        "days_until_expiry": status["days_until_expiry"],
        "is_expired": status["is_expired"],
        "reminder_due": status["reminder_due"],
        "rotation_days": status["rotation_days"],
    }


def _build_mongo_client() -> MongoClient:
    """Connect to local MongoDB, MongoDB Atlas, or AWS DocumentDB."""
    kwargs: dict = {"serverSelectionTimeoutMS": 5000}

    use_tls = os.environ.get("MONGODB_TLS", "").lower() in ("true", "1", "yes")
    tls_ca_file = os.environ.get("MONGODB_TLS_CA_FILE")
    aws_docdb = os.environ.get("AWS_DOCUMENTDB", "").lower() in ("true", "1", "yes")

    if aws_docdb or use_tls or tls_ca_file:
        kwargs["tls"] = True
    if tls_ca_file:
        kwargs["tlsCAFile"] = tls_ca_file
    if aws_docdb:
        kwargs["retryWrites"] = False

    return MongoClient(MONGODB_URI, **kwargs)


def get_users_collection() -> Collection:
    global _client, _users
    if _users is None:
        _client = _build_mongo_client()
        database = _client[MONGODB_DB_NAME]
        _users = database.users
        _users.create_index("id", unique=True)
        _users.create_index(
            "username",
            unique=True,
            collation={"locale": "en", "strength": 2},
        )
    return _users


def _migrate_json_if_needed() -> None:
    users = get_users_collection()
    if users.count_documents({}) > 0:
        return
    if not USERS_FILE.exists():
        return

    with open(USERS_FILE, encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, list) or not data:
        return

    for user in data:
        users.update_one({"id": user["id"]}, {"$set": user}, upsert=True)


def find_user_by_username(username: str) -> dict | None:
    username = username.strip()
    if not username:
        return None
    return get_users_collection().find_one(
        {"username": username},
        {"_id": 0},
        collation={"locale": "en", "strength": 2},
    )


def find_user_by_id(user_id: str) -> dict | None:
    return get_users_collection().find_one({"id": user_id}, {"_id": 0})


def list_users() -> list[dict]:
    return list(get_users_collection().find({}, {"_id": 0}).sort("username", 1))


def create_user(user: dict) -> dict:
    doc = dict(user)
    get_users_collection().insert_one(doc)
    return user


def update_user_by_id(user_id: str, updates: dict) -> dict | None:
    return get_users_collection().find_one_and_update(
        {"id": user_id},
        {"$set": updates},
        return_document=ReturnDocument.AFTER,
        projection={"_id": 0},
    )


def delete_user_by_id(user_id: str) -> bool:
    result = get_users_collection().delete_one({"id": user_id})
    return result.deleted_count > 0


def count_admins() -> int:
    return get_users_collection().count_documents({"is_admin": True})


def ensure_password_timestamps() -> None:
    users = get_users_collection()
    for user in users.find({"password_changed_at": {"$exists": False}}, {"_id": 1, "created_at": 1}):
        users.update_one(
            {"_id": user["_id"]},
            {"$set": {"password_changed_at": user.get("created_at") or utc_now_iso()}},
        )


def ensure_default_admin() -> None:
    _migrate_json_if_needed()
    ensure_password_timestamps()
    users = get_users_collection()
    if users.count_documents({}) > 0:
        return
    now = utc_now_iso()
    users.insert_one(
        {
            "id": str(uuid.uuid4()),
            "username": "admin",
            "password_hash": generate_password_hash("admin123"),
            "created_at": now,
            "password_changed_at": now,
            "last_logged_in": None,
            "is_admin": True,
        }
    )
