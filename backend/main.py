import os
import json
import uuid
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, Depends, HTTPException, status, Header, Request, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session
import jwt
import bcrypt
from passlib.context import CryptContext

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

try:
    from backend.database import engine, Base, get_db, SessionLocal
    from backend.models import (
        ManagerAccount, PropertyAccount, RoomModel, BookingModel,
        ExpenseModel, BillModel, RegisterStateModel, InvitationModel,
        FeatureToggleModel
    )
    from backend.schemas import (
        ManagerRegisterRequest, ManagerLoginRequest, ManagerResponse,
        PropertyCreateRequest, PropertyResponse,
        RegisterRequest, LoginRequest, UserProfileResponse, ProfileUpdateRequest,
        BookingCreate, BookingUpdate, BookingResponse, AllotRoomRequest, EarlyCheckoutRequest,
        BulkImportRequest, BulkImportResponse,
        ExpenseCreate, ExpenseResponse,
        BillCreate, BillUpdate, BillResponse,
        RoomCreate, RoomUpdate, BulkRoomsCreate, RoomDetailResponse, RegisterStateResponse,
        InvitationCreateRequest, InvitationResponse, AcceptInvitationRequest,
        ManagerCreateRequest, ChangePasswordRequest, FeatureToggleRequest
    )
except ModuleNotFoundError:
    from database import engine, Base, get_db, SessionLocal
    from models import (
        ManagerAccount, PropertyAccount, RoomModel, BookingModel,
        ExpenseModel, BillModel, RegisterStateModel, InvitationModel,
        FeatureToggleModel
    )
    from schemas import (
        ManagerRegisterRequest, ManagerLoginRequest, ManagerResponse,
        PropertyCreateRequest, PropertyResponse,
        RegisterRequest, LoginRequest, UserProfileResponse, ProfileUpdateRequest,
        BookingCreate, BookingUpdate, BookingResponse, AllotRoomRequest, EarlyCheckoutRequest,
        BulkImportRequest, BulkImportResponse,
        ExpenseCreate, ExpenseResponse,
        BillCreate, BillUpdate, BillResponse,
        RoomCreate, RoomUpdate, BulkRoomsCreate, RoomDetailResponse, RegisterStateResponse,
        InvitationCreateRequest, InvitationResponse, AcceptInvitationRequest,
        ManagerCreateRequest, ChangePasswordRequest, FeatureToggleRequest
    )

# Initialize database tables
Base.metadata.create_all(bind=engine)

# Auto-migrate missing columns on existing tables
DEFAULT_ADMIN_FEATURES = {
    "bookings": True,
    "expenses": True,
    "bills": True,
    "guest_ids": True,
    "reports": True,
    "edit_rooms": True,
    "shift_register": True
}

DEFAULT_MANAGER_FEATURES = {
    "bookings": True,
    "guest_ids": True,
    "expenses": False,
    "bills": False,
    "reports": False,
    "edit_rooms": False,
    "shift_register": False
}

if engine.name == "sqlite":
    try:
        with engine.connect() as conn:
            # Property accounts
            res = conn.execute(text("PRAGMA table_info(property_accounts)")).fetchall()
            cols = [r[1] for r in res]
            if "manager_id" not in cols:
                conn.execute(text("ALTER TABLE property_accounts ADD COLUMN manager_id VARCHAR"))
                conn.commit()
            if "property_code" not in cols:
                conn.execute(text("ALTER TABLE property_accounts ADD COLUMN property_code VARCHAR"))
                conn.commit()
            if "address" not in cols:
                conn.execute(text("ALTER TABLE property_accounts ADD COLUMN address TEXT"))
                conn.commit()
            if "phone" not in cols:
                conn.execute(text("ALTER TABLE property_accounts ADD COLUMN phone VARCHAR"))
                conn.commit()
            if "owner_name" not in cols:
                conn.execute(text("ALTER TABLE property_accounts ADD COLUMN owner_name VARCHAR"))
                conn.commit()
            if "owner_phone" not in cols:
                conn.execute(text("ALTER TABLE property_accounts ADD COLUMN owner_phone VARCHAR"))
                conn.commit()
            if "tneb_number" not in cols:
                conn.execute(text("ALTER TABLE property_accounts ADD COLUMN tneb_number VARCHAR"))
                conn.commit()

            # Manager accounts
            m_res = conn.execute(text("PRAGMA table_info(manager_accounts)")).fetchall()
            m_cols = [r[1] for r in m_res]
            if "temp_password_hash" not in m_cols:
                conn.execute(text("ALTER TABLE manager_accounts ADD COLUMN temp_password_hash VARCHAR"))
                conn.commit()
            if "temp_password_plain" not in m_cols:
                conn.execute(text("ALTER TABLE manager_accounts ADD COLUMN temp_password_plain VARCHAR"))
                conn.commit()
            if "created_by" not in m_cols:
                conn.execute(text("ALTER TABLE manager_accounts ADD COLUMN created_by VARCHAR"))
                conn.commit()
            if "phone" not in m_cols:
                conn.execute(text("ALTER TABLE manager_accounts ADD COLUMN phone VARCHAR"))
                conn.commit()

            # Rooms
            r_res = conn.execute(text("PRAGMA table_info(rooms)")).fetchall()
            r_cols = [r[1] for r in r_res]
            if "room_type" not in r_cols:
                conn.execute(text("ALTER TABLE rooms ADD COLUMN room_type VARCHAR DEFAULT 'Standard'"))
                conn.commit()
            if "is_staff_room" not in r_cols:
                conn.execute(text("ALTER TABLE rooms ADD COLUMN is_staff_room BOOLEAN DEFAULT 0"))
                conn.commit()

            # Bookings
            b_res = conn.execute(text("PRAGMA table_info(bookings)")).fetchall()
            b_cols = [r[1] for r in b_res]
            if "status" not in b_cols:
                conn.execute(text("ALTER TABLE bookings ADD COLUMN status VARCHAR DEFAULT 'Upcoming'"))
                conn.commit()
            if "manual_id" not in b_cols:
                conn.execute(text("ALTER TABLE bookings ADD COLUMN manual_id VARCHAR"))
                conn.commit()
            if "email" not in b_cols:
                conn.execute(text("ALTER TABLE bookings ADD COLUMN email VARCHAR"))
                conn.commit()
            if "is_hidden" not in b_cols:
                conn.execute(text("ALTER TABLE bookings ADD COLUMN is_hidden BOOLEAN DEFAULT 0"))
                conn.commit()
            if "booking_type" not in b_cols:
                conn.execute(text("ALTER TABLE bookings ADD COLUMN booking_type VARCHAR DEFAULT 'Walk-in'"))
                conn.commit()
            if "is_prepaid" not in b_cols:
                conn.execute(text("ALTER TABLE bookings ADD COLUMN is_prepaid BOOLEAN DEFAULT 0"))
                conn.commit()
            if "txn_id" not in b_cols:
                conn.execute(text("ALTER TABLE bookings ADD COLUMN txn_id VARCHAR"))
                conn.commit()
            if "guest_count" not in b_cols:
                conn.execute(text("ALTER TABLE bookings ADD COLUMN guest_count INTEGER DEFAULT 1"))
                conn.commit()
            if "adults" not in b_cols:
                conn.execute(text("ALTER TABLE bookings ADD COLUMN adults INTEGER DEFAULT 1"))
                conn.commit()
            if "children" not in b_cols:
                conn.execute(text("ALTER TABLE bookings ADD COLUMN children INTEGER DEFAULT 0"))
                conn.commit()
            if "is_guaranteed" not in b_cols:
                conn.execute(text("ALTER TABLE bookings ADD COLUMN is_guaranteed BOOLEAN DEFAULT 0"))
                conn.commit()

            # Initialize default feature toggles if empty
            ft_res = conn.execute(text("SELECT COUNT(*) FROM feature_toggles")).scalar()
            if ft_res == 0:
                conn.execute(
                    text("INSERT INTO feature_toggles (role, features_json) VALUES (:r1, :j1), (:r2, :j2)"),
                    {"r1": "Admin", "j1": json.dumps(DEFAULT_ADMIN_FEATURES), "r2": "Manager", "j2": json.dumps(DEFAULT_MANAGER_FEATURES)}
                )
                conn.commit()
    except Exception as e:
        print("Database auto-migration info:", e)
else:
    try:
        with engine.connect() as conn:
            # Property accounts
            conn.execute(text("ALTER TABLE property_accounts ADD COLUMN IF NOT EXISTS manager_id VARCHAR"))
            conn.execute(text("ALTER TABLE property_accounts ADD COLUMN IF NOT EXISTS property_code VARCHAR"))
            conn.execute(text("ALTER TABLE property_accounts ADD COLUMN IF NOT EXISTS address TEXT"))
            conn.execute(text("ALTER TABLE property_accounts ADD COLUMN IF NOT EXISTS phone VARCHAR"))
            conn.execute(text("ALTER TABLE property_accounts ADD COLUMN IF NOT EXISTS owner_name VARCHAR"))
            conn.execute(text("ALTER TABLE property_accounts ADD COLUMN IF NOT EXISTS owner_phone VARCHAR"))
            conn.execute(text("ALTER TABLE property_accounts ADD COLUMN IF NOT EXISTS tneb_number VARCHAR"))
            conn.execute(text("ALTER TABLE property_accounts ADD COLUMN IF NOT EXISTS firm_logo TEXT"))
            conn.execute(text("ALTER TABLE property_accounts ADD COLUMN IF NOT EXISTS e_signature TEXT"))
            conn.execute(text("ALTER TABLE property_accounts ADD COLUMN IF NOT EXISTS session_timeout_minutes INTEGER DEFAULT 15"))
            conn.execute(text("ALTER TABLE property_accounts ADD COLUMN IF NOT EXISTS initials VARCHAR"))

            # Manager accounts
            conn.execute(text("ALTER TABLE manager_accounts ADD COLUMN IF NOT EXISTS temp_password_hash VARCHAR"))
            conn.execute(text("ALTER TABLE manager_accounts ADD COLUMN IF NOT EXISTS temp_password_plain VARCHAR"))
            conn.execute(text("ALTER TABLE manager_accounts ADD COLUMN IF NOT EXISTS created_by VARCHAR"))
            conn.execute(text("ALTER TABLE manager_accounts ADD COLUMN IF NOT EXISTS phone VARCHAR"))

            # Rooms
            conn.execute(text("ALTER TABLE rooms ADD COLUMN IF NOT EXISTS room_type VARCHAR DEFAULT 'Standard'"))
            conn.execute(text("ALTER TABLE rooms ADD COLUMN IF NOT EXISTS is_staff_room BOOLEAN DEFAULT FALSE"))

            # Bookings
            conn.execute(text("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'Upcoming'"))
            conn.execute(text("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS manual_id VARCHAR"))
            conn.execute(text("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS email VARCHAR"))
            conn.execute(text("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE"))
            conn.execute(text("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_type VARCHAR DEFAULT 'Walk-in'"))
            conn.execute(text("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS is_prepaid BOOLEAN DEFAULT FALSE"))
            conn.execute(text("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS txn_id VARCHAR"))
            conn.execute(text("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS guest_count INTEGER DEFAULT 1"))
            conn.execute(text("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS adults INTEGER DEFAULT 1"))
            conn.execute(text("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS children INTEGER DEFAULT 0"))
            conn.execute(text("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS is_guaranteed BOOLEAN DEFAULT FALSE"))
            conn.execute(text("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS notes TEXT"))
            conn.execute(text("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS id_card TEXT"))
            conn.execute(text("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS id_card_name VARCHAR"))
            conn.execute(text("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS created_at VARCHAR"))

            # Initialize default feature toggles if empty
            ft_res = conn.execute(text("SELECT COUNT(*) FROM feature_toggles")).scalar()
            if ft_res == 0:
                conn.execute(
                    text("INSERT INTO feature_toggles (role, features_json) VALUES (:r1, :j1), (:r2, :j2)"),
                    {"r1": "Admin", "j1": json.dumps(DEFAULT_ADMIN_FEATURES), "r2": "Manager", "j2": json.dumps(DEFAULT_MANAGER_FEATURES)}
                )

            conn.commit()
    except Exception as e:
        print("PostgreSQL auto-migration info:", e)

# Self-healing sanitizer for invalid / orphan room assignments
def sanitize_orphan_rooms():
    try:
        with SessionLocal() as db:
            all_bookings = db.query(BookingModel).filter(
                BookingModel.room.isnot(None),
                BookingModel.room != ""
            ).all()
            for b in all_bookings:
                valid_room = db.query(RoomModel).filter(
                    RoomModel.firm_id == b.firm_id,
                    RoomModel.room_number == b.room,
                    RoomModel.is_staff_room == False
                ).first()
                if not valid_room:
                    if b.status in ["In-House", "Checked-In"]:
                        # In-house guest needs a valid real room. Reassign to first available clean non-staff room
                        occupied_rooms = set(
                            ob.room for ob in db.query(BookingModel).filter(
                                BookingModel.firm_id == b.firm_id,
                                BookingModel.status.in_(["In-House", "Checked-In"]),
                                BookingModel.id != b.id
                            ).all() if ob.room
                        )
                        avail = db.query(RoomModel).filter(
                            RoomModel.firm_id == b.firm_id,
                            RoomModel.is_staff_room == False,
                            ~RoomModel.room_number.in_(occupied_rooms)
                        ).first()
                        if avail:
                            print(f"[Sanitizer] Reassigning in-house stay {b.id} ({b.guest_name}) from invalid room '{b.room}' to '{avail.room_number}'")
                            b.room = avail.room_number
                        else:
                            b.room = ""
                    else:
                        print(f"[Sanitizer] Resetting invalid room '{b.room}' on booking {b.id} ({b.guest_name}) to unallocated")
                        b.room = ""
            db.commit()
    except Exception as e:
        print("[Sanitizer] Notice:", e)

