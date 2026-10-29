"""Nightly encrypted backup of every database table, stored in Dropbox under hotel-booking/backups.

Environment variables:
  BACKUP_ENCRYPTION_KEY  Fernet key (keep a copy outside Dropbox; without it backups cannot be read)
  BACKUP_TOKEN           shared secret the scheduler sends to POST /api/system/backup

Restore a downloaded backup file:
  python backup_service.py decrypt <backup_file.json.enc> <restored.json>
"""
import json
import os
import sys
from datetime import datetime, timedelta, timezone

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PARENT_DIR = os.path.dirname(BASE_DIR)
for path_dir in (BASE_DIR, PARENT_DIR):
    if path_dir not in sys.path:
        sys.path.insert(0, path_dir)

try:
    from dotenv import load_dotenv
    for env_file in [
        os.path.join(BASE_DIR, ".env"),
        os.path.join(PARENT_DIR, ".env"),
        os.path.join(os.getcwd(), ".env")
    ]:
        if os.path.isfile(env_file):
            load_dotenv(env_file)
except ImportError:
    pass

from cryptography.fernet import Fernet
from sqlalchemy import select

try:
    import dropbox_storage
except ImportError:
    from backend import dropbox_storage

BACKUP_FOLDER = "backups"
BACKUP_PREFIX = "backup_"
RETENTION_DAYS = 30


def _fernet() -> Fernet:
    key = os.getenv("BACKUP_ENCRYPTION_KEY")
    if not key:
        raise RuntimeError("BACKUP_ENCRYPTION_KEY is not set.")
    return Fernet(key.encode())


def dump_all_tables(engine, base) -> dict:
    tables = {}
    with engine.connect() as conn:
        for table in base.metadata.sorted_tables:
            rows = conn.execute(select(table)).mappings().all()
            tables[table.name] = [dict(row) for row in rows]
    return tables


def create_backup(engine, base) -> tuple:
    """Return (file name, encrypted bytes) for a full copy of the database."""
    now = datetime.now(timezone.utc)
    payload = json.dumps(
        {"created_at": now.isoformat(), "tables": dump_all_tables(engine, base)},
        default=str,
    ).encode("utf-8")
    name = f"{BACKUP_PREFIX}{now.strftime('%Y-%m-%d_%H%M%S')}.json.enc"
    return name, _fernet().encrypt(payload)


def prune_old_backups() -> int:
    cutoff = datetime.utcnow() - timedelta(days=RETENTION_DAYS)
    removed = 0
    try:
        entries = dropbox_storage.list_files(BACKUP_FOLDER)
    except Exception:
        return 0  # the folder does not exist yet
    for entry in entries:
        if entry.name.startswith(BACKUP_PREFIX) and entry.server_modified < cutoff:
            dropbox_storage.delete_file(entry.path_display)
            removed += 1
    return removed


def store_backup(engine, base) -> dict:
    name, blob = create_backup(engine, base)
    path = dropbox_storage.upload_file(blob, BACKUP_FOLDER, name)
    return {"file": path, "bytes": len(blob), "pruned": prune_old_backups()}


def decrypt_backup(blob: bytes) -> dict:
    return json.loads(_fernet().decrypt(blob).decode("utf-8"))


if __name__ == "__main__":
    if len(sys.argv) == 4 and sys.argv[1] == "decrypt":
        with open(sys.argv[2], "rb") as src:
            data = decrypt_backup(src.read())
        with open(sys.argv[3], "w", encoding="utf-8") as dst:
            json.dump(data, dst, indent=2, default=str)
        print(f"Restored JSON written to {sys.argv[3]}")
    else:
        print("Usage: python backup_service.py decrypt <backup_file.json.enc> <restored.json>")
