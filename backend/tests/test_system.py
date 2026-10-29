import os
import sys
import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Setup path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ROOT_DIR = os.path.dirname(BASE_DIR)
for p in (ROOT_DIR, BASE_DIR):
    if p not in sys.path:
        sys.path.insert(0, p)

from backend.database import Base, get_db
from backend.main import app

# Use isolated in-memory SQLite database for test suite
TEST_DATABASE_URL = "sqlite:///:memory:"

test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(scope="session", autouse=True)
def setup_database():
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)

@pytest.fixture
def client():
    return TestClient(app)

def test_system_status_initial(client):
    res = client.get("/api/auth/system-status")
    assert res.status_code == 200
    data = res.json()
    assert "isAdminRegistered" in data

def test_admin_registration_and_login(client):
    # Register Super Admin
    reg_payload = {
        "name": "Super Admin Test",
        "email": "superadmin_test@hotel.com",
        "password": "AdminPassword123",
        "phone": "9876543210"
    }
    res = client.post("/api/auth/admin/register", json=reg_payload)
    assert res.status_code == 200
    data = res.json()
    assert "token" in data
    assert data["manager"]["email"] == "superadmin_test@hotel.com"
    assert data["manager"]["role"] == "Super Admin"

    # Cannot register second Super Admin
    dup_res = client.post("/api/auth/admin/register", json=reg_payload)
    assert dup_res.status_code == 400

    # Login
    login_res = client.post("/api/auth/manager/login", json={
        "identity": "superadmin_test@hotel.com",
        "password": "AdminPassword123"
    })
    assert login_res.status_code == 200
    login_data = login_res.json()
    assert "token" in login_data
    assert login_data["manager"]["role"] == "Super Admin"

def test_property_lifecycle(client):
    # Get Admin Token
    login_res = client.post("/api/auth/manager/login", json={
        "identity": "superadmin_test@hotel.com",
        "password": "AdminPassword123"
    })
    token = login_res.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create Property
    prop_payload = {
        "firmName": "Seaside Resort",
        "propertyCode": "SEA-01",
        "ownerName": "John Doe",
        "ownerPhone": "9876543211",
        "address": "Beach Road, Goa",
        "initialRooms": [
            {"roomNumber": "101", "roomType": "Deluxe", "isStaffRoom": False},
            {"roomNumber": "102", "roomType": "Standard", "isStaffRoom": False},
            {"roomNumber": "103", "roomType": "Staff Quarters", "isStaffRoom": True}
        ]
    }
    res = client.post("/api/properties", json=prop_payload, headers=headers)
    assert res.status_code == 200
    prop_data = res.json()
    firm_id = prop_data["firmId"]
    assert prop_data["firmName"] == "Seaside Resort"
    assert prop_data["propertyCode"] == "SEA-01"

    # List Properties
    list_res = client.get("/api/properties", headers=headers)
    assert list_res.status_code == 200
    assert any(p["firmId"] == firm_id for p in list_res.json())

    # Update Property
    update_res = client.put(f"/api/properties/{firm_id}", json={
        "firmName": "Seaside Luxury Resort"
    }, headers=headers)
    assert update_res.status_code == 200
    assert update_res.json()["firmName"] == "Seaside Luxury Resort"

def test_rooms_and_availability(client):
    login_res = client.post("/api/auth/manager/login", json={
        "identity": "superadmin_test@hotel.com",
        "password": "AdminPassword123"
    })
    token = login_res.json()["token"]
    prop = login_res.json()["manager"]["properties"][0]
    firm_id = prop["firmId"]
    headers = {"Authorization": f"Bearer {token}", "X-Property-ID": firm_id}

    # Add single room
    add_res = client.post("/api/rooms", json={"roomNumber": "104", "roomType": "Suite", "isStaffRoom": False}, headers=headers)
    assert add_res.status_code == 200

    # Duplicate room should fail
    dup_res = client.post("/api/rooms", json={"roomNumber": "104"}, headers=headers)
    assert dup_res.status_code == 400

    # Add bulk rooms
    bulk_res = client.post("/api/rooms/bulk", json={
        "rooms": [
            {"roomNumber": "201", "roomType": "Deluxe"},
            {"roomNumber": "202", "roomType": "Deluxe"}
        ]
    }, headers=headers)
    assert bulk_res.status_code == 200
    assert bulk_res.json()["createdCount"] == 2

    # Check available rooms
    avail_res = client.get("/api/rooms/available?checkIn=2026-11-01&checkOut=2026-11-03", headers=headers)
    assert avail_res.status_code == 200
    avail_data = avail_res.json()
    assert "101" in avail_data["availableRooms"]
    assert "103" not in avail_data["availableRooms"]  # staff room excluded

