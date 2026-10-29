from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional, List, Any

class ManagerRegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    phone: Optional[str] = None

class ManagerLoginRequest(BaseModel):
    identity: str
    password: str

class PropertyCreateRequest(BaseModel):
    firmName: Optional[str] = None
    propertyCode: Optional[str] = None
    managerId: Optional[str] = None
    managerName: Optional[str] = None
    ownerName: Optional[str] = None
    ownerPhone: Optional[str] = None
    tnebNumber: Optional[str] = None
    firmLogo: Optional[str] = None
    eSignature: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    mapLocation: Optional[str] = None
    checkinBufferMinutes: Optional[int] = 120
    initialRooms: Optional[List[Any]] = None
    initialEmployees: Optional[List[Any]] = None

class PropertyUpdateRequest(BaseModel):
    propertyCode: Optional[str] = None
    firmName: Optional[str] = None
    managerId: Optional[str] = None
    managerName: Optional[str] = None
    name: Optional[str] = None
    ownerName: Optional[str] = None
    ownerPhone: Optional[str] = None
    tnebNumber: Optional[str] = None
    firmLogo: Optional[str] = None
    eSignature: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    mapLocation: Optional[str] = None
    checkinBufferMinutes: Optional[int] = None

class PropertyResponse(BaseModel):
    firmId: str
    propertyCode: Optional[str] = None
    firmName: str
    name: str
    managerId: Optional[str] = None
    ownerName: Optional[str] = None
    ownerPhone: Optional[str] = None
    tnebNumber: Optional[str] = None
    email: Optional[str] = None
    firmLogo: Optional[str] = None
    eSignature: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    mapLocation: Optional[str] = None
    checkinBufferMinutes: int = 120
    sessionTimeoutMinutes: int = 15
    role: str = "Property Manager"
    initials: str

class ManagerResponse(BaseModel):
    id: str
    name: str
    email: str
    phone: Optional[str] = None
    role: str = "Super Admin"
    properties: List[PropertyResponse] = []
    activeProperty: Optional[PropertyResponse] = None

class RegisterRequest(BaseModel):
    firmName: str
    propertyCode: Optional[str] = None
    ownerName: Optional[str] = None
    ownerPhone: Optional[str] = None
    tnebNumber: Optional[str] = None
    name: str
    email: Optional[str] = None
    password: str

class LoginRequest(BaseModel):
    identity: str
    password: str

class UserProfileResponse(BaseModel):
    firmId: str
    propertyCode: Optional[str] = None
    firmName: str
    name: str
    managerId: Optional[str] = None
    ownerName: Optional[str] = None
    ownerPhone: Optional[str] = None
    tnebNumber: Optional[str] = None
    email: Optional[str] = None
    firmLogo: Optional[str] = None
    eSignature: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    mapLocation: Optional[str] = None
    checkinBufferMinutes: Optional[int] = 120
    sessionTimeoutMinutes: int = 15
    role: str = "Property Manager"
    initials: str
    loginTime: Optional[str] = None

class ProfileUpdateRequest(BaseModel):
    firmName: Optional[str] = None
    propertyCode: Optional[str] = None
    name: Optional[str] = None
    ownerName: Optional[str] = None
    ownerPhone: Optional[str] = None
    tnebNumber: Optional[str] = None
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
    room: Optional[str] = None
    guestCount: Optional[int] = 1
    adults: Optional[int] = 1
    children: Optional[int] = 0
    checkIn: str
    checkOut: str
    amountPaid: float = 0.0
    totalAmount: Optional[float] = 0.0
    paymentStatus: Optional[str] = None
    paidVia: Optional[str] = "Cash"
    txnId: Optional[str] = None
    notes: Optional[str] = ""
    idCard: Optional[str] = None
    idCardName: Optional[str] = "ID Photo"
    idCardType: Optional[str] = None
    idCardNumber: Optional[str] = None
    documents: Optional[List[Any]] = []
    status: Optional[str] = "Upcoming"
    bookingType: Optional[str] = "Walk-in"
    isPrepaid: Optional[bool] = False
    isGuaranteed: Optional[bool] = False
    isHidden: Optional[bool] = False
    isConfidential: Optional[bool] = False
    paymentOption: Optional[str] = None

class BookingCreate(BookingBase):
    manualId: Optional[str] = None

