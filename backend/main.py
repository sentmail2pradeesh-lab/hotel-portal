import os
import json
import uuid
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, Depends, HTTPException, status, Header
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
    from backend.database import engine, Base, get_db
    from backend.models import (
        ManagerAccount, PropertyAccount, RoomModel, BookingModel,
        ExpenseModel, BillModel, RegisterStateModel, InvitationModel
    )
    from backend.schemas import (
        ManagerRegisterRequest, ManagerLoginRequest, ManagerResponse,
        PropertyCreateRequest, PropertyResponse,
        RegisterRequest, LoginRequest, UserProfileResponse, ProfileUpdateRequest,
        BookingCreate, BookingUpdate, BookingResponse, EarlyCheckoutRequest,
        ExpenseCreate, ExpenseResponse,
        BillCreate, BillUpdate, BillResponse,
        RoomCreate, RegisterStateResponse,
        InvitationCreateRequest, InvitationResponse, AcceptInvitationRequest
    )
except ModuleNotFoundError:
    from database import engine, Base, get_db
    from models import (
        ManagerAccount, PropertyAccount, RoomModel, BookingModel,
        ExpenseModel, BillModel, RegisterStateModel, InvitationModel
    )
    from schemas import (
        ManagerRegisterRequest, ManagerLoginRequest, ManagerResponse,
        PropertyCreateRequest, PropertyResponse,
        RegisterRequest, LoginRequest, UserProfileResponse, ProfileUpdateRequest,
        BookingCreate, BookingUpdate, BookingResponse, EarlyCheckoutRequest,
        ExpenseCreate, ExpenseResponse,
        BillCreate, BillUpdate, BillResponse,
        RoomCreate, RegisterStateResponse,
        InvitationCreateRequest, InvitationResponse, AcceptInvitationRequest
    )

# Initialize database tables
Base.metadata.create_all(bind=engine)

# Auto-migrate missing SQLite columns on existing tables
try:
    with engine.connect() as conn:
        res = conn.execute(text("PRAGMA table_info(property_accounts)")).fetchall()
        cols = [r[1] for r in res]
        if "manager_id" not in cols:
            conn.execute(text("ALTER TABLE property_accounts ADD COLUMN manager_id VARCHAR"))
            conn.commit()

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
except Exception as e:
    print("Database auto-migration info:", e)

app = FastAPI(
    title="Hotel Booking & Property Management API",
    description="Multi-tenant Python backend for real-time simultaneous multi-device property management.",
    version="1.0.0"
)

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

def hash_password(password: str) -> str:
    pwd_bytes = password.encode('utf-8')[:72]
    salt = bcrypt.gensalt()
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
        is_overall_admin = mgr and mgr.role == "Overall Admin"
        if x_property_id:
            if is_overall_admin:
                prop = db.query(PropertyAccount).filter(PropertyAccount.firm_id == x_property_id).first()
            else:
                prop = db.query(PropertyAccount).filter(
                    PropertyAccount.firm_id == x_property_id,
                    PropertyAccount.manager_id == manager_id
                ).first()
            if prop:
                return prop
        # Fallback to first property
        if is_overall_admin:
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
    admin = db.query(ManagerAccount).filter(ManagerAccount.role == "Overall Admin").first()
    return {
        "isAdminRegistered": bool(admin),
        "adminEmail": admin.email if admin else None
    }


