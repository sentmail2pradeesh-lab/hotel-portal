from sqlalchemy import Column, Integer, String, Float, Text, Boolean, DateTime
from datetime import datetime
from backend.database import Base

class ManagerAccount(Base):
    __tablename__ = "manager_accounts"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, default="Super Admin")
    created_at = Column(DateTime, default=datetime.utcnow)

class PropertyAccount(Base):
    __tablename__ = "property_accounts"

    id = Column(Integer, primary_key=True, index=True)
    manager_id = Column(String, index=True, nullable=True)
    firm_id = Column(String, unique=True, index=True, nullable=False)
    firm_name = Column(String, nullable=False)
    name = Column(String, nullable=False)
    email = Column(String, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    firm_logo = Column(Text, nullable=True)
    e_signature = Column(Text, nullable=True)
    session_timeout_minutes = Column(Integer, default=15)
    role = Column(String, default="Property Manager")
    initials = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class RoomModel(Base):
    __tablename__ = "rooms"

    id = Column(Integer, primary_key=True, index=True)
    firm_id = Column(String, index=True, nullable=False)
    room_number = Column(String, nullable=False)

class BookingModel(Base):
    __tablename__ = "bookings"

    id = Column(String, primary_key=True, index=True)
    manual_id = Column(String, nullable=True)
    firm_id = Column(String, index=True, nullable=False)
    guest_name = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    email = Column(String, nullable=True)
    room = Column(String, nullable=False)
    check_in = Column(String, nullable=False)
    check_out = Column(String, nullable=False)
    amount_paid = Column(Float, default=0.0)
    paid_via = Column(String, default="Cash")
    notes = Column(Text, nullable=True)
    id_card = Column(Text, nullable=True)
    id_card_name = Column(String, nullable=True)
    status = Column(String, default="Upcoming", nullable=True)
    is_hidden = Column(Boolean, default=False)
    created_at = Column(String, nullable=True)

class ExpenseModel(Base):
    __tablename__ = "expenses"

    id = Column(String, primary_key=True, index=True)
    firm_id = Column(String, index=True, nullable=False)
    date = Column(String, nullable=False)
    category = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    amount = Column(Float, default=0.0)
    created_at = Column(String, nullable=True)

class BillModel(Base):
    __tablename__ = "bills"

    id = Column(String, primary_key=True, index=True)
    firm_id = Column(String, index=True, nullable=False)
    booking_id = Column(String, nullable=True)
    guest_name = Column(String, nullable=False)
    room_no = Column(String, nullable=False)
    room_charge = Column(Float, default=0.0)
    add_ons = Column(Text, default="[]")  # JSON string
    total = Column(Float, default=0.0)
    date = Column(String, nullable=False)

class RegisterStateModel(Base):
    __tablename__ = "register_states"

    firm_id = Column(String, primary_key=True, index=True)
    is_open = Column(Boolean, default=True)

class InvitationModel(Base):
    __tablename__ = "invitations"

    id = Column(String, primary_key=True, index=True)
    property_id = Column(String, index=True, nullable=False)
    property_name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    sender_email = Column(String, default="mail2pradeesh1621@gmail.com")
    status = Column(String, default="pending")
    created_at = Column(DateTime, default=datetime.utcnow)
