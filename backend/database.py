from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

import os

default_db_file = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "hotel_booking.db"))
if not os.path.exists(default_db_file):
    default_db_file = os.path.abspath(os.path.join(os.path.dirname(__file__), "hotel_booking.db"))

env_db_url = os.getenv("DATABASE_URL")
if not env_db_url or env_db_url == "sqlite:///./hotel_booking.db":
    SQLALCHEMY_DATABASE_URL = f"sqlite:///{default_db_file.replace(os.sep, '/')}"
else:
    SQLALCHEMY_DATABASE_URL = env_db_url

if SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgres://", "postgresql://", 1)

connect_args = {"check_same_thread": False} if SQLALCHEMY_DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args=connect_args)

from sqlalchemy import event
if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.execute("PRAGMA busy_timeout=10000")
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
