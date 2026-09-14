from pydantic import BaseModel, EmailStr
from typing import Optional, List, Any

class ManagerRegisterRequest(BaseModel):
    name: str
    email: str
    password: str

class ManagerLoginRequest(BaseModel):
    identity: str
    password: str

class PropertyCreateRequest(BaseModel):
    firmName: str
    firmLogo: Optional[str] = None
    eSignature: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None

class PropertyResponse(BaseModel):
    firmId: str
    firmName: str
    name: str
    email: Optional[str] = None
    firmLogo: Optional[str] = None
    eSignature: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    sessionTimeoutMinutes: int = 15
    role: str = "Property Manager"
    initials: str

class ManagerResponse(BaseModel):
    id: str
    name: str
    email: str
    role: str = "Super Admin"
    properties: List[PropertyResponse] = []
    activeProperty: Optional[PropertyResponse] = None

class RegisterRequest(BaseModel):
    firmName: str
    name: str
    email: Optional[str] = None
    password: str

class LoginRequest(BaseModel):
    identity: str
    password: str

class UserProfileResponse(BaseModel):
    firmId: str
    firmName: str
    name: str
    email: Optional[str] = None
    firmLogo: Optional[str] = None
    eSignature: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    sessionTimeoutMinutes: int = 15
    role: str = "Property Manager"
    initials: str
    loginTime: Optional[str] = None

class ProfileUpdateRequest(BaseModel):
    firmName: Optional[str] = None
    name: Optional[str] = None
    email: Optional[str] = None
    firmLogo: Optional[str] = None
    eSignature: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    sessionTimeoutMinutes: Optional[int] = None

class BookingBase(BaseModel):
    id: Optional[str] = None
    manualId: Optional[str] = None
    guestName: str
    phone: Optional[str] = ""
    email: Optional[str] = ""
    room: str
    checkIn: str
    checkOut: str
    amountPaid: float = 0.0
    paidVia: Optional[str] = "Cash"
    notes: Optional[str] = ""
    idCard: Optional[str] = None
    idCardName: Optional[str] = "ID Photo"
    status: Optional[str] = "Upcoming"
    isHidden: Optional[bool] = False

class BookingCreate(BookingBase):
    manualId: str

class BookingUpdate(BaseModel):
    manualId: Optional[str] = None
    guestName: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    room: Optional[str] = None
    checkIn: Optional[str] = None
    checkOut: Optional[str] = None
    amountPaid: Optional[float] = None
    paidVia: Optional[str] = None
    notes: Optional[str] = None
    idCard: Optional[str] = None
    idCardName: Optional[str] = None
    status: Optional[str] = None
    isHidden: Optional[bool] = None

class BookingResponse(BookingBase):
    id: str
    createdAt: Optional[str] = None

    class Config:
        from_attributes = True

class EarlyCheckoutRequest(BaseModel):
    createHiddenSlot: bool = True

class ExpenseBase(BaseModel):
    id: Optional[str] = None
    date: str
    category: str
    description: Optional[str] = ""
    amount: float = 0.0

class ExpenseCreate(ExpenseBase):
    pass

class ExpenseResponse(ExpenseBase):
    id: str
    createdAt: Optional[str] = None

    class Config:
        from_attributes = True

class AddOnItem(BaseModel):
    id: str
    name: str
    amount: float

class BillBase(BaseModel):
    id: Optional[str] = None
    bookingId: Optional[str] = None
    guestName: str
    roomNo: str
    roomCharge: float = 0.0
    addOns: List[Any] = []
    total: float = 0.0
    date: str

class BillCreate(BillBase):
    pass

class BillUpdate(BaseModel):
    guestName: Optional[str] = None
    roomNo: Optional[str] = None
    roomCharge: Optional[float] = None
    addOns: Optional[List[Any]] = None
    total: Optional[float] = None
    date: Optional[str] = None

class BillResponse(BillBase):
    id: str

    class Config:
        from_attributes = True

class RoomCreate(BaseModel):
    roomNumber: str

class RegisterStateResponse(BaseModel):
    isOpen: bool

class InvitationCreateRequest(BaseModel):
    propertyId: str
    email: str

class InvitationResponse(BaseModel):
    id: str
    propertyId: str
    propertyName: str
    email: str
    senderEmail: str
    status: str
    inviteUrl: str
    createdAt: str

    class Config:
        from_attributes = True

class AcceptInvitationRequest(BaseModel):
    token: str
    name: str
    password: str

class ManagerCreateRequest(BaseModel):
    name: str
    email: str
    propertyId: str
    tempPassword: str

class ChangePasswordRequest(BaseModel):
    currentPassword: str
    newPassword: str