sanitize_orphan_rooms()

app = FastAPI(
    title="Hotel Booking & Property Management API",
    description="Multi-tenant Python backend for real-time simultaneous multi-device property management.",
    version="1.0.0"
)

@app.get("/")
def root():
    return {
        "status": "online",
        "service": "Hotel Operations API",
        "docs": "/docs"
    }

# Enable CORS (permissive origin regex so requests from aszenventures.com and localhost are always accepted)
raw_origins = os.getenv("CORS_ORIGINS", "")
allowed_origins = [
    "https://aszenventures.com",
    "https://www.aszenventures.com",
    "http://aszenventures.com",
    "http://www.aszenventures.com",
    "http://localhost:5173",
    "http://localhost:3000",
]

if raw_origins and raw_origins != "*":
    for origin_item in raw_origins.split(","):
        cleaned = origin_item.strip().rstrip("/")
        if cleaned and cleaned not in allowed_origins:
            allowed_origins.append(cleaned)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SECRET_KEY = os.getenv("SECRET_KEY", "hotel_frontdesk_secret_key_change_in_production")
ALGORITHM = "HS256"
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

DEFAULT_ROOMS = [
    '101', '102', '103', '104', '105',
    '201', '202', '203', '204', '205',
    '301', '302', '303', '304', '305',
    '401', '402', '403', '404', '405'
]

def get_initials(name_str: Optional[str]) -> str:
    if not name_str:
        return "PM"
    parts = name_str.strip().split()
    if len(parts) >= 2:
        return (parts[0][0] + parts[1][0]).upper()
    return name_str.strip()[:2].upper()

def hash_password(password: str) -> str:
    pwd_bytes = password.encode('utf-8')[:72]
    salt = bcrypt.gensalt(rounds=10)
    return bcrypt.hashpw(pwd_bytes, salt).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        pwd_bytes = plain_password.encode('utf-8')[:72]
        hash_bytes = hashed_password.encode('utf-8')
        return bcrypt.checkpw(pwd_bytes, hash_bytes)
    except Exception:
        # Fallback for plain text comparison if legacy
        return plain_password == hashed_password

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=7)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_property(
    authorization: Optional[str] = Header(None),
    x_property_id: Optional[str] = Header(None),
    db: Session = Depends(get_db)
) -> PropertyAccount:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authentication token."
        )
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        manager_id: Optional[str] = payload.get("manager_id")
        firm_id: Optional[str] = payload.get("firm_id")
    except Exception:
        raise HTTPException(status_code=401, detail="Could not validate credentials.")

    if manager_id:
        mgr = db.query(ManagerAccount).filter(ManagerAccount.id == manager_id).first()
        is_privileged = mgr and (mgr.role in ["Overall Admin", "Super Admin", "Admin"])
        if x_property_id:
            if is_privileged:
                prop = db.query(PropertyAccount).filter(
                    (PropertyAccount.firm_id == x_property_id) | (PropertyAccount.property_code == x_property_id)
                ).first()
            else:
                prop = db.query(PropertyAccount).filter(
                    ((PropertyAccount.firm_id == x_property_id) | (PropertyAccount.property_code == x_property_id)),
                    PropertyAccount.manager_id == manager_id
                ).first()
            if prop:
                return prop
        # Fallback to first property
        if is_privileged:
            prop = db.query(PropertyAccount).first()
        else:
            prop = db.query(PropertyAccount).filter(PropertyAccount.manager_id == manager_id).first()
        if prop:
            return prop
        raise HTTPException(status_code=404, detail="No properties found under this manager account.")
    elif firm_id:
        prop = db.query(PropertyAccount).filter(PropertyAccount.firm_id == firm_id).first()
        if prop:
            return prop
        raise HTTPException(status_code=404, detail="Property account not found.")

    raise HTTPException(status_code=401, detail="Invalid token payload.")


# --- SYSTEM SETUP & MANAGER AUTH ENDPOINTS ---

@app.get("/api/auth/system-status")
def get_system_status(db: Session = Depends(get_db)):
    admin = db.query(ManagerAccount).filter(ManagerAccount.role.in_(["Overall Admin", "Super Admin"])).first()
    return {
        "isAdminRegistered": bool(admin),
        "adminEmail": admin.email if admin else None
    }


@app.post("/api/auth/admin/register")
def register_overall_admin(req: ManagerRegisterRequest, db: Session = Depends(get_db)):
    existing_admin = db.query(ManagerAccount).filter(ManagerAccount.role.in_(["Overall Admin", "Super Admin"])).first()
    if existing_admin:
        raise HTTPException(status_code=400, detail="Super Admin account has already been registered.")

    clean_name = req.name.strip()
    clean_phone = (req.phone or "").strip()
    clean_email = req.email.strip().lower()
    clean_pass = req.password.strip()

    if not clean_name or not clean_email or not clean_pass:
        raise HTTPException(status_code=400, detail="Please fill out all required admin registration fields.")

    existing_email = db.query(ManagerAccount).filter(ManagerAccount.email.ilike(clean_email)).first()
    if existing_email:
        raise HTTPException(status_code=400, detail=f'Email "{clean_email}" is already registered.')

    mgr_id = f"admin_{int(datetime.utcnow().timestamp())}_{uuid.uuid4().hex[:4]}"
    admin_mgr = ManagerAccount(
        id=mgr_id,
        name=clean_name,
        email=clean_email,
        phone=clean_phone if clean_phone else None,
        password_hash=hash_password(clean_pass),
        role="Super Admin"
    )
    db.add(admin_mgr)
    db.commit()
    db.refresh(admin_mgr)

    token = create_access_token({
        "sub": mgr_id,
        "manager_id": mgr_id,
        "role": admin_mgr.role,
        "email": admin_mgr.email
    })
    return {
        "token": token,
        "manager": {
            "id": admin_mgr.id,
            "name": admin_mgr.name,
            "email": admin_mgr.email,
            "phone": admin_mgr.phone,
            "role": admin_mgr.role,
            "properties": [],
            "activeProperty": None
        }
    }


@app.post("/api/auth/manager/register")
def register_manager(req: ManagerRegisterRequest, db: Session = Depends(get_db)):
    clean_name = req.name.strip()
    clean_email = req.email.strip().lower()
    clean_pass = req.password.strip()

    if not clean_name or not clean_email or not clean_pass:
        raise HTTPException(status_code=400, detail="Please fill out all manager registration fields.")

    existing = db.query(ManagerAccount).filter(ManagerAccount.email.ilike(clean_email)).first()
    if existing:
        raise HTTPException(status_code=400, detail=f'Manager "{clean_email}" is already registered.')

    mgr_id = f"mgr_{int(datetime.utcnow().timestamp())}_{uuid.uuid4().hex[:4]}"
    new_mgr = ManagerAccount(
        id=mgr_id,
        name=clean_name,
        email=clean_email,
        password_hash=hash_password(clean_pass),
        role="Property Manager"
    )
    db.add(new_mgr)
    db.commit()
    db.refresh(new_mgr)

    token = create_access_token({"manager_id": mgr_id})
    return {
        "token": token,
        "manager": {
            "id": new_mgr.id,
            "name": new_mgr.name,
            "email": new_mgr.email,
            "role": new_mgr.role,
            "properties": [],
            "activeProperty": None
        }
    }


@app.post("/api/auth/manager/login")
def login_manager(req: ManagerLoginRequest, db: Session = Depends(get_db)):
    clean_id = req.identity.strip().lower()
    clean_pass = req.password.strip()

    if not clean_id or not clean_pass:
        raise HTTPException(status_code=400, detail="Please enter identity and password.")

    matched = db.query(ManagerAccount).filter(
        (ManagerAccount.email.ilike(clean_id)) |
        (ManagerAccount.name.ilike(clean_id)) |
        (ManagerAccount.phone == clean_id)
    ).first()

    # Fallback check for property account
    if not matched:
        prop_account = db.query(PropertyAccount).filter(
            (PropertyAccount.firm_name.ilike(clean_id)) |
            (PropertyAccount.name.ilike(clean_id)) |
            (PropertyAccount.email.ilike(clean_id))
        ).first()
        if prop_account and verify_password(clean_pass, prop_account.password_hash):
            if not prop_account.manager_id:
                mgr_id = f"mgr_{int(datetime.utcnow().timestamp())}_{uuid.uuid4().hex[:4]}"
                new_mgr = ManagerAccount(
                    id=mgr_id,
                    name=prop_account.name,
                    email=prop_account.email,
                    password_hash=prop_account.password_hash,
                    role="Property Manager"
                )
                db.add(new_mgr)
                prop_account.manager_id = mgr_id
                db.commit()
                matched = new_mgr
            else:
                matched = db.query(ManagerAccount).filter(ManagerAccount.id == prop_account.manager_id).first()

    is_valid_pass = False
    if matched:
        is_valid_pass = verify_password(clean_pass, matched.password_hash) or (
            bool(matched.temp_password_hash) and verify_password(clean_pass, matched.temp_password_hash)
        )

    if not matched or not is_valid_pass:
        raise HTTPException(
            status_code=400,
            detail="Invalid email/username or password."
        )

    is_super = matched.role in ["Overall Admin", "Super Admin"]
    is_admin = matched.role == "Admin"
    if is_super or is_admin:
        props = db.query(PropertyAccount).all()
    else:
        props = db.query(PropertyAccount).filter(PropertyAccount.manager_id == matched.id).all()

    prop_responses = [
        PropertyResponse(
            firmId=p.firm_id,
            propertyCode=p.property_code,
            firmName=p.firm_name,
            name=p.name,
            managerId=p.manager_id,
            ownerName=p.owner_name,
            ownerPhone=p.owner_phone,
            tnebNumber=p.tneb_number,
            email=p.email,
            firmLogo=p.firm_logo,
            eSignature=p.e_signature,
            address=p.address,
            phone=p.phone,
            sessionTimeoutMinutes=p.session_timeout_minutes or 15,
            role=p.role or "Property Manager",
            initials=p.initials or "PM"
        )
        for p in props
    ]

    effective_role = "Super Admin" if is_super else ("Admin" if is_admin else "Manager")
    token = create_access_token({
        "sub": matched.id,
        "manager_id": matched.id,
        "role": effective_role,
        "email": matched.email
    })
    return {
        "token": token,
        "manager": {
            "id": matched.id,
            "name": matched.name,
            "email": matched.email,
            "role": effective_role,
            "properties": prop_responses,
            "activeProperty": prop_responses[0] if prop_responses else None
        }
    }