class BookingUpdate(BaseModel):
    manualId: Optional[str] = None
    guestName: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    room: Optional[str] = None
    guestCount: Optional[int] = None
    adults: Optional[int] = None
    children: Optional[int] = None
    checkIn: Optional[str] = None
    checkOut: Optional[str] = None
    amountPaid: Optional[float] = None
    totalAmount: Optional[float] = None
    paymentStatus: Optional[str] = None
    paidVia: Optional[str] = None
    txnId: Optional[str] = None
    notes: Optional[str] = None
    idCard: Optional[str] = None
    idCardName: Optional[str] = None
    idCardType: Optional[str] = None
    idCardNumber: Optional[str] = None
    documents: Optional[List[Any]] = None
    paymentOption: Optional[str] = None
    status: Optional[str] = None
    bookingType: Optional[str] = None
    isPrepaid: Optional[bool] = None
    isGuaranteed: Optional[bool] = None
    isHidden: Optional[bool] = None
    isConfidential: Optional[bool] = None

class BookingResponse(BookingBase):
    id: str
    createdAt: Optional[str] = None
    confirmedAt: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class BulkImportBookingItem(BaseModel):
    id: Optional[str] = None
    manualId: Optional[str] = None
    guestName: str
    phone: Optional[str] = ""
    email: Optional[str] = ""
    room: Optional[str] = None
    guestCount: Optional[int] = 1
    adults: Optional[int] = 1
    children: Optional[int] = 0
    checkIn: str
    checkOut: str
    amountPaid: Optional[float] = 0.0
    totalAmount: Optional[float] = 0.0
    paymentStatus: Optional[str] = None
    paidVia: Optional[str] = "Cash"
    txnId: Optional[str] = None
    notes: Optional[str] = ""
    idCard: Optional[str] = None
    idCardName: Optional[str] = "ID Photo"
    idCardType: Optional[str] = None
    idCardNumber: Optional[str] = None
    status: Optional[str] = None
    bookingType: Optional[str] = "OTA"
    isPrepaid: Optional[bool] = False
    isGuaranteed: Optional[bool] = False

class BulkImportRequest(BaseModel):
    bookings: List[BulkImportBookingItem]

class BulkImportResponse(BaseModel):
    success: bool
    importedCount: int
    skippedDuplicatesCount: int
    importedBookings: List[BookingResponse]

class AllotRoomRequest(BaseModel):
    room: str
    status: Optional[str] = None
    isGuaranteed: Optional[bool] = True

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

class ExpenseUpdate(BaseModel):
    date: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    amount: Optional[float] = None

class ExpenseResponse(ExpenseBase):
    id: str
    createdAt: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class AddOnItem(BaseModel):
    id: str
    name: str
    amount: float

class BillBase(BaseModel):
    id: Optional[str] = None
    billNumber: Optional[str] = None
    propertyName: Optional[str] = None
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
    billNumber: Optional[str] = None
    propertyName: Optional[str] = None
    guestName: Optional[str] = None
    roomNo: Optional[str] = None
    roomCharge: Optional[float] = None
    addOns: Optional[List[Any]] = None
    total: Optional[float] = None
    date: Optional[str] = None

class BillResponse(BillBase):
    id: str
    model_config = ConfigDict(from_attributes=True)

class RoomCreate(BaseModel):
    roomNumber: str
    roomType: Optional[str] = "Standard"
    isStaffRoom: Optional[bool] = False

class RoomUpdate(BaseModel):
    roomNumber: str
    roomType: Optional[str] = "Standard"
    isStaffRoom: Optional[bool] = False

class BulkRoomsCreate(BaseModel):
    rooms: List[RoomCreate]

class RoomDetailResponse(BaseModel):
    roomNumber: str
    roomType: str = "Standard"
    isStaffRoom: bool = False
    isOccupied: bool = False
    isAvailable: bool = True

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
    model_config = ConfigDict(from_attributes=True)

class AcceptInvitationRequest(BaseModel):
    token: str
    name: str
    password: str

class ManagerCreateRequest(BaseModel):
    name: str
    email: str
    propertyId: str
    tempPassword: str
    role: Optional[str] = "Manager"  # "Admin" or "Manager"

class FeatureToggleRequest(BaseModel):
    role: str
    features: dict

class ChangePasswordRequest(BaseModel):
    currentPassword: str
    newPassword: str

class EmployeeCreate(BaseModel):
    name: str
    role: str
    phone: Optional[str] = None
    email: Optional[str] = None

class EmployeeUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None

class EmployeeResponse(BaseModel):
    id: str
    firmId: str
    name: str
    role: str
    phone: Optional[str] = None
    email: Optional[str] = None
    createdAt: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

