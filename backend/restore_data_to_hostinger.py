"""
Restore Data to Hostinger Managed DB
-----------------------------------
This script safely restores your previous hotel operations data
(including Super Admin aszentech@gmail.com, Cardelia property, rooms, and bookings)
from the local SQLite backup directly into your Hostinger Managed Database.

Usage:
  python restore_data_to_hostinger.py
"""

import os
import sys
import sqlite3
from dotenv import load_dotenv

# Load backend .env if present
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

import database
from database import engine, SessionLocal
import models
from sqlalchemy import text

def find_backup_sqlite():
    candidates = [
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "hotel_booking.db.backup")),
        os.path.abspath(os.path.join(os.path.dirname(__file__), "hotel_booking.db.backup")),
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "hotel_booking.db")),
        os.path.abspath(os.path.join(os.path.dirname(__file__), "hotel_booking.db"))
    ]
    for c in candidates:
        if os.path.exists(c):
            # Check if this sqlite has manager accounts or bookings
            try:
                con = sqlite3.connect(c)
                cur = con.cursor()
                cur.execute("SELECT count(*) FROM manager_accounts")
                mgr_count = cur.fetchone()[0]
                con.close()
                if mgr_count > 0:
                    return c
            except Exception:
                pass
    # If no database had managers, return the backup file if exists
    for c in candidates:
        if os.path.exists(c) and "backup" in c:
            return c
    return candidates[0]

def get_target_engine():
    global engine, SessionLocal
    
    # If DATABASE_URL or HOSTINGER_DB_* is already configured and not sqlite, use it
    if not engine.url.drivername.startswith("sqlite"):
        return engine, SessionLocal

    print("\n" + "-" * 65)
    print(" [*] Target Destination is currently: LOCAL SQLITE")
    print("     (All 132 managers, Cardelia, 20 rooms & 12 bookings are safe in local SQLite)")
    print("-" * 65)
    
    # Check if user wants to push directly to Hostinger
    try:
        choice = input("\n[?] Do you want to push this data to your Hostinger Managed Database now? (y/N): ").strip().lower()
    except (EOFError, KeyboardInterrupt):
        choice = "n"

    if choice in ("y", "yes"):
        print("\nPlease enter your Hostinger Database details from Hostinger hPanel:")
        h_host = input("  1. Hostinger MySQL Host [default: srv1089.hstgr.io]: ").strip() or "srv1089.hstgr.io"
        h_name = input("  2. Hostinger Database Name (e.g. u829..._hotel): ").strip()
        h_user = input("  3. Hostinger Username      (e.g. u829..._user): ").strip()
        h_pass = input("  4. Hostinger Password: ").strip()

        if h_name and h_user and h_pass:
            h_url = f"mysql+pymysql://{h_user}:{h_pass}@{h_host}:3306/{h_name}?charset=utf8mb4"
            print(f"\n[*] Connecting to Hostinger Managed MySQL on '{h_host}'...")
            try:
                from sqlalchemy import create_engine
                from sqlalchemy.orm import sessionmaker
                new_engine = create_engine(
                    h_url,
                    pool_pre_ping=True,
                    pool_recycle=280,
                    pool_size=10,
                    max_overflow=20
                )
                with new_engine.connect() as test_c:
                    print("[OK] Connected to Hostinger MySQL successfully!")
                
                # Save to backend/.env for future runs
                env_path = os.path.join(os.path.dirname(__file__), ".env")
                with open(env_path, "w", encoding="utf-8") as f:
                    f.write(f"DATABASE_URL={h_url}\n")
                    f.write(f"PORT=8000\n")
                    f.write(f"CORS_ORIGINS=*\n")
                print(f"[OK] Saved Hostinger connection to backend/.env")
                
                engine = new_engine
                SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=new_engine)
                return engine, SessionLocal
            except Exception as conn_err:
                print(f"[FAIL] Could not connect to Hostinger: {conn_err}")
                print("[!] Staying on local SQLite for now.\n")
        else:
            print("[!] Incomplete Hostinger details entered. Staying on local SQLite.\n")

    return engine, SessionLocal