def test_booking_creation_and_room_collision(client):
    login_res = client.post("/api/auth/manager/login", json={
        "identity": "superadmin_test@hotel.com",
        "password": "AdminPassword123"
    })
    token = login_res.json()["token"]
    prop = login_res.json()["manager"]["properties"][0]
    firm_id = prop["firmId"]
    headers = {"Authorization": f"Bearer {token}", "X-Property-ID": firm_id}

    # 1. Create booking for room 101: 2026-11-10 to 2026-11-15
    booking_1 = {
        "guestName": "Alice Johnson",
        "phone": "9123456780",
        "room": "101",
        "checkIn": "2026-11-10",
        "checkOut": "2026-11-15",
        "totalAmount": 5000.0,
        "amountPaid": 5000.0,
        "paidVia": "Cash",
        "idCardType": "Aadhaar Card",
        "status": "Upcoming"
    }
    res1 = client.post("/api/bookings", json=booking_1, headers=headers)
    assert res1.status_code == 200
    b1_data = res1.json()
    assert b1_data["room"] == "101"

    # 2. Overlapping booking for room 101 should be rejected!
    booking_2_collide = {
        "guestName": "Bob Smith",
        "phone": "9123456781",
        "room": "101",
        "checkIn": "2026-11-12",
        "checkOut": "2026-11-14",
        "totalAmount": 2000.0,
        "amountPaid": 2000.0,
        "paidVia": "Cash",
        "idCardType": "Passport",
        "status": "Upcoming"
    }
    res2 = client.post("/api/bookings", json=booking_2_collide, headers=headers)
    # This should fail with 400 because Room 101 is already booked!
    assert res2.status_code == 400, f"Expected 400 collision error, got {res2.status_code}: {res2.text}"

def test_booking_date_validation(client):
    login_res = client.post("/api/auth/manager/login", json={
        "identity": "superadmin_test@hotel.com",
        "password": "AdminPassword123"
    })
    token = login_res.json()["token"]
    prop = login_res.json()["manager"]["properties"][0]
    firm_id = prop["firmId"]
    headers = {"Authorization": f"Bearer {token}", "X-Property-ID": firm_id}

    # Invalid dates: checkOut <= checkIn
    invalid_booking = {
        "guestName": "Invalid Date Guest",
        "phone": "9123456782",
        "checkIn": "2026-11-20",
        "checkOut": "2026-11-18",
        "idCardType": "Aadhaar Card"
    }
    res = client.post("/api/bookings", json=invalid_booking, headers=headers)
    assert res.status_code == 400

def test_checkin_and_checkout_workflow(client):
    login_res = client.post("/api/auth/manager/login", json={
        "identity": "superadmin_test@hotel.com",
        "password": "AdminPassword123"
    })
    token = login_res.json()["token"]
    prop = login_res.json()["manager"]["properties"][0]
    firm_id = prop["firmId"]
    headers = {"Authorization": f"Bearer {token}", "X-Property-ID": firm_id}

    # Create stay with unpaid balance
    stay = {
        "guestName": "Charlie Brown",
        "phone": "9123456783",
        "room": "102",
        "checkIn": "2026-11-01",
        "checkOut": "2026-11-05",
        "totalAmount": 4000.0,
        "amountPaid": 2000.0,
        "paidVia": "Cash",
        "idCardType": "Voter ID",
        "status": "Upcoming"
    }
    res = client.post("/api/bookings", json=stay, headers=headers)
    assert res.status_code == 200
    b_id = res.json()["id"]

    # Check in
    checkin_res = client.post(f"/api/bookings/{b_id}/checkin", headers=headers)
    assert checkin_res.status_code == 200
    assert checkin_res.json()["status"] == "In-House"

    # Try to checkout without full payment -> must be BLOCKED
    checkout_res = client.post(f"/api/bookings/{b_id}/checkout", headers=headers)
    assert checkout_res.status_code == 400
    assert "Full payment is required" in checkout_res.json()["detail"]

    # Settle payment
    update_res = client.put(f"/api/bookings/{b_id}", json={
        "amountPaid": 4000.0,
        "paymentStatus": "Fully Paid"
    }, headers=headers)
    assert update_res.status_code == 200
    assert update_res.json()["paymentStatus"] == "Fully Paid"

    # Checkout now succeeds
    checkout_success = client.post(f"/api/bookings/{b_id}/checkout", headers=headers)
    assert checkout_success.status_code == 200
    assert checkout_success.json()["status"] == "Completed"

