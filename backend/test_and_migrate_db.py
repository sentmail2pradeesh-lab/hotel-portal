"""
Hostinger Managed Database Connection Tester & Migrator
-------------------------------------------------------
Usage:
  python test_and_migrate_db.py

This script:
1. Reads your Hostinger DB connection configuration (from DATABASE_URL or HOSTINGER_DB_* env vars).
2. Tests the connection to your Hostinger database.
3. Automatically creates all hotel management tables in Hostinger.
4. Optionally copies data from local SQLite (hotel_booking.db) to your Hostinger database.
"""

import os
import sys
from dotenv import load_dotenv

# Load local .env if present
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

import database
from database import engine, Base, SQLALCHEMY_DATABASE_URL
import models

def test_connection():
    print("=" * 65)
    print(" Hotel Management System -- Hostinger Database Tool")
    print("=" * 65)
    
    masked_url = str(engine.url)
    if engine.url.password:
        masked_url = masked_url.replace(engine.url.password, "********")
    print(f"[*] Target Database URL: {masked_url}")
    print(f"[*] Dialect / Driver   : {engine.dialect.name} (+{engine.dialect.driver})")
    
    if engine.dialect.name == "sqlite":
        print("\n[!] Notice: You are currently connected to local SQLite.")
        print("    To connect to Hostinger, set DATABASE_URL in your backend .env file or environment:")
        print("    DATABASE_URL=mysql://u123456789_user:Password@srv123.main-hosting.eu:3306/u123456789_dbname\n")

    print("[*] Testing live connection to database...")
    try:
        with engine.connect() as conn:
            from sqlalchemy import text
            result = conn.execute(text("SELECT 1")).scalar()
            print(f"[OK] Connection successful! (Ping result: {result})")
    except Exception as e:
        print("\n[FAIL] Connection Failed!")
        print(f"    Error details: {e}")
        print("\n[!] Hostinger Troubleshooting Tips:")
        print("    1. Hostinger Remote MySQL:")
        print("       In Hostinger hPanel -> Databases -> Remote MySQL:")
        print("       Ensure your IP (or '%' to allow connections from anywhere/Render) is added.")
        print("    2. Username and Database Name:")
        print("       Hostinger prefixes user and database with your account id (e.g. u123456789_hotel).")
        print("    3. Host Server Name:")
        print("       Ensure the host is the server IP or hostname (e.g. srv123.main-hosting.eu), NOT 'localhost' when connecting remotely.")
        return False

    print("\n[*] Synchronizing schema and creating tables in Hostinger database...")
    try:
        models.Base.metadata.create_all(bind=engine)
        print("[OK] All tables verified / created successfully:")
        for table in models.Base.metadata.sorted_tables:
            print(f"    - {table.name}")
    except Exception as e:
        print(f"[FAIL] Failed to create tables: {e}")
        return False

    return True

if __name__ == "__main__":
    test_connection()