@app.get("/api/auth/manager/me")
def get_manager_me(
    authorization: Optional[str] = Header(None),
    x_property_id: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authentication token.")
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        manager_id = payload.get("manager_id")
        firm_id = payload.get("firm_id")
    except Exception:
        raise HTTPException(status_code=401, detail="Could not validate credentials.")

    if manager_id:
        mgr = db.query(ManagerAccount).filter(ManagerAccount.id == manager_id).first()
        if not mgr:
            raise HTTPException(status_code=404, detail="Manager account not found.")

        is_super = mgr.role in ["Overall Admin", "Super Admin"]
        is_admin = mgr.role == "Admin"
        if is_super or is_admin:
            props = db.query(PropertyAccount).all()
        else:
            props = db.query(PropertyAccount).filter(PropertyAccount.manager_id == mgr.id).all()

        prop_responses = [
            PropertyResponse(
                firmId=p.firm_id,
                propertyCode=p.property_code,
                firmName=p.firm_name,
                name=p.name,
                managerId=p.manager_id,
                ownerName=p.owner_name,
                ownerPhone=p.owner_phone,
                tnebNumber=p.tneb_number,
                email=p.email,
                firmLogo=p.firm_logo,
                eSignature=p.e_signature,
                address=p.address,
                phone=p.phone,
                sessionTimeoutMinutes=p.session_timeout_minutes or 15,
                role=p.role or "Property Manager",
                initials=p.initials or "PM"
            )
            for p in props
        ]

        active_prop = None
        if x_property_id:
            active_prop = next((p for p in prop_responses if p.firmId == x_property_id), None)
        if not active_prop and prop_responses:
            active_prop = prop_responses[0]

        effective_role = "Super Admin" if is_super else ("Admin" if is_admin else "Manager")
        return {
            "id": mgr.id,
            "name": mgr.name,
            "email": mgr.email,
            "phone": getattr(mgr, "phone", None),
            "role": effective_role,
            "properties": prop_responses,
            "activeProperty": active_prop
        }
    elif firm_id:
        prop = db.query(PropertyAccount).filter(PropertyAccount.firm_id == firm_id).first()
        if not prop:
            raise HTTPException(status_code=404, detail="Property not found.")
        prop_resp = PropertyResponse(
            firmId=prop.firm_id,
            propertyCode=prop.property_code,
            firmName=prop.firm_name,
            name=prop.name,
            managerId=prop.manager_id,
            ownerName=prop.owner_name,
            ownerPhone=prop.owner_phone,
            tnebNumber=prop.tneb_number,
            email=prop.email,
            firmLogo=prop.firm_logo,
            eSignature=prop.e_signature,
            address=prop.address,
            phone=prop.phone,
            sessionTimeoutMinutes=prop.session_timeout_minutes or 15,
            role=prop.role or "Property Manager",
            initials=prop.initials or "PM"
        )
        return {
            "id": f"mgr_{prop.firm_id}",
            "name": prop.name,
            "email": prop.email,
            "role": "Property Manager",
            "properties": [prop_resp],
            "activeProperty": prop_resp
        }
    raise HTTPException(status_code=401, detail="Invalid token payload.")


@app.get("/api/properties", response_model=List[PropertyResponse])
def get_manager_properties(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing authorization token.")
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        manager_id = payload.get("manager_id")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token.")

    if not manager_id:
        raise HTTPException(status_code=401, detail="Manager authorization required.")

    mgr = db.query(ManagerAccount).filter(ManagerAccount.id == manager_id).first()
    if mgr and (mgr.role in ["Overall Admin", "Super Admin"]):
        props = db.query(PropertyAccount).all()
    else:
        props = db.query(PropertyAccount).filter(PropertyAccount.manager_id == manager_id).all()
    return [
        PropertyResponse(
            firmId=p.firm_id,
            propertyCode=p.property_code,
            firmName=p.firm_name,
            name=p.name,
            managerId=p.manager_id,
            ownerName=p.owner_name,
            ownerPhone=p.owner_phone,
            tnebNumber=p.tneb_number,
            email=p.email,
            firmLogo=p.firm_logo,
            eSignature=p.e_signature,
            address=p.address,
            phone=p.phone,
            sessionTimeoutMinutes=p.session_timeout_minutes or 15,
            role=p.role or "Property Manager",
            initials=p.initials or "PM"
        )
        for p in props
    ]


@app.post("/api/properties", response_model=PropertyResponse)
def create_property(
    req: PropertyCreateRequest,
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing authorization token.")
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        manager_id = payload.get("manager_id")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token.")

    mgr = db.query(ManagerAccount).filter(ManagerAccount.id == manager_id).first() if manager_id else None
    if not mgr:
        raise HTTPException(status_code=401, detail="Manager account not found.")

    if mgr.role not in ["Overall Admin", "Super Admin"]:
        raise HTTPException(status_code=403, detail="Only Super Admin is authorized to create properties. Admin accounts cannot create properties.")

    clean_code = (req.propertyCode or "").strip().upper()
    clean_firm = (req.firmName or "").strip()
    if not clean_code and not clean_firm:
        raise HTTPException(status_code=400, detail="Property code or name is required.")

    if not clean_code:
        words = clean_firm.split()
        prefix = "".join(w[0] for w in words if w.isalnum())[:4].upper() or "PR"
        clean_code = f"{prefix}-{uuid.uuid4().hex[:4].upper()}"

    if not clean_firm:
        clean_firm = clean_code

    # Assigned manager resolution
    assigned_mgr_id = None
    assigned_mgr_name = mgr.name
    if req.managerId and req.managerId.strip():
        target_mgr = db.query(ManagerAccount).filter(ManagerAccount.id == req.managerId.strip()).first()
        if target_mgr:
            assigned_mgr_id = target_mgr.id
            assigned_mgr_name = target_mgr.name
    elif req.managerName and req.managerName.strip():
        assigned_mgr_name = req.managerName.strip()
    else:
        assigned_mgr_id = mgr.id
        assigned_mgr_name = mgr.name

    owner_name = req.ownerName.strip() if req.ownerName and req.ownerName.strip() else None
    owner_phone = req.ownerPhone.strip() if req.ownerPhone and req.ownerPhone.strip() else None
    tneb_number = req.tnebNumber.strip() if req.tnebNumber and req.tnebNumber.strip() else None

    firm_id = f"firm_{int(datetime.utcnow().timestamp())}_{uuid.uuid4().hex[:4]}"
    parts = assigned_mgr_name.split(" ")
    initials = (parts[0][0] + parts[1][0]).upper() if len(parts) >= 2 else assigned_mgr_name[:2].upper()
    email_val = req.email.strip().lower() if req.email and req.email.strip() else f"{clean_firm.lower().replace(' ', '')}_{uuid.uuid4().hex[:4]}@property.com"
    address_val = req.address.strip() if req.address and req.address.strip() else None
    phone_val = req.phone.strip() if req.phone and req.phone.strip() else None

    new_prop = PropertyAccount(
        manager_id=assigned_mgr_id,
        property_code=clean_code,
        firm_id=firm_id,
        firm_name=clean_firm,
        name=assigned_mgr_name,
        owner_name=owner_name,
        owner_phone=owner_phone,
        tneb_number=tneb_number,
        email=email_val,
        address=address_val,
        phone=phone_val,
        password_hash=mgr.password_hash,
        firm_logo=req.firmLogo,
        e_signature=req.eSignature,
        initials=initials,
        session_timeout_minutes=15
    )
    db.add(new_prop)

    # Initialize rooms for the new property (bulk custom rooms or defaults)
    if req.initialRooms is not None and len(req.initialRooms) > 0:
        seen_nums = set()
        for rm in req.initialRooms:
            if isinstance(rm, dict):
                r_num = str(rm.get("roomNumber", "")).strip()
                r_type = str(rm.get("roomType", "Standard")).strip() or "Standard"
                r_staff = bool(rm.get("isStaffRoom", False))
            else:
                r_num = str(rm).strip()
                r_type = "Standard"
                r_staff = False
            if r_num and r_num not in seen_nums:
                seen_nums.add(r_num)
                db.add(RoomModel(firm_id=firm_id, room_number=r_num, room_type=r_type, is_staff_room=r_staff))
    elif req.initialRooms is None:
        # None means use DEFAULT_ROOMS; explicit empty list [] means 0 rooms
        for rm in DEFAULT_ROOMS:
            db.add(RoomModel(firm_id=firm_id, room_number=rm))

    # Initialize register state
    db.add(RegisterStateModel(firm_id=firm_id, is_open=True))

    db.commit()
    db.refresh(new_prop)

    return PropertyResponse(
        firmId=new_prop.firm_id,
        propertyCode=new_prop.property_code,
        firmName=new_prop.firm_name,
        name=new_prop.name,
        managerId=new_prop.manager_id,
        ownerName=new_prop.owner_name,
        ownerPhone=new_prop.owner_phone,
        tnebNumber=new_prop.tneb_number,
        email=new_prop.email,
        firmLogo=new_prop.firm_logo,
        eSignature=new_prop.e_signature,
        address=new_prop.address,
        phone=new_prop.phone,
        sessionTimeoutMinutes=new_prop.session_timeout_minutes or 15,
        role=new_prop.role or "Property Manager",
        initials=new_prop.initials or "PM"
    )


@app.delete("/api/properties/{firm_id}")
def delete_property(
    firm_id: str,
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing authorization token.")
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        manager_id = payload.get("manager_id")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token.")

    if not manager_id:
        raise HTTPException(status_code=401, detail="Manager authorization required.")

    mgr = db.query(ManagerAccount).filter(ManagerAccount.id == manager_id).first()
    if not mgr or mgr.role not in ["Overall Admin", "Super Admin"]:
        raise HTTPException(status_code=403, detail="Only Super Admin is authorized to delete properties.")

    prop = db.query(PropertyAccount).filter(PropertyAccount.firm_id == firm_id).first()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found.")

    prop_name = prop.firm_name

    # Cascade delete all related records for this property
    db.query(BookingModel).filter(BookingModel.firm_id == firm_id).delete()
    db.query(RoomModel).filter(RoomModel.firm_id == firm_id).delete()
    db.query(ExpenseModel).filter(ExpenseModel.firm_id == firm_id).delete()
    db.query(BillModel).filter(BillModel.firm_id == firm_id).delete()
    db.query(RegisterStateModel).filter(RegisterStateModel.firm_id == firm_id).delete()
    db.query(InvitationModel).filter(InvitationModel.property_id == firm_id).delete()

    # Delete the property itself
    db.delete(prop)
    db.commit()

    return {"success": True, "message": f"Property '{prop_name}' deleted successfully."}


# --- AUTH ENDPOINTS ---

@app.post("/api/auth/register")
def register_property(req: RegisterRequest, db: Session = Depends(get_db)):
    clean_firm = req.firmName.strip()
    clean_name = req.name.strip()
    clean_email = (req.email or "").strip().lower()
    clean_pass = req.password.strip()

    if not clean_firm or not clean_name or not clean_pass:
        raise HTTPException(status_code=400, detail="Please fill out all registration fields.")

    existing = db.query(PropertyAccount).filter(
        (PropertyAccount.firm_name.ilike(clean_firm)) |
        (PropertyAccount.name.ilike(clean_name)) |
        (PropertyAccount.email.ilike(clean_email) if clean_email else False)
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail=f'Property "{clean_firm}" or Manager "{clean_name}" is already registered.'
        )

    firm_id = f"firm_{int(datetime.utcnow().timestamp())}_{uuid.uuid4().hex[:4]}"
    parts = clean_name.split(" ")
    initials = (parts[0][0] + parts[1][0]).upper() if len(parts) >= 2 else clean_name[:2].upper()

    email_val = clean_email or f"{clean_name.lower().replace(' ', '')}@property.com"

    clean_code = (req.propertyCode or "").strip().upper()
    if not clean_code:
        words = clean_firm.split()
        prefix = "".join(w[0] for w in words if w.isalnum())[:4].upper() or "PR"
        clean_code = f"{prefix}-{uuid.uuid4().hex[:4].upper()}"

    new_account = PropertyAccount(
        firm_id=firm_id,
        property_code=clean_code,
        firm_name=clean_firm,
        name=clean_name,
        email=email_val,
        password_hash=hash_password(clean_pass),
        initials=initials,
        session_timeout_minutes=15
    )
    db.add(new_account)

    # Initialize default rooms for the new property
    for rm in DEFAULT_ROOMS:
        db.add(RoomModel(firm_id=firm_id, room_number=rm))

    # Initialize register state
    db.add(RegisterStateModel(firm_id=firm_id, is_open=True))

    db.commit()
    db.refresh(new_account)

    token = create_access_token({"firm_id": firm_id})
    user_data = UserProfileResponse(
        firmId=new_account.firm_id,
        propertyCode=new_account.property_code,
        firmName=new_account.firm_name,
        name=new_account.name,
        managerId=new_account.manager_id,
        ownerName=new_account.owner_name,
        ownerPhone=new_account.owner_phone,
        tnebNumber=new_account.tneb_number,
        email=new_account.email,
        firmLogo=new_account.firm_logo,
        eSignature=new_account.e_signature,
        sessionTimeoutMinutes=new_account.session_timeout_minutes,
        role=new_account.role,
        initials=new_account.initials,
        loginTime=datetime.now().strftime("%I:%M %p")
    )
    return {"token": token, "user": user_data}


@app.post("/api/auth/login")
def login_property(req: LoginRequest, db: Session = Depends(get_db)):
    clean_id = req.identity.strip().lower()
    clean_pass = req.password.strip()

    if not clean_id or not clean_pass:
        raise HTTPException(status_code=400, detail="Please enter identity and password.")

    matched = db.query(PropertyAccount).filter(
        (PropertyAccount.firm_name.ilike(clean_id)) |
        (PropertyAccount.name.ilike(clean_id)) |
        (PropertyAccount.email.ilike(clean_id))
    ).first()

    if not matched or not verify_password(clean_pass, matched.password_hash):
        raise HTTPException(
            status_code=400,
            detail="Invalid Property Manager credentials or incorrect password."
        )

    token = create_access_token({"firm_id": matched.firm_id})
    user_data = UserProfileResponse(
        firmId=matched.firm_id,
        propertyCode=matched.property_code,
        firmName=matched.firm_name,
        name=matched.name,
        managerId=matched.manager_id,
        ownerName=matched.owner_name,
        ownerPhone=matched.owner_phone,
        tnebNumber=matched.tneb_number,
        email=matched.email,
        firmLogo=matched.firm_logo,
        eSignature=matched.e_signature,
        address=matched.address,
        phone=matched.phone,
        sessionTimeoutMinutes=matched.session_timeout_minutes or 15,
        role=matched.role or "Property Manager",
        initials=matched.initials or "PM",
        loginTime=datetime.now().strftime("%I:%M %p")
    )
    return {"token": token, "user": user_data}


@app.get("/api/auth/me", response_model=UserProfileResponse)
def get_me(current_user: PropertyAccount = Depends(get_current_property)):
    return UserProfileResponse(
        firmId=current_user.firm_id,
        propertyCode=current_user.property_code,
        firmName=current_user.firm_name,
        name=current_user.name,
        managerId=current_user.manager_id,
        ownerName=current_user.owner_name,
        ownerPhone=current_user.owner_phone,
        tnebNumber=current_user.tneb_number,
        email=current_user.email,
        firmLogo=current_user.firm_logo,
        eSignature=current_user.e_signature,
        address=current_user.address,
        phone=current_user.phone,
        sessionTimeoutMinutes=current_user.session_timeout_minutes or 15,
        role=current_user.role or "Property Manager",
        initials=current_user.initials or "PM",
        loginTime=datetime.now().strftime("%I:%M %p")
    )


@app.put("/api/auth/profile", response_model=UserProfileResponse)
def update_profile(
    req: ProfileUpdateRequest,
    authorization: Optional[str] = Header(None),
    current_user: PropertyAccount = Depends(get_current_property),
    db: Session = Depends(get_db)
):
    caller_role = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            manager_id = payload.get("manager_id")
            if manager_id:
                mgr = db.query(ManagerAccount).filter(ManagerAccount.id == manager_id).first()
                if mgr:
                    caller_role = mgr.role
        except Exception:
            pass

    # Property-level changes are restricted strictly to Super Admin
    is_prop_edit = False
    if req.firmName is not None and req.firmName.strip() != (current_user.firm_name or ""):
        is_prop_edit = True
    if req.propertyCode is not None and req.propertyCode.strip().upper() != (current_user.property_code or ""):
        is_prop_edit = True
    if req.firmLogo is not None and req.firmLogo != current_user.firm_logo:
        is_prop_edit = True
    if req.ownerName is not None and req.ownerName.strip() != (current_user.owner_name or ""):
        is_prop_edit = True
    if req.ownerPhone is not None and req.ownerPhone.strip() != (current_user.owner_phone or ""):
        is_prop_edit = True
    if req.tnebNumber is not None and req.tnebNumber.strip() != (current_user.tneb_number or ""):
        is_prop_edit = True

    if is_prop_edit and caller_role not in ["Overall Admin", "Super Admin"]:
        raise HTTPException(
            status_code=403,
            detail="Only Super Admin is authorized to edit property details. Admins and Managers cannot edit properties."
        )

    if req.firmName is not None:
        current_user.firm_name = req.firmName.strip()
    if req.propertyCode is not None:
        current_user.property_code = req.propertyCode.strip().upper()
    if req.ownerName is not None:
        current_user.owner_name = req.ownerName.strip()
    if req.ownerPhone is not None:
        current_user.owner_phone = req.ownerPhone.strip()
    if req.tnebNumber is not None:
        current_user.tneb_number = req.tnebNumber.strip()
    if req.name is not None:
        current_user.name = req.name.strip()
        parts = current_user.name.split(" ")
        current_user.initials = (parts[0][0] + parts[1][0]).upper() if len(parts) >= 2 else current_user.name[:2].upper()
    if req.email is not None:
        current_user.email = req.email.strip().lower()
    if req.firmLogo is not None:
        current_user.firm_logo = req.firmLogo
    if req.eSignature is not None:
        current_user.e_signature = req.eSignature
    if req.address is not None:
        current_user.address = req.address.strip()
    if req.phone is not None:
        current_user.phone = req.phone.strip()
    if req.sessionTimeoutMinutes is not None:
        current_user.session_timeout_minutes = req.sessionTimeoutMinutes

    db.commit()
    db.refresh(current_user)

    return UserProfileResponse(
        firmId=current_user.firm_id,
        propertyCode=current_user.property_code,
        firmName=current_user.firm_name,
        name=current_user.name,
        managerId=current_user.manager_id,
        ownerName=current_user.owner_name,
        ownerPhone=current_user.owner_phone,
        tnebNumber=current_user.tneb_number,
        email=current_user.email,
        firmLogo=current_user.firm_logo,
        eSignature=current_user.e_signature,
        address=current_user.address,
        phone=current_user.phone,
        sessionTimeoutMinutes=current_user.session_timeout_minutes or 15,
        role=current_user.role or "Property Manager",
        initials=current_user.initials or "PM",
        loginTime=datetime.now().strftime("%I:%M %p")
    )


# --- CONSOLIDATED FAST SYNC ENDPOINT ---
@app.get("/api/sync")
def sync_property_data(
    current_user: PropertyAccount = Depends(get_current_property),
    db: Session = Depends(get_db)
):
    # Rooms
    rooms = db.query(RoomModel).filter(RoomModel.firm_id == current_user.firm_id).all()
    if not rooms:
        for rm in DEFAULT_ROOMS:
            db.add(RoomModel(firm_id=current_user.firm_id, room_number=rm, room_type="Standard", is_staff_room=False))
        db.commit()
        rooms = db.query(RoomModel).filter(RoomModel.firm_id == current_user.firm_id).all()
    room_list = sorted([r.room_number for r in rooms], key=lambda x: (x.isdigit(), int(x) if x.isdigit() else x))

    # Bookings: automatically transition expired in-house stays to Completed
    today_str = datetime.now().strftime("%Y-%m-%d")
    bookings = db.query(BookingModel).filter(BookingModel.firm_id == current_user.firm_id).all()
    has_expired_updates = False
    for b in bookings:
        if b.status in ["In-House", "Checked-In"] and b.check_out and b.check_out < today_str:
            b.status = "Completed"
            has_expired_updates = True
    if has_expired_updates:
        db.commit()
    booking_list = [
        BookingResponse(
            id=b.id, manualId=b.manual_id or b.id, guestName=b.guest_name,
            phone=b.phone or "", email=b.email or "", room=b.room if (b.room and b.room.strip()) else None,
            guestCount=b.guest_count or 1,
            adults=b.adults or 1,
            children=b.children or 0,
            checkIn=b.check_in, checkOut=b.check_out, amountPaid=b.amount_paid,
            paidVia=b.paid_via or "Cash", txnId=b.txn_id, notes=b.notes or "", idCard=b.id_card,
            idCardName=b.id_card_name or "ID Photo", status=b.status or "Upcoming",
            bookingType=b.booking_type or "Walk-in",
            isPrepaid=bool(b.is_prepaid),
            isGuaranteed=bool(b.is_guaranteed),
            isHidden=bool(b.is_hidden), createdAt=b.created_at
        ) for b in bookings
    ]

    # Detailed Room Objects with real-time occupancy and availability
    valid_non_staff_rooms = set(r.room_number for r in rooms if not r.is_staff_room)
    active_inhouse_rooms = set(
        b.room for b in bookings 
        if b.status in ["In-House", "Checked-In"] 
        and b.room and b.room.strip() 
        and b.room.strip() in valid_non_staff_rooms
    )
    guaranteed_reserved_rooms = set(
        b.room for b in bookings 
        if (b.is_guaranteed or b.is_prepaid or b.booking_type == "Online Pre-paid") 
        and b.room and b.room.strip()
        and b.room.strip() in valid_non_staff_rooms
        and b.status not in ["Completed", "Checked-Out", "Cancelled"]
    )
    room_details = []
    for r in rooms:
        is_occ = r.room_number in active_inhouse_rooms
        is_staff = bool(r.is_staff_room)
        is_res = (r.room_number in guaranteed_reserved_rooms) and (not is_occ)
        is_avail = (not is_occ) and (not is_staff) and (not is_res)
        room_details.append({
            "roomNumber": r.room_number,
            "roomType": r.room_type or "Standard",
            "isStaffRoom": is_staff,
            "isOccupied": is_occ,
            "isReserved": is_res,
            "isAvailable": is_avail
        })
    room_details.sort(key=lambda x: (x["roomNumber"].isdigit(), int(x["roomNumber"]) if x["roomNumber"].isdigit() else x["roomNumber"]))

    # Expenses
    expenses = db.query(ExpenseModel).filter(ExpenseModel.firm_id == current_user.firm_id).all()
    expense_list = [
        ExpenseResponse(
            id=e.id, date=e.date, category=e.category,
            description=e.description or "", amount=e.amount,
            createdAt=e.created_at
        ) for e in expenses
    ]

    # Bills
    bills = db.query(BillModel).filter(BillModel.firm_id == current_user.firm_id).all()
    bill_list = []
    for b in bills:
        try:
            add_ons_list = json.loads(b.add_ons) if b.add_ons else []
        except Exception:
            add_ons_list = []
        bill_list.append(BillResponse(
            id=b.id, bookingId=b.booking_id, guestName=b.guest_name,
            roomNo=b.room_no, roomCharge=b.room_charge, addOns=add_ons_list,
            total=b.total, date=b.date
        ))

    # Register state
    reg_state = db.query(RegisterStateModel).filter(RegisterStateModel.firm_id == current_user.firm_id).first()
    is_open = reg_state.is_open if reg_state else True

    # Feature Toggles
    toggles = db.query(FeatureToggleModel).all()
    feature_toggles = {}
    for t in toggles:
        try:
            feature_toggles[t.role] = json.loads(t.features_json)
        except Exception:
            feature_toggles[t.role] = {}
    if "Admin" not in feature_toggles:
        feature_toggles["Admin"] = DEFAULT_ADMIN_FEATURES
    if "Manager" not in feature_toggles:
        feature_toggles["Manager"] = DEFAULT_MANAGER_FEATURES

    return {
        "rooms": room_list,
        "roomDetails": room_details,
        "bookings": booking_list,
        "expenses": expense_list,
        "bills": bill_list,
        "registerStatus": {"isOpen": is_open},
        "featureToggles": feature_toggles
    }


# --- ROOMS ENDPOINTS ---

@app.get("/api/rooms", response_model=List[str])
def get_rooms(
    current_user: PropertyAccount = Depends(get_current_property),
    db: Session = Depends(get_db)
):
    rooms = db.query(RoomModel).filter(RoomModel.firm_id == current_user.firm_id).all()
    if not rooms:
        for rm in DEFAULT_ROOMS:
            db.add(RoomModel(firm_id=current_user.firm_id, room_number=rm, room_type="Standard", is_staff_room=False))
        db.commit()
        rooms = db.query(RoomModel).filter(RoomModel.firm_id == current_user.firm_id).all()
    
    room_list = [r.room_number for r in rooms]
    return sorted(room_list, key=lambda x: (x.isdigit(), int(x) if x.isdigit() else x))


@app.get("/api/rooms/available")
def get_available_rooms(
    check_in: Optional[str] = Query(None, alias="checkIn"),
    check_out: Optional[str] = Query(None, alias="checkOut"),
    exclude_booking_id: Optional[str] = Query(None, alias="excludeBookingId"),
    current_user: PropertyAccount = Depends(get_current_property),
    db: Session = Depends(get_db)
):
    rooms = db.query(RoomModel).filter(
        RoomModel.firm_id == current_user.firm_id,
        RoomModel.is_staff_room == False
    ).all()
    all_room_numbers = sorted([r.room_number for r in rooms], key=lambda x: (x.isdigit(), int(x) if x.isdigit() else x))
    
    # Query all active bookings for this property that have a room assigned
    query = db.query(BookingModel).filter(
        BookingModel.firm_id == current_user.firm_id,
        BookingModel.status.in_(["In-House", "Checked-In", "Upcoming", "Confirmed"]),
        BookingModel.room.isnot(None)
    )
    if exclude_booking_id:
        query = query.filter(BookingModel.id != exclude_booking_id)
        
    active_bookings = query.all()
    
    blocked_rooms = set()
    occupied_rooms = set()
    guaranteed_rooms = set()
    
    for b in active_bookings:
        if not b.room or not b.room.strip():
            continue
        clean_rm = b.room.strip()
        has_overlap = True
        if check_in and check_out:
            # Overlap: b.check_in < check_out and b.check_out > check_in
            if not (b.check_in < check_out and b.check_out > check_in):
                has_overlap = False
                
        if has_overlap:
            blocked_rooms.add(clean_rm)
            if b.status in ["In-House", "Checked-In"]:
                occupied_rooms.add(clean_rm)
            elif b.is_guaranteed or b.is_prepaid or b.booking_type == "Online Pre-paid":
                guaranteed_rooms.add(clean_rm)

    available_rooms = [rm for rm in all_room_numbers if rm not in blocked_rooms]
    
    return {
        "availableRooms": available_rooms,
        "occupiedRooms": list(occupied_rooms),
        "guaranteedRooms": list(guaranteed_rooms),
        "totalRooms": len(all_room_numbers),
        "availableCount": len(available_rooms)
    }


@app.post("/api/rooms")
def add_room(
    req: RoomCreate,
    current_user: PropertyAccount = Depends(get_current_property),
    db: Session = Depends(get_db)
):
    clean_num = req.roomNumber.strip()
    if not clean_num:
        raise HTTPException(status_code=400, detail="Room identifier is required.")

    existing = db.query(RoomModel).filter(
        RoomModel.firm_id == current_user.firm_id,
        RoomModel.room_number == clean_num
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail=f"Room {clean_num} already exists in inventory.")

    new_room = RoomModel(
        firm_id=current_user.firm_id,
        room_number=clean_num,
        room_type=req.roomType or "Standard",
        is_staff_room=bool(req.isStaffRoom)
    )
    db.add(new_room)
    db.commit()
    return {"success": True}


@app.post("/api/rooms/bulk")
def add_rooms_bulk(
    req: BulkRoomsCreate,
    current_user: PropertyAccount = Depends(get_current_property),
    db: Session = Depends(get_db)
):
    if not req.rooms or len(req.rooms) == 0:
        raise HTTPException(status_code=400, detail="No rooms provided in request.")

    # Get existing room numbers for this property to avoid duplicates
    existing_rooms = set(
        r[0] for r in db.query(RoomModel.room_number).filter(
            RoomModel.firm_id == current_user.firm_id
        ).all()
    )

    created_rooms = []
    skipped_rooms = []

    for r in req.rooms:
        clean_num = str(r.roomNumber).strip()
        if not clean_num:
            continue
        if clean_num in existing_rooms:
            skipped_rooms.append(clean_num)
            continue

        new_room = RoomModel(
            firm_id=current_user.firm_id,
            room_number=clean_num,
            room_type=r.roomType or "Standard",
            is_staff_room=bool(r.isStaffRoom)
        )
        db.add(new_room)
        existing_rooms.add(clean_num)
        created_rooms.append(clean_num)

    db.commit()
    return {
        "success": True,
        "createdCount": len(created_rooms),
        "createdRooms": created_rooms,
        "skippedCount": len(skipped_rooms),
        "skippedRooms": skipped_rooms
    }


@app.put("/api/rooms/{room_number}")
def update_room(
    room_number: str,
    req: RoomUpdate,
    authorization: Optional[str] = Header(None),
    current_user: PropertyAccount = Depends(get_current_property),
    db: Session = Depends(get_db)
):
    caller_role = "Property"
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            caller_role = payload.get("role", "Property")
        except Exception:
            pass

    if caller_role not in ["Overall Admin", "Super Admin", "Admin"]:
        raise HTTPException(status_code=403, detail="Only Super Admin and Admin can modify room settings.")

    room = db.query(RoomModel).filter(
        RoomModel.firm_id == current_user.firm_id,
        RoomModel.room_number == room_number
    ).first()

    if not room:
        raise HTTPException(status_code=404, detail="Room not found.")

    new_num = req.roomNumber.strip() if req.roomNumber else room_number
    if new_num != room_number:
        exists = db.query(RoomModel).filter(
            RoomModel.firm_id == current_user.firm_id,
            RoomModel.room_number == new_num
        ).first()
        if exists:
            raise HTTPException(status_code=400, detail=f"Room {new_num} already exists in inventory.")

        # Cascade update in active bookings
        db.query(BookingModel).filter(
            BookingModel.firm_id == current_user.firm_id,
            BookingModel.room == room_number
        ).update({"room": new_num}, synchronize_session=False)

        room.room_number = new_num

    if req.roomType is not None:
        room.room_type = req.roomType
    if req.isStaffRoom is not None:
        room.is_staff_room = req.isStaffRoom
        if req.isStaffRoom:
            # If converted to a staff room, unallot any active bookings currently assigned to it
            db.query(BookingModel).filter(
                BookingModel.firm_id == current_user.firm_id,
                BookingModel.room == room.room_number
            ).update({"room": ""}, synchronize_session=False)

    db.commit()
    return {"success": True}


@app.delete("/api/rooms/{room_number}")
def delete_room(
    room_number: str,
    authorization: Optional[str] = Header(None),
    current_user: PropertyAccount = Depends(get_current_property),
    db: Session = Depends(get_db)
):
    caller_role = "Property"
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            caller_role = payload.get("role", "Property")
        except Exception:
            pass

    if caller_role not in ["Overall Admin", "Super Admin", "Admin"]:
        raise HTTPException(status_code=403, detail="Only Super Admin and Admin can delete rooms.")

    room = db.query(RoomModel).filter(
        RoomModel.firm_id == current_user.firm_id,
        RoomModel.room_number == room_number
    ).first()
    if room:
        # Cascade unallot any bookings that had this room
        db.query(BookingModel).filter(
            BookingModel.firm_id == current_user.firm_id,
            BookingModel.room == room_number
        ).update({"room": ""}, synchronize_session=False)
        db.delete(room)
        db.commit()
    return {"success": True}


# --- BOOKINGS ENDPOINTS ---

@app.get("/api/bookings", response_model=List[BookingResponse])
def get_bookings(
    current_user: PropertyAccount = Depends(get_current_property),
    db: Session = Depends(get_db)
):
    today_str = datetime.now().strftime("%Y-%m-%d")
    bookings = db.query(BookingModel).filter(BookingModel.firm_id == current_user.firm_id).all()
    has_expired_updates = False
    for b in bookings:
        if b.status in ["In-House", "Checked-In"] and b.check_out and b.check_out < today_str:
            b.status = "Completed"
            has_expired_updates = True
    if has_expired_updates:
        db.commit()
    res = []
    for b in bookings:
        res.append(BookingResponse(
            id=b.id,
            manualId=b.manual_id or b.id,
            guestName=b.guest_name,
            phone=b.phone or "",
            email=b.email or "",
            room=b.room if (b.room and b.room.strip()) else None,
            guestCount=b.guest_count or 1,
            adults=b.adults or 1,
            children=b.children or 0,
            checkIn=b.check_in,
            checkOut=b.check_out,
            amountPaid=b.amount_paid,
            paidVia=b.paid_via or "Cash",
            txnId=b.txn_id,
            notes=b.notes or "",
            idCard=b.id_card,
            idCardName=b.id_card_name or "ID Photo",
            status=b.status or "Upcoming",
            bookingType=b.booking_type or "Walk-in",
            isPrepaid=bool(b.is_prepaid),
            isGuaranteed=bool(b.is_guaranteed),
            isHidden=bool(b.is_hidden),
            createdAt=b.created_at
        ))
    return res


def generate_next_booking_id(db: Session) -> str:
    all_booking_ids = [b[0] for b in db.query(BookingModel.id).all() if b[0]]
    max_num = 0
    for bid in all_booking_ids:
        if bid.startswith("ASZ-"):
            try:
                num_part = int(bid.replace("ASZ-", ""))
                if num_part > max_num:
                    max_num = num_part
            except ValueError:
                pass
    candidate_num = max_num + 1
    booking_id = f"ASZ-{candidate_num:03d}"
    while db.query(BookingModel).filter(BookingModel.id == booking_id).first():
        candidate_num += 1
        booking_id = f"ASZ-{candidate_num:03d}"
    return booking_id


@app.post("/api/bookings", response_model=BookingResponse)
def create_booking(
    req: BookingCreate,
    current_user: PropertyAccount = Depends(get_current_property),
    db: Session = Depends(get_db)
):
    booking_id = None
    if req.id:
        existing = db.query(BookingModel).filter(BookingModel.id == req.id).first()
        if not existing:
            booking_id = req.id

    if not booking_id:
        booking_id = generate_next_booking_id(db)

    now_iso = datetime.utcnow().isoformat() + "Z"
    effective_booking_type = req.bookingType or ("Online Pre-paid" if req.isPrepaid else "Walk-in")
    effective_is_prepaid = bool(req.isPrepaid or (effective_booking_type == "Online Pre-paid"))
    
    # Guaranteed if prepaid, explicit isGuaranteed, online pre-paid, or digital net/UPI payment made
    effective_is_guaranteed = bool(
        req.isGuaranteed or 
        effective_is_prepaid or 
        (req.paidVia in ["UPI", "Credit Card", "Debit Card", "Net Banking"] and req.amountPaid and req.amountPaid > 0)
    )
    
    adults_cnt = req.adults if (req.adults is not None and req.adults > 0) else 1
    children_cnt = req.children if (req.children is not None and req.children >= 0) else 0
    total_guest_cnt = req.guestCount if (req.guestCount is not None and req.guestCount > 0) else (adults_cnt + children_cnt)

    allocated_room = req.room.strip() if (req.room and req.room.strip()) else ""
    if allocated_room:
        room_rec = db.query(RoomModel).filter(
            RoomModel.firm_id == current_user.firm_id,
            RoomModel.room_number == allocated_room
        ).first()
        if not room_rec:
            raise HTTPException(status_code=400, detail=f"Room suite '{allocated_room}' does not exist in property inventory.")
        if room_rec.is_staff_room:
            raise HTTPException(status_code=400, detail=f"Room '{allocated_room}' is a designated staff room and cannot be assigned to guests.")

    new_b = BookingModel(
        id=booking_id,
        manual_id=req.manualId.strip() if req.manualId else booking_id,
        firm_id=current_user.firm_id,
        guest_name=req.guestName.strip(),
        phone=req.phone,
        email=req.email,
        room=allocated_room,
        guest_count=total_guest_cnt,
        adults=adults_cnt,
        children=children_cnt,
        check_in=req.checkIn,
        check_out=req.checkOut,
        amount_paid=req.amountPaid,
        paid_via=req.paidVia or "Cash",
        txn_id=req.txnId.strip() if req.txnId else None,
        notes=req.notes,
        id_card=req.idCard,
        id_card_name=req.idCardName or "ID Photo",
        status=req.status or "Upcoming",
        booking_type=effective_booking_type,
        is_prepaid=effective_is_prepaid,
        is_guaranteed=effective_is_guaranteed,
        is_hidden=bool(req.isHidden),
        created_at=now_iso
    )
    db.add(new_b)
    db.commit()
    db.refresh(new_b)

    return BookingResponse(
        id=new_b.id,
        manualId=new_b.manual_id or new_b.id,
        guestName=new_b.guest_name,
        phone=new_b.phone or "",
        email=new_b.email or "",
        room=new_b.room if (new_b.room and new_b.room.strip()) else None,
        guestCount=new_b.guest_count or 1,
        adults=new_b.adults or 1,
        children=new_b.children or 0,
        checkIn=new_b.check_in,
        checkOut=new_b.check_out,
        amountPaid=new_b.amount_paid,
        paidVia=new_b.paid_via or "Cash",
        txnId=new_b.txn_id,
        notes=new_b.notes or "",
        idCard=new_b.id_card,
        idCardName=new_b.id_card_name or "ID Photo",
        status=new_b.status or "Upcoming",
        bookingType=new_b.booking_type or "Walk-in",
        isPrepaid=bool(new_b.is_prepaid),
        isGuaranteed=bool(new_b.is_guaranteed),
        isHidden=bool(new_b.is_hidden),
        createdAt=new_b.created_at
    )


@app.post("/api/bookings/bulk-import", response_model=BulkImportResponse)
def bulk_import_bookings(
    req: BulkImportRequest,
    authorization: Optional[str] = Header(None),
    current_user: PropertyAccount = Depends(get_current_property),
    db: Session = Depends(get_db)
):
    caller_role = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            manager_id = payload.get("manager_id")
            if manager_id:
                mgr = db.query(ManagerAccount).filter(ManagerAccount.id == manager_id).first()
                if mgr:
                    caller_role = mgr.role
        except Exception:
            pass

    # Restrict to Super Admin and Admin roles
    is_authorized = caller_role in ["Overall Admin", "Super Admin", "Admin"] or current_user.role in ["Super Admin", "Admin"]
    if not is_authorized:
        raise HTTPException(
            status_code=403,
            detail="Only Super Admin and Admin accounts are authorized to import external booking files."
        )

    if not req.bookings:
        return BulkImportResponse(
            success=True,
            importedCount=0,
            skippedDuplicatesCount=0,
            importedBookings=[]
        )

    # Pre-fetch existing bookings for this property to avoid duplicate manual_id or id
    existing_bookings = db.query(BookingModel).filter(BookingModel.firm_id == current_user.firm_id).all()
    existing_ids = set(b.id for b in existing_bookings if b.id)
    existing_manual_ids = set((b.manual_id or "").strip().lower() for b in existing_bookings if b.manual_id)

    # Pre-fetch valid rooms in inventory (excluding staff rooms)
    property_rooms = db.query(RoomModel).filter(RoomModel.firm_id == current_user.firm_id).all()
    valid_rooms_map = {r.room_number.strip().lower(): r for r in property_rooms}

    today_str = datetime.now().strftime("%Y-%m-%d")
    now_iso = datetime.utcnow().isoformat() + "Z"

    imported_list = []
    skipped_count = 0

    for item in req.bookings:
        m_id = (item.manualId or "").strip()
        custom_id = (item.id or "").strip()

        # Check for duplicates in existing database records
        if custom_id and custom_id in existing_ids:
            skipped_count += 1
            continue

        if m_id and m_id.lower() in existing_manual_ids:
            skipped_count += 1
            continue

        system_id = custom_id if custom_id else generate_next_booking_id(db)

        # Date normalization & validation
        in_date = item.checkIn.strip() if item.checkIn else today_str
        out_date = item.checkOut.strip() if item.checkOut else today_str
        if not out_date or out_date < in_date:
            out_date = in_date

        # Auto-compute stay status if not explicitly given
        if item.status:
            stay_status = item.status
        else:
            if out_date < today_str:
                stay_status = "Completed"
            elif in_date <= today_str <= out_date:
                stay_status = "In-House"
            else:
                stay_status = "Upcoming"

        # Check room inventory matching
        allocated_room = ""
        if item.room:
            r_clean = str(item.room).strip()
            matched_rm = valid_rooms_map.get(r_clean.lower())
            if matched_rm and not matched_rm.is_staff_room:
                allocated_room = matched_rm.room_number

        effective_btype = item.bookingType or "OTA"
        is_prepaid = bool(item.isPrepaid or effective_btype in ["Online Pre-paid", "OYO Prepaid"])
        is_guaranteed = bool(item.isGuaranteed or is_prepaid or (item.amountPaid and item.amountPaid > 0))

        adults_cnt = item.adults if (item.adults and item.adults > 0) else 1
        children_cnt = item.children if (item.children and item.children >= 0) else 0
        total_guests = item.guestCount if (item.guestCount and item.guestCount > 0) else (adults_cnt + children_cnt)

        new_b = BookingModel(
            id=system_id,
            manual_id=m_id if m_id else system_id,
            firm_id=current_user.firm_id,
            guest_name=item.guestName.strip() if item.guestName else "Guest",
            phone=item.phone or "",
            email=item.email or "",
            room=allocated_room,
            guest_count=total_guests,
            adults=adults_cnt,
            children=children_cnt,
            check_in=in_date,
            check_out=out_date,
            amount_paid=float(item.amountPaid or 0.0),
            paid_via=item.paidVia or ("Online" if is_prepaid else "Cash"),
            txn_id=item.txnId,
            notes=item.notes or f"Imported from {effective_btype}",
            status=stay_status,
            booking_type=effective_btype,
            is_prepaid=is_prepaid,
            is_guaranteed=is_guaranteed,
            is_hidden=False,
            created_at=now_iso
        )
        db.add(new_b)
        db.flush()

        existing_ids.add(system_id)
        if m_id:
            existing_manual_ids.add(m_id.lower())

        imported_list.append(BookingResponse(
            id=new_b.id,
            manualId=new_b.manual_id or new_b.id,
            guestName=new_b.guest_name,
            phone=new_b.phone or "",
            email=new_b.email or "",
            room=new_b.room if (new_b.room and new_b.room.strip()) else None,
            guestCount=new_b.guest_count or 1,
            adults=new_b.adults or 1,
            children=new_b.children or 0,
            checkIn=new_b.check_in,
            checkOut=new_b.check_out,
            amountPaid=new_b.amount_paid,
            paidVia=new_b.paid_via or "Cash",
            txnId=new_b.txn_id,
            notes=new_b.notes or "",
            idCard=new_b.id_card,
            idCardName=new_b.id_card_name or "ID Photo",
            status=new_b.status or "Upcoming",
            bookingType=new_b.booking_type or "OTA",
            isPrepaid=bool(new_b.is_prepaid),
            isGuaranteed=bool(new_b.is_guaranteed),
            isHidden=bool(new_b.is_hidden),
            createdAt=new_b.created_at
        ))

    db.commit()

    return BulkImportResponse(
        success=True,
        importedCount=len(imported_list),
        skippedDuplicatesCount=skipped_count,
        importedBookings=imported_list
    )


@app.post("/api/bookings/{booking_id}/checkin", response_model=BookingResponse)
def checkin_booking(
    booking_id: str,
    current_user: PropertyAccount = Depends(get_current_property),
    db: Session = Depends(get_db)
):
    b = db.query(BookingModel).filter(
        BookingModel.id == booking_id,
        BookingModel.firm_id == current_user.firm_id
    ).first()

    if not b:
        raise HTTPException(status_code=404, detail="Booking not found.")

    if not b.room or not b.room.strip():
        raise HTTPException(status_code=400, detail="Cannot check in without an allotted room suite. Please allot a room first.")

    b.status = "In-House"
    db.commit()
    db.refresh(b)

    return BookingResponse(
        id=b.id,
        manualId=b.manual_id or b.id,
        guestName=b.guest_name,
        phone=b.phone or "",
        email=b.email or "",
        room=b.room,
        guestCount=b.guest_count or 1,
        adults=b.adults or 1,
        children=b.children or 0,
        checkIn=b.check_in,
        checkOut=b.check_out,
        amountPaid=b.amount_paid,
        paidVia=b.paid_via or "Cash",
        txnId=b.txn_id,
        notes=b.notes or "",
        idCard=b.id_card,
        idCardName=b.id_card_name or "ID Photo",
        status=b.status,
        bookingType=b.booking_type or "Walk-in",
        isPrepaid=bool(b.is_prepaid),
        isGuaranteed=bool(b.is_guaranteed),
        isHidden=bool(b.is_hidden),
        createdAt=b.created_at
    )


@app.post("/api/bookings/{booking_id}/checkout", response_model=BookingResponse)
def checkout_booking(
    booking_id: str,
    current_user: PropertyAccount = Depends(get_current_property),
    db: Session = Depends(get_db)
):
    b = db.query(BookingModel).filter(
        BookingModel.id == booking_id,
        BookingModel.firm_id == current_user.firm_id
    ).first()

    if not b:
        raise HTTPException(status_code=404, detail="Booking not found.")

    b.status = "Completed"
    db.commit()
    db.refresh(b)

    return BookingResponse(
        id=b.id,
        manualId=b.manual_id or b.id,
        guestName=b.guest_name,
        phone=b.phone or "",
        email=b.email or "",
        room=b.room,
        guestCount=b.guest_count or 1,
        adults=b.adults or 1,
        children=b.children or 0,
        checkIn=b.check_in,
        checkOut=b.check_out,
        amountPaid=b.amount_paid,
        paidVia=b.paid_via or "Cash",
        txnId=b.txn_id,
        notes=b.notes or "",
        idCard=b.id_card,
        idCardName=b.id_card_name or "ID Photo",
        status=b.status,
        bookingType=b.booking_type or "Walk-in",
        isPrepaid=bool(b.is_prepaid),
        isGuaranteed=bool(b.is_guaranteed),
        isHidden=bool(b.is_hidden),
        createdAt=b.created_at
    )


@app.post("/api/bookings/{booking_id}/early-checkout")
def early_checkout_booking(
    booking_id: str,
    req: EarlyCheckoutRequest,
    current_user: PropertyAccount = Depends(get_current_property),
    db: Session = Depends(get_db)
):
    b = db.query(BookingModel).filter(
        BookingModel.id == booking_id,
        BookingModel.firm_id == current_user.firm_id
    ).first()

    if not b:
        raise HTTPException(status_code=404, detail="Booking not found.")

    today_str = datetime.now().strftime("%Y-%m-%d")
    orig_checkout = b.check_out

    b.status = "Completed"
    b.check_out = today_str

    hidden_booking = None
    if req.createHiddenSlot and orig_checkout > today_str:
        new_id = generate_next_booking_id(db)
        hidden_b = BookingModel(
            id=new_id,
            manual_id=f"HIDDEN-{b.manual_id or b.id}",
            firm_id=current_user.firm_id,
            guest_name=f"[HIDDEN BOOKING] Room {b.room}",
            phone=b.phone or "",
            email=b.email or "",
            room=b.room,
            guest_count=b.guest_count or 1,
            adults=b.adults or 1,
            children=b.children or 0,
            check_in=today_str,
            check_out=orig_checkout,
            amount_paid=0.0,
            paid_via="N/A",
            notes=f"Early release hidden slot from original stay {b.id} ({b.guest_name})",
            status="Upcoming",
            is_hidden=True,
            created_at=datetime.utcnow().isoformat() + "Z"
        )
        db.add(hidden_b)
        hidden_booking = hidden_b

    db.commit()
    db.refresh(b)
    if hidden_booking:
        db.refresh(hidden_booking)

    return {
        "updatedBooking": BookingResponse(
            id=b.id, manualId=b.manual_id or b.id, guestName=b.guest_name,
            phone=b.phone or "", email=b.email or "", room=b.room,
            guestCount=b.guest_count or 1, adults=b.adults or 1, children=b.children or 0,
            checkIn=b.check_in, checkOut=b.check_out, amountPaid=b.amount_paid, paidVia=b.paid_via or "Cash",
            txnId=b.txn_id, notes=b.notes or "", idCard=b.id_card, idCardName=b.id_card_name or "ID Photo",
            status=b.status, bookingType=b.booking_type or "Walk-in", isPrepaid=bool(b.is_prepaid),
            isGuaranteed=bool(b.is_guaranteed), isHidden=bool(b.is_hidden), createdAt=b.created_at
        ),
        "hiddenBooking": BookingResponse(
            id=hidden_booking.id, manualId=hidden_booking.manual_id or hidden_booking.id,
            guestName=hidden_booking.guest_name, phone=hidden_booking.phone or "",
            email=hidden_booking.email or "", room=hidden_booking.room,
            guestCount=hidden_booking.guest_count or 1, adults=hidden_booking.adults or 1, children=hidden_booking.children or 0,
            checkIn=hidden_booking.check_in, checkOut=hidden_booking.check_out,
            amountPaid=hidden_booking.amount_paid, paidVia=hidden_booking.paid_via or "Cash",
            notes=hidden_booking.notes or "", idCard=hidden_booking.id_card,
            idCardName=hidden_booking.id_card_name or "ID Photo",
            status=hidden_booking.status, bookingType="Walk-in", isPrepaid=False,
            isGuaranteed=False, isHidden=True, createdAt=hidden_booking.created_at
        ) if hidden_booking else None
    }


@app.post("/api/bookings/{booking_id}/confirm", response_model=BookingResponse)
def confirm_booking(
    booking_id: str,
    current_user: PropertyAccount = Depends(get_current_property),
    db: Session = Depends(get_db)
):
    b = db.query(BookingModel).filter(
        BookingModel.id == booking_id,
        BookingModel.firm_id == current_user.firm_id
    ).first()

    if not b:
        raise HTTPException(status_code=404, detail="Booking not found.")

    b.status = "Upcoming"
    db.commit()
    db.refresh(b)

    return BookingResponse(
        id=b.id,
        manualId=b.manual_id or b.id,
        guestName=b.guest_name,
        phone=b.phone or "",
        email=b.email or "",
        room=b.room,
        guestCount=b.guest_count or 1,
        adults=b.adults or 1,
        children=b.children or 0,
        checkIn=b.check_in,
        checkOut=b.check_out,
        amountPaid=b.amount_paid,
        paidVia=b.paid_via or "Cash",
        txnId=b.txn_id,
        notes=b.notes or "",
        idCard=b.id_card,
        idCardName=b.id_card_name or "ID Photo",
        status=b.status,
        bookingType=b.booking_type or "Walk-in",
        isPrepaid=bool(b.is_prepaid),
        isGuaranteed=bool(b.is_guaranteed),
        isHidden=bool(b.is_hidden),
        createdAt=b.created_at
    )


@app.post("/api/bookings/{booking_id}/allot-room", response_model=BookingResponse)
def allot_room(
    booking_id: str,
    req: AllotRoomRequest,
    current_user: PropertyAccount = Depends(get_current_property),
    db: Session = Depends(get_db)
):
    b = db.query(BookingModel).filter(
        BookingModel.id == booking_id,
        BookingModel.firm_id == current_user.firm_id
    ).first()
    if not b:
        raise HTTPException(status_code=404, detail="Booking not found.")

    target_room = req.room.strip() if req.room else ""
    if not target_room:
        raise HTTPException(status_code=400, detail="Room suite number is required.")

    # Check room exists in inventory and is not staff room
    room_obj = db.query(RoomModel).filter(
        RoomModel.firm_id == current_user.firm_id,
        RoomModel.room_number == target_room
    ).first()
    if not room_obj:
        raise HTTPException(status_code=400, detail=f"Room suite '{target_room}' does not exist in property inventory.")
    if room_obj.is_staff_room:
        raise HTTPException(status_code=400, detail=f"Room {target_room} is a designated staff room and cannot be allotted to guests.")

    # Check date collision with other active bookings for the same room
    conflicts = db.query(BookingModel).filter(
        BookingModel.firm_id == current_user.firm_id,
        BookingModel.id != booking_id,
        BookingModel.room == target_room,
        BookingModel.status.in_(["In-House", "Checked-In", "Upcoming", "Confirmed"]),
        BookingModel.check_in < b.check_out,
        BookingModel.check_out > b.check_in
    ).all()
    if conflicts:
        c_names = ", ".join([c.guest_name for c in conflicts])
        raise HTTPException(status_code=400, detail=f"Room {target_room} is already occupied or reserved during these stay dates by {c_names}.")

    b.room = target_room
    if req.status:
        b.status = req.status
    if req.isGuaranteed is not None:
        b.is_guaranteed = req.isGuaranteed
    else:
        b.is_guaranteed = True

    db.commit()
    db.refresh(b)

    return BookingResponse(
        id=b.id,
        manualId=b.manual_id or b.id,
        guestName=b.guest_name,
        phone=b.phone or "",
        email=b.email or "",
        room=b.room,
        guestCount=b.guest_count or 1,
        adults=b.adults or 1,
        children=b.children or 0,
        checkIn=b.check_in,
        checkOut=b.check_out,
        amountPaid=b.amount_paid,
        paidVia=b.paid_via or "Cash",
        txnId=b.txn_id,
        notes=b.notes or "",
        idCard=b.id_card,
        idCardName=b.id_card_name or "ID Photo",
        status=b.status or "Upcoming",
        bookingType=b.booking_type or "Walk-in",
        isPrepaid=bool(b.is_prepaid),
        isGuaranteed=bool(b.is_guaranteed),
        isHidden=bool(b.is_hidden),
        createdAt=b.created_at
    )


@app.put("/api/bookings/{booking_id}", response_model=BookingResponse)
def update_booking(
    booking_id: str,
    req: BookingUpdate,
    current_user: PropertyAccount = Depends(get_current_property),
    db: Session = Depends(get_db)
):
    b = db.query(BookingModel).filter(
        BookingModel.id == booking_id,
        BookingModel.firm_id == current_user.firm_id
    ).first()

    if not b:
        raise HTTPException(status_code=404, detail="Booking not found.")

    if req.manualId is not None:
        b.manual_id = req.manualId.strip()
    if req.guestName is not None:
        b.guest_name = req.guestName
    if req.phone is not None:
        b.phone = req.phone
    if req.email is not None:
        b.email = req.email
    if req.room is not None:
        clean_room = req.room.strip() if req.room.strip() else None
        if clean_room:
            room_rec = db.query(RoomModel).filter(
                RoomModel.firm_id == current_user.firm_id,
                RoomModel.room_number == clean_room
            ).first()
            if not room_rec:
                raise HTTPException(status_code=400, detail=f"Room suite '{clean_room}' does not exist in property inventory.")
            if room_rec.is_staff_room:
                raise HTTPException(status_code=400, detail=f"Room '{clean_room}' is a designated staff room and cannot be assigned to guests.")
        b.room = clean_room or ""
    if req.guestCount is not None:
        b.guest_count = req.guestCount
    if req.adults is not None:
        b.adults = req.adults
    if req.children is not None:
        b.children = req.children
    if req.checkIn is not None:
        b.check_in = req.checkIn
    if req.checkOut is not None:
        b.check_out = req.checkOut
    if req.amountPaid is not None:
        b.amount_paid = req.amountPaid
    if req.paidVia is not None:
        b.paid_via = req.paidVia
    if req.txnId is not None:
        b.txn_id = req.txnId.strip() if req.txnId else None
    if req.notes is not None:
        b.notes = req.notes
    if req.idCard is not None:
        b.id_card = req.idCard
    if req.idCardName is not None:
        b.id_card_name = req.idCardName
    if req.status is not None:
        b.status = req.status
    if req.bookingType is not None:
        b.booking_type = req.bookingType
    if req.isPrepaid is not None:
        b.is_prepaid = req.isPrepaid
    if req.isGuaranteed is not None:
        b.is_guaranteed = req.isGuaranteed
    if req.isHidden is not None:
        b.is_hidden = req.isHidden

    db.commit()
    db.refresh(b)

    return BookingResponse(
        id=b.id,
        manualId=b.manual_id or b.id,
        guestName=b.guest_name,
        phone=b.phone or "",
        email=b.email or "",
        room=b.room,
        guestCount=b.guest_count or 1,
        adults=b.adults or 1,
        children=b.children or 0,
        checkIn=b.check_in,
        checkOut=b.check_out,
        amountPaid=b.amount_paid,
        paidVia=b.paid_via or "Cash",
        txnId=b.txn_id,
        notes=b.notes or "",
        idCard=b.id_card,
        idCardName=b.id_card_name or "ID Photo",
        status=b.status or "Upcoming",
        bookingType=b.booking_type or "Walk-in",
        isPrepaid=bool(b.is_prepaid),
        isGuaranteed=bool(b.is_guaranteed),
        isHidden=bool(b.is_hidden),
        createdAt=b.created_at
    )


@app.delete("/api/bookings/{booking_id}")
def delete_booking(
    booking_id: str,
    current_user: PropertyAccount = Depends(get_current_property),
    db: Session = Depends(get_db)
):
    b = db.query(BookingModel).filter(
        BookingModel.id == booking_id,
        BookingModel.firm_id == current_user.firm_id
    ).first()
    if b:
        db.delete(b)
        db.commit()
    return {"success": True}


# --- EXPENSES ENDPOINTS ---

@app.get("/api/expenses", response_model=List[ExpenseResponse])
def get_expenses(
    current_user: PropertyAccount = Depends(get_current_property),
    db: Session = Depends(get_db)
):
    expenses = db.query(ExpenseModel).filter(ExpenseModel.firm_id == current_user.firm_id).all()
    res = []
    for e in expenses:
        res.append(ExpenseResponse(
            id=e.id,
            date=e.date,
            category=e.category,
            description=e.description or "",
            amount=e.amount,
            createdAt=e.created_at
        ))
    return res


@app.post("/api/expenses", response_model=ExpenseResponse)
def create_expense(
    req: ExpenseCreate,
    current_user: PropertyAccount = Depends(get_current_property),
    db: Session = Depends(get_db)
):
    exp_id = req.id if req.id else f"EXP-{int(uuid.uuid4().int % 90000 + 1000)}"
    while db.query(ExpenseModel).filter(ExpenseModel.id == exp_id).first():
        exp_id = f"EXP-{int(uuid.uuid4().int % 90000 + 1000)}"
    now_iso = datetime.utcnow().isoformat() + "Z"

    new_e = ExpenseModel(
        id=exp_id,
        firm_id=current_user.firm_id,
        date=req.date,
        category=req.category,
        description=req.description,
        amount=req.amount,
        created_at=now_iso
    )
    db.add(new_e)
    db.commit()
    db.refresh(new_e)

    return ExpenseResponse(
        id=new_e.id,
        date=new_e.date,
        category=new_e.category,
        description=new_e.description or "",
        amount=new_e.amount,
        createdAt=new_e.created_at
    )


@app.delete("/api/expenses/{expense_id}")
def delete_expense(
    expense_id: str,
    current_user: PropertyAccount = Depends(get_current_property),
    db: Session = Depends(get_db)
):
    e = db.query(ExpenseModel).filter(
        ExpenseModel.id == expense_id,
        ExpenseModel.firm_id == current_user.firm_id
    ).first()
    if e:
        db.delete(e)
        db.commit()
    return {"success": True}


# --- BILLS ENDPOINTS ---

@app.get("/api/bills", response_model=List[BillResponse])
def get_bills(
    current_user: PropertyAccount = Depends(get_current_property),
    db: Session = Depends(get_db)
):
    bills = db.query(BillModel).filter(BillModel.firm_id == current_user.firm_id).all()
    res = []
    for b in bills:
        try:
            add_ons_list = json.loads(b.add_ons) if b.add_ons else []
        except Exception:
            add_ons_list = []

        res.append(BillResponse(
            id=b.id,
            bookingId=b.booking_id,
            guestName=b.guest_name,
            roomNo=b.room_no,
            roomCharge=b.room_charge,
            addOns=add_ons_list,
            total=b.total,
            date=b.date
        ))
    return res


@app.post("/api/bills", response_model=BillResponse)
def create_bill(
    req: BillCreate,
    current_user: PropertyAccount = Depends(get_current_property),
    db: Session = Depends(get_db)
):
    bill_id = req.id if req.id else f"BILL-{int(uuid.uuid4().int % 90000 + 1000)}"
    while db.query(BillModel).filter(BillModel.id == bill_id).first():
        bill_id = f"BILL-{int(uuid.uuid4().int % 90000 + 1000)}"
    add_ons_json = json.dumps(req.addOns) if req.addOns else "[]"

    new_b = BillModel(
        id=bill_id,
        firm_id=current_user.firm_id,
        booking_id=req.bookingId,
        guest_name=req.guestName,
        room_no=req.roomNo,
        room_charge=req.roomCharge,
        add_ons=add_ons_json,
        total=req.total,
        date=req.date
    )
    db.add(new_b)
    db.commit()
    db.refresh(new_b)

    return BillResponse(
        id=new_b.id,
        bookingId=new_b.booking_id,
        guestName=new_b.guest_name,
        roomNo=new_b.room_no,
        roomCharge=new_b.room_charge,
        addOns=req.addOns or [],
        total=new_b.total,
        date=new_b.date
    )


@app.put("/api/bills/{bill_id}", response_model=BillResponse)
def update_bill(
    bill_id: str,
    req: BillUpdate,
    current_user: PropertyAccount = Depends(get_current_property),
    db: Session = Depends(get_db)
):
    b = db.query(BillModel).filter(
        BillModel.id == bill_id,
        BillModel.firm_id == current_user.firm_id
    ).first()

    if not b:
        raise HTTPException(status_code=404, detail="Bill not found.")

    if req.guestName is not None:
        b.guest_name = req.guestName
    if req.roomNo is not None:
        b.room_no = req.roomNo
    if req.roomCharge is not None:
        b.room_charge = req.roomCharge
    if req.addOns is not None:
        b.add_ons = json.dumps(req.addOns)
    if req.total is not None:
        b.total = req.total
    if req.date is not None:
        b.date = req.date

    db.commit()
    db.refresh(b)

    try:
        parsed_addons = json.loads(b.add_ons) if b.add_ons else []
    except Exception:
        parsed_addons = []

    return BillResponse(
        id=b.id,
        bookingId=b.booking_id,
        guestName=b.guest_name,
        roomNo=b.room_no,
        roomCharge=b.room_charge,
        addOns=parsed_addons,
        total=b.total,
        date=b.date
    )


@app.delete("/api/bills/{bill_id}")
def delete_bill(
    bill_id: str,
    current_user: PropertyAccount = Depends(get_current_property),
    db: Session = Depends(get_db)
):
    b = db.query(BillModel).filter(
        BillModel.id == bill_id,
        BillModel.firm_id == current_user.firm_id
    ).first()
    if b:
        db.delete(b)
        db.commit()
    return {"success": True}


# --- REGISTER STATUS ENDPOINTS ---

@app.get("/api/register-status", response_model=RegisterStateResponse)
def get_register_status(
    current_user: PropertyAccount = Depends(get_current_property),
    db: Session = Depends(get_db)
):
    state = db.query(RegisterStateModel).filter(RegisterStateModel.firm_id == current_user.firm_id).first()
    if not state:
        state = RegisterStateModel(firm_id=current_user.firm_id, is_open=True)
        db.add(state)
        db.commit()
        db.refresh(state)
    return RegisterStateResponse(isOpen=state.is_open)


@app.post("/api/register-status/toggle", response_model=RegisterStateResponse)
def toggle_register_status(
    current_user: PropertyAccount = Depends(get_current_property),
    db: Session = Depends(get_db)
):
    state = db.query(RegisterStateModel).filter(RegisterStateModel.firm_id == current_user.firm_id).first()
    if not state:
        state = RegisterStateModel(firm_id=current_user.firm_id, is_open=False)
        db.add(state)
    else:
        state.is_open = not state.is_open
    db.commit()
    db.refresh(state)
    return RegisterStateResponse(isOpen=state.is_open)


# --- INVITATION SYSTEM ENDPOINTS ---

def send_invitation_email(recipient_email: str, property_name: str, invite_url: str, admin_sender_email: str):
    """
    Sends an invitation email dynamically using the registered Super Admin's email address as the sender.
    """
    sender_email = admin_sender_email.strip()
    smtp_pass = os.environ.get("SMTP_PASSWORD", "").strip()
    smtp_host = os.environ.get("SMTP_HOST", "smtp.gmail.com").strip()
    smtp_port_raw = os.environ.get("SMTP_PORT", "587").strip()
    smtp_port = int(smtp_port_raw) if smtp_port_raw.isdigit() else 587

    subject = f"Invitation to manage {property_name}"
    body = (
        f"Hello,\n\n"
        f"You have been invited by the Super Admin ({sender_email}) to register as the Property Manager for '{property_name}'.\n\n"
        f"Please click the secure activation link below to complete your setup and set your password:\n"
        f"{invite_url}\n\n"
        f"Best regards,\n"
        f"Hotel Operations Team"
    )

    if sender_email and smtp_pass:
        try:
            import smtplib
            from email.mime.text import MIMEText
            msg = MIMEText(body)
            msg['Subject'] = subject
            msg['From'] = sender_email
            msg['To'] = recipient_email
            with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as server:
                server.starttls()
                server.login(sender_email, smtp_pass)
                server.sendmail(sender_email, [recipient_email], msg.as_string())
            print(f"[SMTP DISPATCH SUCCESS] Email sent from {sender_email} to {recipient_email}")
            return True, f"Email sent from {sender_email} via SMTP."
        except Exception as e:
            print(f"[SMTP DISPATCH ERROR] Could not deliver live SMTP from {sender_email} ({e}). Activation Link: {invite_url}")
            return False, f"SMTP error: {e}"
    else:
        print(f"[SMTP DISPATCH NOTICE] SMTP_PASSWORD not configured. Sender: {sender_email}. Activation Link: {invite_url}")
        return False, "SMTP_PASSWORD not configured on server."

@app.post("/api/invitations/send")
def send_invitation(
    req: InvitationCreateRequest,
    request: Request,
    db: Session = Depends(get_db),
    mgr_token_payload: dict = Depends(get_manager_me)
):
    if mgr_token_payload.get("role") not in ["Overall Admin", "Super Admin"]:
        raise HTTPException(status_code=403, detail="Only Super Admin can send manager invitations.")

    admin_email = mgr_token_payload.get("email", "").strip()
    if not admin_email:
        super_admin = db.query(ManagerAccount).filter(ManagerAccount.role.in_(["Overall Admin", "Super Admin"])).first()
        admin_email = super_admin.email if super_admin else ""

    prop = db.query(PropertyAccount).filter(PropertyAccount.firm_id == req.propertyId).first()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found.")

    token = f"inv_{uuid.uuid4().hex}"
    invite = InvitationModel(
        id=token,
        property_id=prop.firm_id,
        property_name=prop.firm_name,
        email=req.email.strip().lower(),
        sender_email=admin_email,
        status="pending"
    )
    db.add(invite)
    db.commit()
    db.refresh(invite)

    origin = request.headers.get("origin") or "https://aszenventures.com"
    invite_url = f"{origin.rstrip('/')}/#register?token={token}"
    email_sent, email_msg = send_invitation_email(req.email.strip(), prop.firm_name, invite_url, admin_email)

    return {
        "id": invite.id,
        "propertyId": invite.property_id,
        "propertyName": invite.property_name,
        "email": invite.email,
        "senderEmail": invite.sender_email,
        "status": invite.status,
        "inviteUrl": invite_url,
        "emailSent": email_sent,
        "emailMessage": email_msg,
        "createdAt": invite.created_at.isoformat() if invite.created_at else ""
    }

@app.get("/api/invitations/{token}")
def get_invitation_details(token: str, db: Session = Depends(get_db)):
    invite = db.query(InvitationModel).filter(InvitationModel.id == token).first()
    if not invite:
        raise HTTPException(status_code=404, detail="Invitation link is invalid or expired.")
    if invite.status == "accepted":
        raise HTTPException(status_code=400, detail="This invitation has already been accepted.")

    return {
        "id": invite.id,
        "propertyId": invite.property_id,
        "propertyName": invite.property_name,
        "email": invite.email,
        "senderEmail": invite.sender_email,
        "status": invite.status,
        "createdAt": invite.created_at.isoformat() if invite.created_at else ""
    }

@app.post("/api/invitations/accept")
def accept_invitation(req: AcceptInvitationRequest, db: Session = Depends(get_db)):
    invite = db.query(InvitationModel).filter(InvitationModel.id == req.token).first()
    if not invite:
        raise HTTPException(status_code=404, detail="Invitation link is invalid or expired.")
    if invite.status == "accepted":
        raise HTTPException(status_code=400, detail="This invitation has already been accepted.")

    clean_name = req.name.strip()
    clean_pass = req.password.strip()
    if not clean_name or not clean_pass:
        raise HTTPException(status_code=400, detail="Please enter your name and password.")

    # Check if manager account with this email already exists
    existing_mgr = db.query(ManagerAccount).filter(ManagerAccount.email.ilike(invite.email)).first()
    if existing_mgr:
        existing_mgr.name = clean_name
        existing_mgr.password_hash = hash_password(clean_pass)
        mgr_user = existing_mgr
    else:
        mgr_id = f"mgr_{int(datetime.utcnow().timestamp())}_{uuid.uuid4().hex[:4]}"
        mgr_user = ManagerAccount(
            id=mgr_id,
            name=clean_name,
            email=invite.email,
            password_hash=hash_password(clean_pass),
            role="Property Manager"
        )
        db.add(mgr_user)

    # Link Manager to Property
    prop = db.query(PropertyAccount).filter(PropertyAccount.firm_id == invite.property_id).first()
    if prop:
        prop.manager_id = mgr_user.id
        prop.name = mgr_user.name
        prop.email = invite.email
        prop.password_hash = mgr_user.password_hash

    invite.status = "accepted"
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        # Fallback in case of DB constraint: update without changing prop email
        if prop:
            prop.manager_id = mgr_user.id
            prop.name = mgr_user.name
            prop.password_hash = mgr_user.password_hash
        invite.status = "accepted"
        db.commit()

    token = create_access_token({
        "sub": mgr_user.id,
        "manager_id": mgr_user.id,
        "role": mgr_user.role or "Property Manager",
        "email": mgr_user.email
    })

    prop_resp = PropertyResponse(
        firmId=prop.firm_id,
        propertyCode=prop.property_code,
        firmName=prop.firm_name,
        name=prop.name,
        managerId=prop.manager_id,
        ownerName=prop.owner_name,
        ownerPhone=prop.owner_phone,
        tnebNumber=prop.tneb_number,
        email=prop.email,
        firmLogo=prop.firm_logo,
        eSignature=prop.e_signature,
        address=prop.address,
        phone=prop.phone,
        sessionTimeoutMinutes=prop.session_timeout_minutes or 15,
        role=prop.role or "Property Manager",
        initials=get_initials(prop.firm_name)
    ) if prop else None

    return {
        "token": token,
        "manager": {
            "id": mgr_user.id,
            "name": mgr_user.name,
            "email": mgr_user.email,
            "role": mgr_user.role,
            "properties": [prop_resp] if prop_resp else [],
            "activeProperty": prop_resp
        }
    }

@app.get("/api/invitations")
def list_invitations(
    request: Request,
    db: Session = Depends(get_db),
    mgr_token_payload: dict = Depends(get_manager_me)
):
    if mgr_token_payload.get("role") not in ["Overall Admin", "Super Admin"]:
        raise HTTPException(status_code=403, detail="Only Super Admin can view invitations.")

    origin = request.headers.get("origin") or "https://aszenventures.com"
    invites = db.query(InvitationModel).order_by(InvitationModel.created_at.desc()).all()
    res = []
    for inv in invites:
        res.append({
            "id": inv.id,
            "propertyId": inv.property_id,
            "propertyName": inv.property_name,
            "email": inv.email,
            "senderEmail": inv.sender_email,
            "status": inv.status,
            "inviteUrl": f"{origin.rstrip('/')}/#register?token={inv.id}",
            "createdAt": inv.created_at.isoformat() if inv.created_at else ""
        })
    return res


# --- DIRECT MANAGER CREATION & SECURITY ENDPOINTS ---

# --- DIRECT MANAGER & ADMIN CREATION & SECURITY ENDPOINTS ---

@app.post("/api/managers/create")
def create_manager_account(
    req: ManagerCreateRequest,
    db: Session = Depends(get_db),
    mgr_token_payload: dict = Depends(get_manager_me)
):
    caller_role = mgr_token_payload.get("role")
    if caller_role not in ["Overall Admin", "Super Admin", "Admin"]:
        raise HTTPException(status_code=403, detail="Unauthorized to create user accounts.")

    target_role = "Admin" if req.role == "Admin" else "Manager"
    if target_role == "Admin" and caller_role not in ["Overall Admin", "Super Admin"]:
        raise HTTPException(status_code=403, detail="Only Super Admin can create Admin accounts.")

    clean_name = req.name.strip()
    clean_email = req.email.strip().lower()
    clean_pass = req.tempPassword.strip()
    prop_id = req.propertyId.strip()

    if not clean_name or not clean_email or not clean_pass:
        raise HTTPException(status_code=400, detail="Please fill in all user fields.")

    if len(clean_pass) < 6:
        raise HTTPException(status_code=400, detail="Temporary password must be at least 6 characters.")

    prop = None
    if prop_id and prop_id != "all":
        prop = db.query(PropertyAccount).filter(PropertyAccount.firm_id == prop_id).first()
        if not prop and target_role == "Manager":
            raise HTTPException(status_code=404, detail="Selected property was not found.")

    hashed_pass = hash_password(clean_pass)
    existing_mgr = db.query(ManagerAccount).filter(ManagerAccount.email.ilike(clean_email)).first()
    if existing_mgr:
        if existing_mgr.role in ["Overall Admin", "Super Admin"] and caller_role != "Super Admin":
            raise HTTPException(status_code=400, detail="Cannot modify a Super Admin account.")
        existing_mgr.name = clean_name
        existing_mgr.password_hash = hashed_pass
        existing_mgr.temp_password_hash = hashed_pass
        existing_mgr.temp_password_plain = clean_pass
        existing_mgr.role = target_role
        mgr_user = existing_mgr
    else:
        prefix = "admin" if target_role == "Admin" else "mgr"
        mgr_id = f"{prefix}_{int(datetime.utcnow().timestamp())}_{uuid.uuid4().hex[:4]}"
        mgr_user = ManagerAccount(
            id=mgr_id,
            name=clean_name,
            email=clean_email,
            password_hash=hashed_pass,
            temp_password_hash=hashed_pass,
            temp_password_plain=clean_pass,
            role=target_role,
            created_by=mgr_token_payload.get("id")
        )
        db.add(mgr_user)
        db.flush()

    if prop and target_role == "Manager":
        prop.manager_id = mgr_user.id
        prop.name = mgr_user.name
        prop.email = clean_email
        prop.password_hash = mgr_user.password_hash

    db.commit()
    db.refresh(mgr_user)
    if prop:
        db.refresh(prop)

    return {
        "success": True,
        "message": f"{target_role} '{clean_name}' created successfully.",
        "manager": {
            "id": mgr_user.id,
            "name": mgr_user.name,
            "email": mgr_user.email,
            "role": target_role,
            "propertyId": prop.firm_id if prop else "All",
            "propertyCode": prop.property_code if prop else ("ALL" if target_role == "Admin" else ""),
            "propertyName": prop.firm_name if prop else "All Super Admin Properties",
            "tempPassword": clean_pass
        }
    }


@app.get("/api/managers")
def list_managers(
    db: Session = Depends(get_db),
    mgr_token_payload: dict = Depends(get_manager_me)
):
    caller_role = mgr_token_payload.get("role")
    if caller_role not in ["Overall Admin", "Super Admin", "Admin"]:
        raise HTTPException(status_code=403, detail="Unauthorized to view users.")

    if caller_role in ["Overall Admin", "Super Admin"]:
        users = db.query(ManagerAccount).filter(ManagerAccount.role.in_(["Admin", "Manager", "Property Manager"])).all()
    else:
        users = db.query(ManagerAccount).filter(ManagerAccount.role.in_(["Manager", "Property Manager"])).all()

    props = db.query(PropertyAccount).all()
    prop_by_mgr = {p.manager_id: p for p in props if p.manager_id}

    result = []
    for m in users:
        assigned_prop = prop_by_mgr.get(m.id)
        role_label = "Admin" if m.role == "Admin" else "Manager"
        result.append({
            "id": m.id,
            "name": m.name,
            "email": m.email,
            "role": role_label,
            "createdAt": m.created_at.isoformat() if m.created_at else None,
            "propertyId": assigned_prop.firm_id if assigned_prop else None,
            "propertyCode": assigned_prop.property_code if assigned_prop else ("ALL" if role_label == "Admin" else None),
            "propertyName": assigned_prop.firm_name if assigned_prop else ("All Properties" if role_label == "Admin" else "Unassigned"),
            "tempPassword": m.temp_password_plain if caller_role in ["Overall Admin", "Super Admin"] else None
        })
    return result


@app.post("/api/auth/change-password")
def change_password(
    req: ChangePasswordRequest,
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authentication token required.")
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        manager_id = payload.get("manager_id") or payload.get("sub")
        firm_id = payload.get("firm_id")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token session.")

    clean_current = req.currentPassword.strip()
    clean_new = req.newPassword.strip()

    if not clean_current or not clean_new:
        raise HTTPException(status_code=400, detail="Please provide both current and new passwords.")

    if len(clean_new) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters long.")

    if manager_id:
        mgr = db.query(ManagerAccount).filter(ManagerAccount.id == manager_id).first()
        if not mgr:
            raise HTTPException(status_code=404, detail="User account not found.")

        # Dual password check: verify with active password OR with initial temporary password
        is_curr_valid = verify_password(clean_current, mgr.password_hash) or (
            bool(mgr.temp_password_hash) and verify_password(clean_current, mgr.temp_password_hash)
        )
        if not is_curr_valid:
            raise HTTPException(status_code=400, detail="Current password does not match.")

        # Ensure temp_password_hash is preserved so both remain bound and valid
        if not mgr.temp_password_hash:
            mgr.temp_password_hash = mgr.password_hash

        mgr.password_hash = hash_password(clean_new)
        props = db.query(PropertyAccount).filter(PropertyAccount.manager_id == mgr.id).all()
        for p in props:
            p.password_hash = mgr.password_hash

        db.commit()
        return {"success": True, "message": "Password changed successfully. Both temporary and new credentials remain bound."}

    elif firm_id:
        prop = db.query(PropertyAccount).filter(PropertyAccount.firm_id == firm_id).first()
        if not prop:
            raise HTTPException(status_code=404, detail="Property account not found.")

        if not verify_password(clean_current, prop.password_hash):
            raise HTTPException(status_code=400, detail="Current password does not match.")

        prop.password_hash = hash_password(clean_new)
        db.commit()
        return {"success": True, "message": "Password changed successfully."}

    raise HTTPException(status_code=401, detail="Unauthorized.")


# --- FEATURE TOGGLE & SUPER ADMIN IMPERSONATION ENDPOINTS ---

@app.get("/api/system/feature-toggles")
def get_feature_toggles(db: Session = Depends(get_db)):
    toggles = db.query(FeatureToggleModel).all()
    result = {}
    for t in toggles:
        try:
            result[t.role] = json.loads(t.features_json)
        except Exception:
            result[t.role] = {}
    if "Admin" not in result:
        result["Admin"] = DEFAULT_ADMIN_FEATURES
    if "Manager" not in result:
        result["Manager"] = DEFAULT_MANAGER_FEATURES
    return result


@app.post("/api/system/feature-toggles")
def update_feature_toggles(
    req: FeatureToggleRequest,
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authentication required.")
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        manager_id = payload.get("manager_id")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token.")

    mgr = db.query(ManagerAccount).filter(ManagerAccount.id == manager_id).first() if manager_id else None
    if not mgr or mgr.role not in ["Overall Admin", "Super Admin"]:
        raise HTTPException(status_code=403, detail="Only Super Admin can configure feature releases.")

    ft = db.query(FeatureToggleModel).filter(FeatureToggleModel.role == req.role).first()
    if not ft:
        ft = FeatureToggleModel(role=req.role, features_json=json.dumps(req.features))
        db.add(ft)
    else:
        ft.features_json = json.dumps(req.features)
    db.commit()
    return {"success": True, "role": req.role, "features": req.features}


@app.post("/api/auth/impersonate/{user_id}")
def impersonate_user(
    user_id: str,
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authentication required.")
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        mgr_id = payload.get("manager_id")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token.")

    caller = db.query(ManagerAccount).filter(ManagerAccount.id == mgr_id).first() if mgr_id else None
    if not caller or caller.role not in ["Overall Admin", "Super Admin"]:
        raise HTTPException(status_code=403, detail="Only Super Admin can switch to view as other users.")

    target_user = db.query(ManagerAccount).filter(ManagerAccount.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Target user account not found.")

    target_role = "Admin" if target_user.role == "Admin" else ("Super Admin" if target_user.role in ["Overall Admin", "Super Admin"] else "Manager")
    impersonation_token = create_access_token({
        "sub": target_user.id,
        "manager_id": target_user.id,
        "role": target_role,
        "email": target_user.email,
        "impersonated_by": caller.id
    })
    return {
        "success": True,
        "token": impersonation_token,
        "targetUser": {
            "id": target_user.id,
            "name": target_user.name,
            "email": target_user.email,
            "role": target_role
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)