@app.post("/api/auth/admin/register")
def register_overall_admin(req: ManagerRegisterRequest, db: Session = Depends(get_db)):
    existing_admin = db.query(ManagerAccount).filter(ManagerAccount.role == "Overall Admin").first()
    if existing_admin:
        raise HTTPException(status_code=400, detail="Overall Admin account has already been registered.")

    clean_name = req.name.strip()
    clean_email = req.email.strip().lower()
    clean_pass = req.password.strip()

    if not clean_name or not clean_email or not clean_pass:
        raise HTTPException(status_code=400, detail="Please fill out all admin registration fields.")

    existing_email = db.query(ManagerAccount).filter(ManagerAccount.email.ilike(clean_email)).first()
    if existing_email:
        raise HTTPException(status_code=400, detail=f'Email "{clean_email}" is already registered.')

    mgr_id = f"admin_{int(datetime.utcnow().timestamp())}_{uuid.uuid4().hex[:4]}"
    admin_mgr = ManagerAccount(
        id=mgr_id,
        name=clean_name,
        email=clean_email,
        password_hash=hash_password(clean_pass),
        role="Overall Admin"
    )
    db.add(admin_mgr)
    db.commit()
    db.refresh(admin_mgr)

    token = create_access_token({"manager_id": mgr_id})
    return {
        "token": token,
        "manager": {
            "id": admin_mgr.id,
            "name": admin_mgr.name,
            "email": admin_mgr.email,
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
        (ManagerAccount.email.ilike(clean_id)) | (ManagerAccount.name.ilike(clean_id))
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

    if not matched or not verify_password(clean_pass, matched.password_hash):
        raise HTTPException(
            status_code=400,
            detail="Invalid email/username or password."
        )

    is_admin = matched.role == "Overall Admin"
    if is_admin:
        props = db.query(PropertyAccount).all()
    else:
        props = db.query(PropertyAccount).filter(PropertyAccount.manager_id == matched.id).all()

    prop_responses = [
        PropertyResponse(
            firmId=p.firm_id,
            firmName=p.firm_name,
            name=p.name,
            email=p.email,
            firmLogo=p.firm_logo,
            eSignature=p.e_signature,
            sessionTimeoutMinutes=p.session_timeout_minutes or 15,
            role=p.role or "Property Manager",
            initials=p.initials or "PM"
        )
        for p in props
    ]

    token = create_access_token({"manager_id": matched.id})
    return {
        "token": token,
        "manager": {
            "id": matched.id,
            "name": matched.name,
            "email": matched.email,
            "role": "Overall Admin" if is_admin else (matched.role or "Property Manager"),
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

        is_admin = mgr.role == "Overall Admin"
        if is_admin:
            props = db.query(PropertyAccount).all()
        else:
            props = db.query(PropertyAccount).filter(PropertyAccount.manager_id == mgr.id).all()

        prop_responses = [
            PropertyResponse(
                firmId=p.firm_id,
                firmName=p.firm_name,
                name=p.name,
                email=p.email,
                firmLogo=p.firm_logo,
                eSignature=p.e_signature,
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

        return {
            "id": mgr.id,
            "name": mgr.name,
            "email": mgr.email,
            "role": "Overall Admin" if is_admin else (mgr.role or "Property Manager"),
            "properties": prop_responses,
            "activeProperty": active_prop
        }
    elif firm_id:
        prop = db.query(PropertyAccount).filter(PropertyAccount.firm_id == firm_id).first()
        if not prop:
            raise HTTPException(status_code=404, detail="Property not found.")
        prop_resp = PropertyResponse(
            firmId=prop.firm_id,
            firmName=prop.firm_name,
            name=prop.name,
            email=prop.email,
            firmLogo=prop.firm_logo,
            eSignature=prop.e_signature,
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
    if mgr and mgr.role == "Overall Admin":
        props = db.query(PropertyAccount).all()
    else:
        props = db.query(PropertyAccount).filter(PropertyAccount.manager_id == manager_id).all()
    return [
        PropertyResponse(
            firmId=p.firm_id,
            firmName=p.firm_name,
            name=p.name,
            email=p.email,
            firmLogo=p.firm_logo,
            eSignature=p.e_signature,
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

    clean_firm = req.firmName.strip()
    if not clean_firm:
        raise HTTPException(status_code=400, detail="Property name is required.")

    firm_id = f"firm_{int(datetime.utcnow().timestamp())}_{uuid.uuid4().hex[:4]}"
    parts = mgr.name.split(" ")
    initials = (parts[0][0] + parts[1][0]).upper() if len(parts) >= 2 else mgr.name[:2].upper()
    email_val = f"{clean_firm.lower().replace(' ', '')}_{uuid.uuid4().hex[:4]}@property.com"

    new_prop = PropertyAccount(
        manager_id=mgr.id,
        firm_id=firm_id,
        firm_name=clean_firm,
        name=mgr.name,
        email=email_val,
        password_hash=mgr.password_hash,
        firm_logo=req.firmLogo,
        e_signature=req.eSignature,
        initials=initials,
        session_timeout_minutes=15
    )
    db.add(new_prop)

    # Initialize default rooms for the new property
    for rm in DEFAULT_ROOMS:
        db.add(RoomModel(firm_id=firm_id, room_number=rm))

    # Initialize register state
    db.add(RegisterStateModel(firm_id=firm_id, is_open=True))

    db.commit()
    db.refresh(new_prop)

    return PropertyResponse(
        firmId=new_prop.firm_id,
        firmName=new_prop.firm_name,
        name=new_prop.name,
        email=new_prop.email,
        firmLogo=new_prop.firm_logo,
        eSignature=new_prop.e_signature,
        sessionTimeoutMinutes=new_prop.session_timeout_minutes or 15,
        role=new_prop.role or "Property Manager",
        initials=new_prop.initials or "PM"
    )


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

    new_account = PropertyAccount(
        firm_id=firm_id,
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
        firmName=new_account.firm_name,
        name=new_account.name,
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
        firmName=matched.firm_name,
        name=matched.name,
        email=matched.email,
        firmLogo=matched.firm_logo,
        eSignature=matched.e_signature,
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
        firmName=current_user.firm_name,
        name=current_user.name,
        email=current_user.email,
        firmLogo=current_user.firm_logo,
        eSignature=current_user.e_signature,
        sessionTimeoutMinutes=current_user.session_timeout_minutes or 15,
        role=current_user.role or "Property Manager",
        initials=current_user.initials or "PM",
        loginTime=datetime.now().strftime("%I:%M %p")
    )


@app.put("/api/auth/profile", response_model=UserProfileResponse)
def update_profile(
    req: ProfileUpdateRequest,
    current_user: PropertyAccount = Depends(get_current_property),
    db: Session = Depends(get_db)
):
    if req.firmName is not None:
        current_user.firm_name = req.firmName.strip()
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
    if req.sessionTimeoutMinutes is not None:
        current_user.session_timeout_minutes = req.sessionTimeoutMinutes

    db.commit()
    db.refresh(current_user)

    return UserProfileResponse(
        firmId=current_user.firm_id,
        firmName=current_user.firm_name,
        name=current_user.name,
        email=current_user.email,
        firmLogo=current_user.firm_logo,
        eSignature=current_user.e_signature,
        sessionTimeoutMinutes=current_user.session_timeout_minutes or 15,
        role=current_user.role or "Property Manager",
        initials=current_user.initials or "PM",
        loginTime=datetime.now().strftime("%I:%M %p")
    )


# --- ROOMS ENDPOINTS ---

@app.get("/api/rooms", response_model=List[str])
def get_rooms(
    current_user: PropertyAccount = Depends(get_current_property),
    db: Session = Depends(get_db)
):
    rooms = db.query(RoomModel).filter(RoomModel.firm_id == current_user.firm_id).all()
    if not rooms:
        # Seed default rooms if empty
        for rm in DEFAULT_ROOMS:
            db.add(RoomModel(firm_id=current_user.firm_id, room_number=rm))
        db.commit()
        rooms = db.query(RoomModel).filter(RoomModel.firm_id == current_user.firm_id).all()
    
    room_list = [r.room_number for r in rooms]
    return sorted(room_list, key=lambda x: (x.isdigit(), int(x) if x.isdigit() else x))


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

    new_room = RoomModel(firm_id=current_user.firm_id, room_number=clean_num)
    db.add(new_room)
    db.commit()
    return {"success": True}


@app.delete("/api/rooms/{room_number}")
def delete_room(
    room_number: str,
    current_user: PropertyAccount = Depends(get_current_property),
    db: Session = Depends(get_db)
):
    room = db.query(RoomModel).filter(
        RoomModel.firm_id == current_user.firm_id,
        RoomModel.room_number == room_number
    ).first()
    if room:
        db.delete(room)
        db.commit()
    return {"success": True}


# --- BOOKINGS ENDPOINTS ---

@app.get("/api/bookings", response_model=List[BookingResponse])
def get_bookings(
    current_user: PropertyAccount = Depends(get_current_property),
    db: Session = Depends(get_db)
):
    bookings = db.query(BookingModel).filter(BookingModel.firm_id == current_user.firm_id).all()
    res = []
    for b in bookings:
        res.append(BookingResponse(
            id=b.id,
            manualId=b.manual_id or b.id,
            guestName=b.guest_name,
            phone=b.phone or "",
            email=b.email or "",
            room=b.room,
            checkIn=b.check_in,
            checkOut=b.check_out,
            amountPaid=b.amount_paid,
            paidVia=b.paid_via or "Cash",
            notes=b.notes or "",
            idCard=b.id_card,
            idCardName=b.id_card_name or "ID Photo",
            status=b.status or "Upcoming",
            isHidden=bool(b.is_hidden),
            createdAt=b.created_at
        ))
    return res


@app.post("/api/bookings", response_model=BookingResponse)
def create_booking(
    req: BookingCreate,
    current_user: PropertyAccount = Depends(get_current_property),
    db: Session = Depends(get_db)
):
    if req.id and req.id.startswith("ASZ-"):
        booking_id = req.id
    else:
        prop_bookings = db.query(BookingModel).filter(BookingModel.firm_id == current_user.firm_id).all()
        max_num = 0
        for pb in prop_bookings:
            if pb.id and pb.id.startswith("ASZ-"):
                try:
                    num_part = int(pb.id.replace("ASZ-", ""))
                    if num_part > max_num:
                        max_num = num_part
                except ValueError:
                    pass
        booking_id = f"ASZ-{(max_num + 1):03d}"

    now_iso = datetime.utcnow().isoformat() + "Z"

    new_b = BookingModel(
        id=booking_id,
        manual_id=req.manualId.strip() if req.manualId else booking_id,
        firm_id=current_user.firm_id,
        guest_name=req.guestName.strip(),
        phone=req.phone,
        email=req.email,
        room=req.room,
        check_in=req.checkIn,
        check_out=req.checkOut,
        amount_paid=req.amountPaid,
        paid_via=req.paidVia or "Cash",
        notes=req.notes,
        id_card=req.idCard,
        id_card_name=req.idCardName or "ID Photo",
        status=req.status or "Upcoming",
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
        room=new_b.room,
        checkIn=new_b.check_in,
        checkOut=new_b.check_out,
        amountPaid=new_b.amount_paid,
        paidVia=new_b.paid_via or "Cash",
        notes=new_b.notes or "",
        idCard=new_b.id_card,
        idCardName=new_b.id_card_name or "ID Photo",
        status=new_b.status or "Upcoming",
        isHidden=bool(new_b.is_hidden),
        createdAt=new_b.created_at
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
        checkIn=b.check_in,
        checkOut=b.check_out,
        amountPaid=b.amount_paid,
        paidVia=b.paid_via or "Cash",
        notes=b.notes or "",
        idCard=b.id_card,
        idCardName=b.id_card_name or "ID Photo",
        status=b.status,
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
        checkIn=b.check_in,
        checkOut=b.check_out,
        amountPaid=b.amount_paid,
        paidVia=b.paid_via or "Cash",
        notes=b.notes or "",
        idCard=b.id_card,
        idCardName=b.id_card_name or "ID Photo",
        status=b.status,
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
        prop_bookings = db.query(BookingModel).filter(BookingModel.firm_id == current_user.firm_id).all()
        max_num = 0
        for pb in prop_bookings:
            if pb.id and pb.id.startswith("ASZ-"):
                try:
                    num_part = int(pb.id.replace("ASZ-", ""))
                    if num_part > max_num:
                        max_num = num_part
                except ValueError:
                    pass
        new_id = f"ASZ-{(max_num + 1):03d}"
        hidden_b = BookingModel(
            id=new_id,
            manual_id=f"HIDDEN-{b.manual_id or b.id}",
            firm_id=current_user.firm_id,
            guest_name=f"[HIDDEN BOOKING] Room {b.room}",
            phone=b.phone or "",
            email=b.email or "",
            room=b.room,
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
            phone=b.phone or "", email=b.email or "", room=b.room, checkIn=b.check_in,
            checkOut=b.check_out, amountPaid=b.amount_paid, paidVia=b.paid_via or "Cash",
            notes=b.notes or "", idCard=b.id_card, idCardName=b.id_card_name or "ID Photo",
            status=b.status, isHidden=bool(b.is_hidden), createdAt=b.created_at
        ),
        "hiddenBooking": BookingResponse(
            id=hidden_booking.id, manualId=hidden_booking.manual_id or hidden_booking.id,
            guestName=hidden_booking.guest_name, phone=hidden_booking.phone or "",
            email=hidden_booking.email or "", room=hidden_booking.room,
            checkIn=hidden_booking.check_in, checkOut=hidden_booking.check_out,
            amountPaid=hidden_booking.amount_paid, paidVia=hidden_booking.paid_via or "Cash",
            notes=hidden_booking.notes or "", idCard=hidden_booking.id_card,
            idCardName=hidden_booking.id_card_name or "ID Photo",
            status=hidden_booking.status, isHidden=True, createdAt=hidden_booking.created_at
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
        checkIn=b.check_in,
        checkOut=b.check_out,
        amountPaid=b.amount_paid,
        paidVia=b.paid_via or "Cash",
        notes=b.notes or "",
        idCard=b.id_card,
        idCardName=b.id_card_name or "ID Photo",
        status=b.status,
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
        b.room = req.room
    if req.checkIn is not None:
        b.check_in = req.checkIn
    if req.checkOut is not None:
        b.check_out = req.checkOut
    if req.amountPaid is not None:
        b.amount_paid = req.amountPaid
    if req.paidVia is not None:
        b.paid_via = req.paidVia
    if req.notes is not None:
        b.notes = req.notes
    if req.idCard is not None:
        b.id_card = req.idCard
    if req.idCardName is not None:
        b.id_card_name = req.idCardName
    if req.status is not None:
        b.status = req.status
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
        checkIn=b.check_in,
        checkOut=b.check_out,
        amountPaid=b.amount_paid,
        paidVia=b.paid_via or "Cash",
        notes=b.notes or "",
        idCard=b.id_card,
        idCardName=b.id_card_name or "ID Photo",
        status=b.status or "Upcoming",
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
    exp_id = req.id if req.id else f"EXP-{int(uuid.uuid4().int % 9000 + 100)}"
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
    bill_id = req.id if req.id else f"BILL-{int(uuid.uuid4().int % 9000 + 400)}"
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

def send_invitation_email(recipient_email: str, property_name: str, invite_url: str, admin_sender_email: str = ""):
    """
    Sends an invitation email dynamically from the registered Overall Admin's email address.
    Logs email details and gracefully handles network SMTP delivery.
    """
    admin_sender = admin_sender_email or os.environ.get("SMTP_EMAIL", "admin@hotel.com")
    smtp_pass = os.environ.get("SMTP_PASSWORD", "")
    subject = f"Invitation to manage {property_name}"
    body = (
        f"Hello,\n\n"
        f"You have been invited by the Overall Admin ({admin_sender}) to register as the Property Manager for '{property_name}'.\n\n"
        f"Please click the secure activation link below to complete your setup:\n"
        f"{invite_url}\n\n"
        f"Best regards,\n"
        f"Hotel Operations Team"
    )
    if smtp_pass:
        try:
            import smtplib
            from email.mime.text import MIMEText
            msg = MIMEText(body)
            msg['Subject'] = subject
            msg['From'] = admin_sender
            msg['To'] = recipient_email
            with smtplib.SMTP('smtp.gmail.com', 587) as server:
                server.starttls()
                server.login(admin_sender, smtp_pass)
                server.sendmail(admin_sender, [recipient_email], msg.as_string())
            print(f"[SMTP DISPATCH SUCCESS] Email sent to {recipient_email}")
        except Exception as e:
            print(f"[SMTP DISPATCH NOTICE] Could not deliver live SMTP ({e}). Activation Link: {invite_url}")
    else:
        print(f"[INVITATION DISPATCH LOG] From: {admin_sender} -> To: {recipient_email} | Link: {invite_url}")

@app.post("/api/invitations/send")
def send_invitation(
    req: InvitationCreateRequest,
    db: Session = Depends(get_db),
    mgr_token_payload: dict = Depends(get_manager_me)
):
    if mgr_token_payload.get("role") != "Overall Admin":
        raise HTTPException(status_code=403, detail="Only Overall Admin can send manager invitations.")

    admin_email = mgr_token_payload.get("email") or "admin@hotel.com"

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

    invite_url = f"http://localhost:5173/#register?token={token}"
    send_invitation_email(req.email.strip(), prop.firm_name, invite_url, admin_email)

    return {
        "id": invite.id,
        "propertyId": invite.property_id,
        "propertyName": invite.property_name,
        "email": invite.email,
        "senderEmail": invite.sender_email,
        "status": invite.status,
        "inviteUrl": invite_url,
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
        firmName=prop.firm_name,
        name=prop.name,
        email=prop.email,
        firmLogo=prop.firm_logo,
        eSignature=prop.e_signature,
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
    db: Session = Depends(get_db),
    mgr_token_payload: dict = Depends(get_manager_me)
):
    if mgr_token_payload.get("role") != "Overall Admin":
        raise HTTPException(status_code=403, detail="Only Overall Admin can view invitations.")

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
            "inviteUrl": f"http://localhost:5173/#register?token={inv.id}",
            "createdAt": inv.created_at.isoformat() if inv.created_at else ""
        })
    return res
