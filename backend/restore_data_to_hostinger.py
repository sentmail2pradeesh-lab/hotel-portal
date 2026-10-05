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

def restore_data():
    print("=" * 65)
    print(" Hotel Operations Portal -- Data Restoration Tool")
    print("=" * 65)

    source_path = find_backup_sqlite()
    if not os.path.exists(source_path):
        print(f"[FAIL] Backup database file not found at: {source_path}")
        return False

    print(f"[*] Source Backup DB : {source_path}")
    masked_url = str(engine.url)
    if engine.url.password:
        masked_url = masked_url.replace(engine.url.password, "********")
    print(f"[*] Target Destination: {masked_url}")
    print(f"[*] Target Dialect    : {engine.dialect.name} (+{engine.dialect.driver})")

    # 1. Ensure target tables exist
    print("\n[*] Verifying and creating target schema tables...")
    try:
        models.Base.metadata.create_all(bind=engine)
        print("[OK] Target schema verified.")
    except Exception as e:
        print(f"[FAIL] Could not verify target schema: {e}")
        return False

    # 2. Open source SQLite connection
    src_conn = sqlite3.connect(source_path)
    src_conn.row_factory = sqlite3.Row
    src_cur = src_conn.cursor()

    db = SessionLocal()
    try:
        # Restore manager_accounts
        print("\n[*] Restoring Manager & Admin accounts (including aszentech@gmail.com)...")
        src_cur.execute("SELECT * FROM manager_accounts")
        rows = src_cur.fetchall()
        mgr_count = 0
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
                mgr_count += 1
            else:
                for k, v in data.items():
                    setattr(existing, k, v)
        db.commit()
        print(f"[OK] Restored {mgr_count} manager accounts.")

        # Restore property_accounts (Cardelia)
        print("\n[*] Restoring Property accounts...")
        src_cur.execute("SELECT * FROM property_accounts")
        rows = src_cur.fetchall()
        prop_count = 0
        for r in rows:
            data = dict(r)
            if isinstance(data.get("created_at"), str):
                try:
                    data["created_at"] = datetime.fromisoformat(data["created_at"])
                except Exception:
                    data["created_at"] = datetime.utcnow()
            # If firm_name was a test name, set to Cardelia
            if "Authorized Rename" in data.get("firm_name", ""):
                data["firm_name"] = "Cardelia"
            existing = db.query(models.PropertyAccount).filter(models.PropertyAccount.id == data["id"]).first()
            if not existing:
                prop = models.PropertyAccount(**data)
                db.add(prop)
                prop_count += 1
            else:
                for k, v in data.items():
                    setattr(existing, k, v)
        db.commit()
        print(f"[OK] Restored {prop_count} property accounts (Cardelia).")

        # Restore rooms
        print("\n[*] Restoring Room Inventory...")
        src_cur.execute("SELECT * FROM rooms")
        rows = src_cur.fetchall()
        room_count = 0
        for r in rows:
            data = dict(r)
            existing = db.query(models.RoomModel).filter(models.RoomModel.id == data["id"]).first()
            if not existing:
                room = models.RoomModel(**data)
                db.add(room)
                room_count += 1
            else:
                for k, v in data.items():
                    setattr(existing, k, v)
        db.commit()
        print(f"[OK] Restored {room_count} rooms.")

        # Restore bookings
        print("\n[*] Restoring Guest Bookings...")
        src_cur.execute("SELECT * FROM bookings")
        rows = src_cur.fetchall()
        booking_count = 0
        for r in rows:
            data = dict(r)
            existing = db.query(models.BookingModel).filter(models.BookingModel.id == data["id"]).first()
            if not existing:
                booking = models.BookingModel(**data)
                db.add(booking)
                booking_count += 1
            else:
                for k, v in data.items():
                    setattr(existing, k, v)
        db.commit()
        print(f"[OK] Restored {booking_count} bookings.")

        # Restore expenses
        print("\n[*] Restoring Expenses...")
        src_cur.execute("SELECT * FROM expenses")
        rows = src_cur.fetchall()
        exp_count = 0
        for r in rows:
            data = dict(r)
            existing = db.query(models.ExpenseModel).filter(models.ExpenseModel.id == data["id"]).first()
            if not existing:
                db.add(models.ExpenseModel(**data))
                exp_count += 1
        db.commit()
        print(f"[OK] Restored {exp_count} expenses.")

        # Restore bills
        print("\n[*] Restoring Bills...")
        src_cur.execute("SELECT * FROM bills")
        rows = src_cur.fetchall()
        bill_count = 0
        for r in rows:
            data = dict(r)
            existing = db.query(models.BillModel).filter(models.BillModel.id == data["id"]).first()
            if not existing:
                db.add(models.BillModel(**data))
                bill_count += 1
        db.commit()
        print(f"[OK] Restored {bill_count} bills.")

        # Restore register states
        print("\n[*] Restoring Shift Register States...")
        src_cur.execute("SELECT * FROM register_states")
        rows = src_cur.fetchall()
        reg_count = 0
        for r in rows:
            data = dict(r)
            existing = db.query(models.RegisterStateModel).filter(models.RegisterStateModel.firm_id == data["firm_id"]).first()
            if not existing:
                db.add(models.RegisterStateModel(**data))
                reg_count += 1
        db.commit()
        print(f"[OK] Restored {reg_count} register states.")

        # Restore feature toggles
        print("\n[*] Restoring Feature Toggles...")
        src_cur.execute("SELECT * FROM feature_toggles")
        rows = src_cur.fetchall()
        toggle_count = 0
        for r in rows:
            data = dict(r)
            existing = db.query(models.FeatureToggleModel).filter(models.FeatureToggleModel.role == data["role"]).first()
            if not existing:
                db.add(models.FeatureToggleModel(**data))
                toggle_count += 1
        db.commit()
        print(f"[OK] Restored {toggle_count} feature toggles.")

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
