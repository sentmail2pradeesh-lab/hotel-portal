import os
import sys

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PARENT_DIR = os.path.dirname(BASE_DIR)
for path_dir in (BASE_DIR, PARENT_DIR):
    if path_dir not in sys.path:
        sys.path.insert(0, path_dir)

from sqlalchemy import Column, Integer, String, Float, Text, Boolean, DateTime
from datetime import datetime

try:
    from backend.database import Base
except (ModuleNotFoundError, ImportError):
    try:
        from database import Base
    except (ModuleNotFoundError, ImportError):
        from .database import Base

class ManagerAccount(Base):
    __tablename__ = "manager_accounts"

    id = Column(String(128), primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    email = Column(String(191), unique=True, index=True, nullable=False)
    phone = Column(String(50), nullable=True, index=True)
    password_hash = Column(String(255), nullable=False)
    temp_password_hash = Column(String(255), nullable=True)
    temp_password_plain = Column(String(255), nullable=True)
    role = Column(String(64), default="Super Admin")  # "Super Admin", "Admin", "Manager"
    created_by = Column(String(128), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class PropertyAccount(Base):
    __tablename__ = "property_accounts"

    id = Column(Integer, primary_key=True, index=True)
    manager_id = Column(String(128), index=True, nullable=True)
    property_code = Column(String(64), index=True, nullable=True)
    firm_id = Column(String(191), unique=True, index=True, nullable=False)
    firm_name = Column(String(255), nullable=False, index=True)
    name = Column(String(255), nullable=False, index=True)
    email = Column(String(191), index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    firm_logo = Column(Text, nullable=True)
    e_signature = Column(Text, nullable=True)
    address = Column(Text, nullable=True)
    phone = Column(String(50), nullable=True)
    owner_name = Column(String(255), nullable=True)
    owner_phone = Column(String(50), nullable=True)
    tneb_number = Column(String(100), nullable=True)
    session_timeout_minutes = Column(Integer, default=15)
    role = Column(String(64), default="Property Manager")
    initials = Column(String(20), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class RoomModel(Base):
    __tablename__ = "rooms"

    id = Column(Integer, primary_key=True, index=True)
    firm_id = Column(String(191), index=True, nullable=False)
    room_number = Column(String(64), nullable=False)
    room_type = Column(String(100), default="Standard")
    is_staff_room = Column(Boolean, default=False)

class BookingModel(Base):
    __tablename__ = "bookings"

    id = Column(String(128), primary_key=True, index=True)
    manual_id = Column(String(64), nullable=True)
    firm_id = Column(String(191), index=True, nullable=False)
    guest_name = Column(String(255), nullable=False)
    phone = Column(String(50), nullable=True)
    email = Column(String(191), nullable=True)
    room = Column(String(64), nullable=True)
    guest_count = Column(Integer, default=1)
    adults = Column(Integer, default=1)
    children = Column(Integer, default=0)
    check_in = Column(String(50), nullable=False)
    check_out = Column(String(50), nullable=False)
    amount_paid = Column(Float, default=0.0)
    paid_via = Column(String(50), default="Cash")
    txn_id = Column(String(128), nullable=True)
    notes = Column(Text, nullable=True)
    id_card = Column(Text, nullable=True)
    id_card_name = Column(String(255), nullable=True)
    status = Column(String(64), default="Upcoming", nullable=True)
    booking_type = Column(String(64), default="Walk-in")  # "Walk-in", "Online Pre-paid", "OTA"
    is_prepaid = Column(Boolean, default=False)
    is_guaranteed = Column(Boolean, default=False)
    is_hidden = Column(Boolean, default=False)
    total_amount = Column(Float, default=0.0, nullable=True)
    payment_status = Column(String(64), default="Fully Paid", nullable=True)
    id_card_type = Column(String(64), nullable=True)
    id_card_number = Column(String(128), nullable=True)
    created_at = Column(String(64), nullable=True)

class ExpenseModel(Base):
    __tablename__ = "expenses"

    id = Column(String(128), primary_key=True, index=True)
    firm_id = Column(String(191), index=True, nullable=False)
    date = Column(String(50), nullable=False)
    category = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    amount = Column(Float, default=0.0)
    created_at = Column(String(64), nullable=True)

class BillModel(Base):
    __tablename__ = "bills"

    id = Column(String(128), primary_key=True, index=True)
    firm_id = Column(String(191), index=True, nullable=False)
    booking_id = Column(String(128), nullable=True)
    guest_name = Column(String(255), nullable=False)
    room_no = Column(String(64), nullable=False)
    room_charge = Column(Float, default=0.0)
    add_ons = Column(Text, default="[]")  # JSON string
    total = Column(Float, default=0.0)
    date = Column(String(50), nullable=False)

class RegisterStateModel(Base):
    __tablename__ = "register_states"

    firm_id = Column(String(191), primary_key=True, index=True)
    is_open = Column(Boolean, default=True)

class InvitationModel(Base):
    __tablename__ = "invitations"

    id = Column(String(128), primary_key=True, index=True)
    property_id = Column(String(191), index=True, nullable=False)
    property_name = Column(String(255), nullable=False)
    email = Column(String(191), nullable=False)
    sender_email = Column(String(191), default="admin@hotel.com")
    status = Column(String(50), default="pending")
    created_at = Column(DateTime, default=datetime.utcnow)

class FeatureToggleModel(Base):
    __tablename__ = "feature_toggles"

    role = Column(String(64), primary_key=True, index=True)  # "Admin", "Manager"
    features_json = Column(Text, default="{}")