def test_sync_property_data(client):
    login_res = client.post("/api/auth/manager/login", json={
        "identity": "superadmin_test@hotel.com",
        "password": "AdminPassword123"
    })
    token = login_res.json()["token"]
    prop = login_res.json()["manager"]["properties"][0]
    firm_id = prop["firmId"]
    headers = {"Authorization": f"Bearer {token}", "X-Property-ID": firm_id}

    sync_res = client.get("/api/sync", headers=headers)
    assert sync_res.status_code == 200
    data = sync_res.json()
    assert "rooms" in data
    assert "roomDetails" in data
    assert "bookings" in data
    assert "expenses" in data
    assert "bills" in data
    assert "registerStatus" in data
    assert "featureToggles" in data


def test_expense_crud(client):
    login_res = client.post("/api/auth/manager/login", json={
        "identity": "superadmin_test@hotel.com",
        "password": "AdminPassword123"
    })
    token = login_res.json()["token"]
    prop = login_res.json()["manager"]["properties"][0]
    firm_id = prop["firmId"]
    headers = {"Authorization": f"Bearer {token}", "X-Property-ID": firm_id}

    # 1. Create expense
    exp_payload = {
        "title": "Laundry Detergent",
        "category": "Housekeeping",
        "amount": 450.0,
        "paymentMode": "Cash",
        "date": "2026-11-01"
    }
    create_res = client.post("/api/expenses", json=exp_payload, headers=headers)
    assert create_res.status_code == 200
    exp_data = create_res.json()
    exp_id = exp_data["id"]
    assert exp_data["amount"] == 450.0

    # 2. Get expenses
    get_res = client.get("/api/expenses", headers=headers)
    assert get_res.status_code == 200
    assert any(e["id"] == exp_id for e in get_res.json())

    # 3. Update expense (New PUT endpoint)
    update_res = client.put(f"/api/expenses/{exp_id}", json={
        "description": "Bulk Laundry Detergent",
        "amount": 550.0
    }, headers=headers)
    assert update_res.status_code == 200
    updated_data = update_res.json()
    assert updated_data["description"] == "Bulk Laundry Detergent"
    assert updated_data["amount"] == 550.0

    # 4. Delete expense
    del_res = client.delete(f"/api/expenses/{exp_id}", headers=headers)
    assert del_res.status_code == 200
    assert del_res.json()["success"] is True

def test_room_deletion_protection(client):
    login_res = client.post("/api/auth/manager/login", json={
        "identity": "superadmin_test@hotel.com",
        "password": "AdminPassword123"
    })
    token = login_res.json()["token"]
    prop = login_res.json()["manager"]["properties"][0]
    firm_id = prop["firmId"]
    headers = {"Authorization": f"Bearer {token}", "X-Property-ID": firm_id}

    # Add room 205
    client.post("/api/rooms", json={"roomNumber": "205", "roomType": "Standard"}, headers=headers)

    # Book room 205 and check in
    booking_res = client.post("/api/bookings", json={
        "guestName": "David Resident",
        "phone": "9988776655",
        "room": "205",
        "checkIn": "2026-11-01",
        "checkOut": "2026-11-05",
        "totalAmount": 3000.0,
        "amountPaid": 3000.0,
        "paidVia": "Cash",
        "idCardType": "Aadhaar Card"
    }, headers=headers)
    assert booking_res.status_code == 200
    b_id = booking_res.json()["id"]

    # Check in
    client.post(f"/api/bookings/{b_id}/checkin", headers=headers)

    # Attempt to delete room 205 while guest is In-House -> MUST be blocked (400)
    del_res = client.delete("/api/rooms/205", headers=headers)
    assert del_res.status_code == 400
    assert "currently staying in it" in del_res.json()["detail"].lower()

    # Checkout guest
    co_res = client.post(f"/api/bookings/{b_id}/checkout", headers=headers)
    assert co_res.status_code == 200

    # Room 205 can now be safely deleted
    del_ok = client.delete("/api/rooms/205", headers=headers)
    assert del_ok.status_code == 200
    assert del_ok.json()["success"] is True