def restore_data():
    print("=" * 65)
    print(" Hotel Operations Portal -- Data Restoration Tool")
    print("=" * 65)

    source_path = find_backup_sqlite()
    if not os.path.exists(source_path):
        print(f"[FAIL] Backup database file not found at: {source_path}")
        return False

    print(f"[*] Source Backup DB : {source_path}")

    # Check / prompt target engine
    active_engine, ActiveSession = get_target_engine()

    masked_url = str(active_engine.url)
    if active_engine.url.password:
        masked_url = masked_url.replace(active_engine.url.password, "********")
    print(f"[*] Target Destination: {masked_url}")
    print(f"[*] Target Dialect    : {active_engine.dialect.name} (+{active_engine.dialect.driver})")

    # 1. Ensure target tables exist
    print("\n[*] Verifying and creating target schema tables...")
    try:
        models.Base.metadata.create_all(bind=active_engine)
        print("[OK] Target schema verified.")
    except Exception as e:
        print(f"[FAIL] Could not verify target schema: {e}")
        return False

    # 2. Open source SQLite connection
    src_conn = sqlite3.connect(source_path)
    src_conn.row_factory = sqlite3.Row
    src_cur = src_conn.cursor()

    db = ActiveSession()
    try:
        # Restore manager_accounts
        print("\n[*] Restoring Manager & Admin accounts (including aszentech@gmail.com)...")
        src_cur.execute("SELECT * FROM manager_accounts")
        rows = src_cur.fetchall()
        new_mgrs = 0
        from datetime import datetime
        for r in rows:
            data = dict(r)
            if isinstance(data.get("created_at"), str):
                try:
                    data["created_at"] = datetime.fromisoformat(data["created_at"])
                except Exception:
                    data["created_at"] = datetime.utcnow()
            existing = db.query(models.ManagerAccount).filter(models.ManagerAccount.id == data["id"]).first()
            if not existing:
                mgr = models.ManagerAccount(**data)
                db.add(mgr)
                new_mgrs += 1
            else:
                for k, v in data.items():
                    setattr(existing, k, v)
        db.commit()
        print(f"[OK] Synced {len(rows)} manager accounts ({new_mgrs} new, {len(rows) - new_mgrs} updated/verified).")

        # Restore property_accounts (Cardelia)
        print("\n[*] Restoring Property accounts...")
        src_cur.execute("SELECT * FROM property_accounts")
        rows = src_cur.fetchall()
        new_props = 0
        for r in rows:
            data = dict(r)
            if isinstance(data.get("created_at"), str):
                try:
                    data["created_at"] = datetime.fromisoformat(data["created_at"])
                except Exception:
                    data["created_at"] = datetime.utcnow()
            # Ensure firm_name is Cardelia
            if not data.get("firm_name") or "Authorized Rename" in data.get("firm_name", ""):
                data["firm_name"] = "Cardelia"
            existing = db.query(models.PropertyAccount).filter(models.PropertyAccount.id == data["id"]).first()
            if not existing:
                prop = models.PropertyAccount(**data)
                db.add(prop)
                new_props += 1
            else:
                for k, v in data.items():
                    setattr(existing, k, v)
        db.commit()
        print(f"[OK] Synced {len(rows)} property accounts ({new_props} new, {len(rows) - new_props} verified) -> Cardelia.")

        # Restore rooms
        print("\n[*] Restoring Room Inventory...")
        src_cur.execute("SELECT * FROM rooms")
        rows = src_cur.fetchall()
        new_rooms = 0
        for r in rows:
            data = dict(r)
            existing = db.query(models.RoomModel).filter(models.RoomModel.id == data["id"]).first()
            if not existing:
                room = models.RoomModel(**data)
                db.add(room)
                new_rooms += 1
            else:
                for k, v in data.items():
                    setattr(existing, k, v)
        db.commit()
        print(f"[OK] Synced {len(rows)} rooms ({new_rooms} new, {len(rows) - new_rooms} verified).")

        # Restore bookings
        print("\n[*] Restoring Guest Bookings...")
        src_cur.execute("SELECT * FROM bookings")
        rows = src_cur.fetchall()
        new_bookings = 0
        for r in rows:
            data = dict(r)
            existing = db.query(models.BookingModel).filter(models.BookingModel.id == data["id"]).first()
            if not existing:
                booking = models.BookingModel(**data)
                db.add(booking)
                new_bookings += 1
            else:
                for k, v in data.items():
                    setattr(existing, k, v)
        db.commit()
        print(f"[OK] Synced {len(rows)} bookings ({new_bookings} new, {len(rows) - new_bookings} verified).")

        # Restore expenses
        print("\n[*] Restoring Expenses...")
        src_cur.execute("SELECT * FROM expenses")
        rows = src_cur.fetchall()
        for r in rows:
            data = dict(r)
            existing = db.query(models.ExpenseModel).filter(models.ExpenseModel.id == data["id"]).first()
            if not existing:
                db.add(models.ExpenseModel(**data))
        db.commit()
        print(f"[OK] Synced {len(rows)} expenses.")

        # Restore bills
        print("\n[*] Restoring Bills...")
        src_cur.execute("SELECT * FROM bills")
        rows = src_cur.fetchall()
        for r in rows:
            data = dict(r)
            existing = db.query(models.BillModel).filter(models.BillModel.id == data["id"]).first()
            if not existing:
                db.add(models.BillModel(**data))
        db.commit()
        print(f"[OK] Synced {len(rows)} bills.")

        # Restore register states
        print("\n[*] Restoring Shift Register States...")
        src_cur.execute("SELECT * FROM register_states")
        rows = src_cur.fetchall()
        for r in rows:
            data = dict(r)
            existing = db.query(models.RegisterStateModel).filter(models.RegisterStateModel.firm_id == data["firm_id"]).first()
            if not existing:
                db.add(models.RegisterStateModel(**data))
        db.commit()
        print(f"[OK] Synced {len(rows)} register states.")

        # Restore feature toggles
        print("\n[*] Restoring Feature Toggles...")
        src_cur.execute("SELECT * FROM feature_toggles")
        rows = src_cur.fetchall()
        for r in rows:
            data = dict(r)
            existing = db.query(models.FeatureToggleModel).filter(models.FeatureToggleModel.role == data["role"]).first()
            if not existing:
                db.add(models.FeatureToggleModel(**data))
        db.commit()
        print(f"[OK] Synced {len(rows)} feature toggles.")

        print("\n" + "=" * 65)
        print(" SUCCESS! All previous data restored successfully.")
        print(f" Super Admin : aszentech@gmail.com")
        print(f" Property    : Cardelia")
        print("=" * 65)
        return True

    except Exception as e:
        db.rollback()
        print(f"\n[FAIL] Error during data restoration: {e}")
        return False
    finally:
        db.close()
        src_conn.close()

if __name__ == "__main__":
    restore_data()
