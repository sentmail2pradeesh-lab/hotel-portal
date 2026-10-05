import os
import sys

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PARENT_DIR = os.path.dirname(BASE_DIR)
for path_dir in (BASE_DIR, PARENT_DIR):
    if path_dir not in sys.path:
        sys.path.insert(0, path_dir)

try:
    import pymysql
    pymysql.install_as_MySQLdb()
except Exception:
    pass

from sqlalchemy import create_engine
try:
    from sqlalchemy.orm import declarative_base
except ImportError:
    from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

default_db_file = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "hotel_booking.db"))
if not os.path.exists(default_db_file):
    default_db_file = os.path.abspath(os.path.join(os.path.dirname(__file__), "hotel_booking.db"))

# Check for explicit DATABASE_URL or individual Hostinger environment variables
env_db_url = os.getenv("DATABASE_URL")
if not env_db_url and os.getenv("HOSTINGER_DB_HOST"):
    h_user = os.getenv("HOSTINGER_DB_USER", "")
    h_pass = os.getenv("HOSTINGER_DB_PASSWORD", "")
    h_host = os.getenv("HOSTINGER_DB_HOST", "")
    h_port = os.getenv("HOSTINGER_DB_PORT", "3306")
    h_name = os.getenv("HOSTINGER_DB_NAME", "")
    env_db_url = f"mysql+pymysql://{h_user}:{h_pass}@{h_host}:{h_port}/{h_name}?charset=utf8mb4"

if not env_db_url or env_db_url == "sqlite:///./hotel_booking.db":
    SQLALCHEMY_DATABASE_URL = f"sqlite:///{default_db_file.replace(os.sep, '/')}"
else:
    SQLALCHEMY_DATABASE_URL = env_db_url

# Normalize PostgreSQL driver URLs
if SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgres://", "postgresql+psycopg2://", 1)
elif SQLALCHEMY_DATABASE_URL.startswith("postgresql://") and not SQLALCHEMY_DATABASE_URL.startswith("postgresql+"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)

# Normalize Hostinger MySQL / MariaDB driver URLs
elif SQLALCHEMY_DATABASE_URL.startswith("mysql://"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("mysql://", "mysql+pymysql://", 1)
    if "charset=" not in SQLALCHEMY_DATABASE_URL:
        separator = "&" if "?" in SQLALCHEMY_DATABASE_URL else "?"
        SQLALCHEMY_DATABASE_URL = f"{SQLALCHEMY_DATABASE_URL}{separator}charset=utf8mb4"
elif SQLALCHEMY_DATABASE_URL.startswith("mariadb://"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("mariadb://", "mysql+pymysql://", 1)
    if "charset=" not in SQLALCHEMY_DATABASE_URL:
        separator = "&" if "?" in SQLALCHEMY_DATABASE_URL else "?"
        SQLALCHEMY_DATABASE_URL = f"{SQLALCHEMY_DATABASE_URL}{separator}charset=utf8mb4"

# Connection arguments and pooling configurations
is_sqlite = SQLALCHEMY_DATABASE_URL.startswith("sqlite")

if is_sqlite:
    connect_args = {"check_same_thread": False}
    engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args=connect_args)
else:
    # Managed Hostinger MySQL / PostgreSQL configuration:
    # pool_pre_ping automatically checks connection liveness and reconnects on timeout
    # pool_recycle recycles connections before Hostinger terminates idle sockets
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        pool_pre_ping=True,
        pool_recycle=280,
        pool_size=10,
        max_overflow=20
    )
    # Test connection on startup with safe fallback to prevent container crash loops
    try:
        with engine.connect() as test_conn:
            pass
        masked_host = engine.url.host or "unknown"
        print(f"[DATABASE] Successfully connected to remote database on '{masked_host}'.", flush=True)
    except Exception as remote_err:
        print(f"[DATABASE WARNING] Failed to connect to remote database ({engine.url.render_as_string(hide_password=True)}): {remote_err}", flush=True)
        print("[DATABASE NOTICE] Hostinger MySQL host is unreachable or misconfigured. Falling back to local SQLite so your server remains online. Please verify your Hostinger MySQL Host and Remote MySQL IP access!", flush=True)
        SQLALCHEMY_DATABASE_URL = f"sqlite:///{default_db_file.replace(os.sep, '/')}"
        is_sqlite = True
        connect_args = {"check_same_thread": False}
        engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args=connect_args)

from sqlalchemy import event
if is_sqlite:
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