def test_early_checkout_workflow(client):
    login_res = client.post("/api/auth/manager/login", json={
        "identity": "superadmin_test@hotel.com",
        "password": "AdminPassword123"
    })
    token = login_res.json()["token"]
    prop = login_res.json()["manager"]["properties"][0]
    firm_id = prop["firmId"]
    headers = {"Authorization": f"Bearer {token}", "X-Property-ID": firm_id}

    # Book room 201
    booking_res = client.post("/api/bookings", json={
        "guestName": "Elena Rostova",
        "phone": "9988776644",
        "room": "201",
        "checkIn": "2026-11-01",
        "checkOut": "2026-11-06",
        "totalAmount": 5000.0,
        "amountPaid": 5000.0,
        "paidVia": "UPI",
        "txnId": "UPI9876543210",
        "idCardType": "Passport"
    }, headers=headers)
    assert booking_res.status_code == 200
    b_id = booking_res.json()["id"]

    # Check in
    client.post(f"/api/bookings/{b_id}/checkin", headers=headers)

    # Early checkout
    eco_res = client.post(f"/api/bookings/{b_id}/early-checkout", json={"createHiddenSlot": False}, headers=headers)
    assert eco_res.status_code == 200
    assert eco_res.json()["updatedBooking"]["status"] == "Completed"

    # Cannot early checkout again
    eco_repeat = client.post(f"/api/bookings/{b_id}/early-checkout", json={"createHiddenSlot": False}, headers=headers)
    assert eco_repeat.status_code == 400

def test_employee_crud(client):
    login_res = client.post("/api/auth/manager/login", json={
        "identity": "superadmin_test@hotel.com",
        "password": "AdminPassword123"
    })
    token = login_res.json()["token"]
    prop = login_res.json()["manager"]["properties"][0]
    firm_id = prop["firmId"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create employee
    emp_payload = {
        "name": "Rajesh Kumar",
        "role": "Receptionist",
        "phone": "9811223344",
        "email": "rajesh@hotel.com"
    }
    create_res = client.post(f"/api/properties/{firm_id}/employees", json=emp_payload, headers=headers)
    assert create_res.status_code == 200
    emp_data = create_res.json()
    emp_id = emp_data["id"]
    assert emp_data["name"] == "Rajesh Kumar"

    # 2. List employees
    list_res = client.get(f"/api/properties/{firm_id}/employees", headers=headers)
    assert list_res.status_code == 200
    assert any(e["id"] == emp_id for e in list_res.json())

    # 3. Update employee
    upd_res = client.put(f"/api/employees/{emp_id}", json={
        "name": "Rajesh K.",
        "role": "Senior Receptionist"
    }, headers=headers)
    assert upd_res.status_code == 200
    assert upd_res.json()["role"] == "Senior Receptionist"

    # 4. Delete employee
    del_res = client.delete(f"/api/employees/{emp_id}", headers=headers)
    assert del_res.status_code == 200
    assert del_res.json()["success"] is True

def test_manager_invitation_lifecycle(client):
    login_res = client.post("/api/auth/manager/login", json={
        "identity": "superadmin_test@hotel.com",
        "password": "AdminPassword123"
    })
    token = login_res.json()["token"]
    prop = login_res.json()["manager"]["properties"][0]
    firm_id = prop["firmId"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Admin sends invitation
    inv_payload = {
        "propertyId": firm_id,
        "email": "newmanager@hotel.com"
    }
    inv_res = client.post("/api/invitations/send", json=inv_payload, headers=headers)
    assert inv_res.status_code == 200
    inv_data = inv_res.json()
    token_str = inv_data["id"]
    assert inv_data["status"] == "pending"

    # 2. Get invitation details
    detail_res = client.get(f"/api/invitations/{token_str}")
    assert detail_res.status_code == 200
    assert detail_res.json()["email"] == "newmanager@hotel.com"

    # 3. Accept invitation
    accept_payload = {
        "token": token_str,
        "name": "New Manager",
        "password": "ManagerPassword456"
    }
    accept_res = client.post("/api/invitations/accept", json=accept_payload)
    assert accept_res.status_code == 200
    assert "token" in accept_res.json()

    # 4. New Manager logs in
    mgr_login = client.post("/api/auth/manager/login", json={
        "identity": "newmanager@hotel.com",
        "password": "ManagerPassword456"
    })
    assert mgr_login.status_code == 200
    assert mgr_login.json()["manager"]["email"] == "newmanager@hotel.com"
