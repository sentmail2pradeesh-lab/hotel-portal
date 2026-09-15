"""
End-to-End Automated System & Regression Test Suite
Covers:
  1. Module & DB initialization in both root and backend CWD
  2. Super Admin status & authentication
  3. Direct Manager creation with temporary password & credentials sharing
  4. Manager login and password change
  5. Room inventory CRUD
  6. Booking lifecycle (Create, Check-in, Early Checkout with Hidden Slot, Completed)
  7. Expense CRUD including null/empty description handling
  8. Bill statement creation, update, and retrieval
  9. Shift Register status toggle
"""

import sys
import os
import uuid
import unittest
from fastapi.testclient import TestClient

# Ensure backend can be imported
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

try:
    from backend.main import app
    from backend.database import get_db, SessionLocal
    from backend.models import ManagerAccount, PropertyAccount, BookingModel, ExpenseModel, BillModel, RoomModel
except ImportError:
    from main import app
    from database import get_db, SessionLocal
    from models import ManagerAccount, PropertyAccount, BookingModel, ExpenseModel, BillModel, RoomModel

client = TestClient(app)

class SystemEndToEndTestSuite(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.db = SessionLocal()
        cls.test_suffix = uuid.uuid4().hex[:6]
        cls.admin_token = None
        cls.admin_id = None
        cls.test_firm_id = None

        # Ensure Super Admin exists or log into existing
        sys_status = client.get("/api/auth/system-status").json()
        if not sys_status.get("isAdminRegistered"):
            reg_resp = client.post("/api/auth/admin/register", json={
                "name": f"Master Admin {cls.test_suffix}",
                "email": f"admin_{cls.test_suffix}@test.com",
                "password": "TestAdminPassword123"
            })
            assert reg_resp.status_code == 200, reg_resp.text
            cls.admin_token = reg_resp.json()["token"]
            cls.admin_id = reg_resp.json()["manager"]["id"]
        else:
            # Login as existing Super Admin or create a dedicated admin session
            admin_user = cls.db.query(ManagerAccount).filter(
                ManagerAccount.role.in_(["Overall Admin", "Super Admin"])
            ).first()
            assert admin_user is not None
            from backend.main import create_access_token
            cls.admin_id = admin_user.id
            cls.admin_token = create_access_token({
                "sub": admin_user.id,
                "manager_id": admin_user.id,
                "role": "Super Admin",
                "email": admin_user.email
            })

        # Ensure at least one test property exists
        prop = cls.db.query(PropertyAccount).first()
        if not prop:
            prop_resp = client.post(
                "/api/properties",
                headers={"Authorization": f"Bearer {cls.admin_token}"},
                json={"firmName": f"Test Grand Resort {cls.test_suffix}"}
            )
            assert prop_resp.status_code == 200, prop_resp.text
            cls.test_firm_id = prop_resp.json()["firmId"]
        else:
            cls.test_firm_id = prop.firm_id

    @classmethod
    def tearDownClass(cls):
        cls.db.close()

    def test_01_system_status(self):
        resp = client.get("/api/auth/system-status")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data["isAdminRegistered"])
        self.assertIsNotNone(data["adminEmail"])

    def test_02_super_admin_properties(self):
        resp = client.get(
            "/api/properties",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        self.assertEqual(resp.status_code, 200)
        props = resp.json()
        self.assertIsInstance(props, list)
        self.assertTrue(len(props) > 0)

    def test_03_direct_manager_creation_and_login(self):
        """
        Tests the direct manager workflow:
        Admin directly creates a manager with temporary password and assigns them to property.
        Manager logs in with temporary password, changes password, and logs in with new password.
        """
        mgr_email = f"mgr_{self.test_suffix}_{uuid.uuid4().hex[:4]}@test.com"
        temp_pass = "Mgr@TempPass2026"
        new_pass = "Mgr@NewSecurePass2026"

        # 1. Super Admin creates manager account
        create_resp = client.post(
            "/api/managers/create",
            headers={"Authorization": f"Bearer {self.admin_token}"},
            json={
                "name": f"Manager Ravi {self.test_suffix}",
                "email": mgr_email,
                "propertyId": self.test_firm_id,
                "tempPassword": temp_pass
            }
        )
        self.assertEqual(create_resp.status_code, 200, create_resp.text)
        create_data = create_resp.json()
        self.assertTrue(create_data["success"])
        self.assertEqual(create_data["manager"]["email"], mgr_email)

        # 2. Super Admin lists managers
        list_resp = client.get(
            "/api/managers",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        self.assertEqual(list_resp.status_code, 200)
        managers = list_resp.json()
        self.assertTrue(any(m["email"] == mgr_email for m in managers))

        # 3. Manager logs in with temporary password
        login_resp = client.post("/api/auth/manager/login", json={
            "identity": mgr_email,
            "password": temp_pass
        })
        self.assertEqual(login_resp.status_code, 200, login_resp.text)
        mgr_token = login_resp.json()["token"]
        self.assertIsNotNone(mgr_token)

        # 4. Manager changes their password
        change_resp = client.post(
            "/api/auth/change-password",
            headers={"Authorization": f"Bearer {mgr_token}"},
            json={
                "currentPassword": temp_pass,
                "newPassword": new_pass
            }
        )
        self.assertEqual(change_resp.status_code, 200, change_resp.text)
        self.assertTrue(change_resp.json()["success"])

        # 5. Manager logs in with new password
        relogin_resp = client.post("/api/auth/manager/login", json={
            "identity": mgr_email,
            "password": new_pass
        })
        self.assertEqual(relogin_resp.status_code, 200, relogin_resp.text)

    def test_04_room_inventory_management(self):
        auth_headers = {
            "Authorization": f"Bearer {self.admin_token}",
            "X-Property-ID": self.test_firm_id
        }
        test_room_no = f"99{uuid.uuid4().hex[:2]}"

        # Add room
        add_resp = client.post("/api/rooms", headers=auth_headers, json={"roomNumber": test_room_no})
        self.assertEqual(add_resp.status_code, 200)

        # Verify room in list
        get_resp = client.get("/api/rooms", headers=auth_headers)
        self.assertEqual(get_resp.status_code, 200)
        self.assertIn(test_room_no, get_resp.json())

        # Delete room
        del_resp = client.delete(f"/api/rooms/{test_room_no}", headers=auth_headers)
        self.assertEqual(del_resp.status_code, 200)

    def test_05_booking_lifecycle_and_early_checkout(self):
        auth_headers = {
            "Authorization": f"Bearer {self.admin_token}",
            "X-Property-ID": self.test_firm_id
        }
        manual_id = f"MAN-{uuid.uuid4().hex[:4].upper()}"

        # 1. Create booking
        create_resp = client.post("/api/bookings", headers=auth_headers, json={
            "manualId": manual_id,
            "guestName": "Jane Doe Guest",
            "phone": "+91 9876543210",
            "email": "jane@example.com",
            "room": "101",
            "checkIn": "2026-09-15",
            "checkOut": "2026-09-20",
            "amountPaid": 5000.0,
            "paidVia": "UPI",
            "status": "Upcoming"
        })
        self.assertEqual(create_resp.status_code, 200, create_resp.text)
        booking = create_resp.json()
        b_id = booking["id"]

        # 2. Check-in booking
        checkin_resp = client.post(f"/api/bookings/{b_id}/checkin", headers=auth_headers)
        self.assertEqual(checkin_resp.status_code, 200)
        self.assertEqual(checkin_resp.json()["status"], "In-House")

        # 3. Early check-out with hidden slot
        early_resp = client.post(
            f"/api/bookings/{b_id}/early-checkout",
            headers=auth_headers,
            json={"createHiddenSlot": True}
        )
        self.assertEqual(early_resp.status_code, 200, early_resp.text)
        early_data = early_resp.json()
        self.assertEqual(early_data["updatedBooking"]["status"], "Completed")

        # Verify hidden slot was generated if remaining days exist
        if early_data.get("hiddenBooking"):
            self.assertTrue(early_data["hiddenBooking"]["isHidden"])

        # 4. Clean up test booking
        client.delete(f"/api/bookings/{b_id}", headers=auth_headers)
        if early_data.get("hiddenBooking"):
            client.delete(f"/api/bookings/{early_data['hiddenBooking']['id']}", headers=auth_headers)

    def test_06_expenses_with_null_description(self):
        auth_headers = {
            "Authorization": f"Bearer {self.admin_token}",
            "X-Property-ID": self.test_firm_id
        }
        # Create expense with empty description (tests regression where null/empty caused toLowerCase crash)
        exp_resp = client.post("/api/expenses", headers=auth_headers, json={
            "date": "2026-09-15",
            "category": "Supplies",
            "description": None,
            "amount": 450.0
        })
        self.assertEqual(exp_resp.status_code, 200, exp_resp.text)
        exp_id = exp_resp.json()["id"]

        # Verify expense retrieval
        list_resp = client.get("/api/expenses", headers=auth_headers)
        self.assertEqual(list_resp.status_code, 200)
        self.assertTrue(any(e["id"] == exp_id for e in list_resp.json()))

        # Clean up expense
        client.delete(f"/api/expenses/{exp_id}", headers=auth_headers)

    def test_07_bill_creation_and_update(self):
        auth_headers = {
            "Authorization": f"Bearer {self.admin_token}",
            "X-Property-ID": self.test_firm_id
        }
        # 1. Create bill
        bill_resp = client.post("/api/bills", headers=auth_headers, json={
            "guestName": "Test Guest Bill",
            "roomNo": "102",
            "roomCharge": 3000.0,
            "addOns": [{"id": "item-1", "name": "Breakfast Buffet", "amount": 500.0}],
            "total": 3500.0,
            "date": "2026-09-15"
        })
        self.assertEqual(bill_resp.status_code, 200, bill_resp.text)
        bill_id = bill_resp.json()["id"]

        # 2. Update bill
        update_resp = client.put(f"/api/bills/{bill_id}", headers=auth_headers, json={
            "total": 3800.0
        })
        self.assertEqual(update_resp.status_code, 200)
        self.assertEqual(update_resp.json()["total"], 3800.0)

        # 3. List bills
        list_resp = client.get("/api/bills", headers=auth_headers)
        self.assertEqual(list_resp.status_code, 200)
        self.assertTrue(any(b["id"] == bill_id for b in list_resp.json()))

        # 4. Clean up bill
        client.delete(f"/api/bills/{bill_id}", headers=auth_headers)

    def test_08_shift_register_toggle(self):
        auth_headers = {
            "Authorization": f"Bearer {self.admin_token}",
            "X-Property-ID": self.test_firm_id
        }
        init_state = client.get("/api/register-status", headers=auth_headers).json()["isOpen"]
        toggle_resp = client.post("/api/register-status/toggle", headers=auth_headers)
        self.assertEqual(toggle_resp.status_code, 200)
        new_state = toggle_resp.json()["isOpen"]
        self.assertEqual(new_state, not init_state)

        # Toggle back
        restore_resp = client.post("/api/register-status/toggle", headers=auth_headers)
        self.assertEqual(restore_resp.json()["isOpen"], init_state)

if __name__ == "__main__":
    unittest.main(verbosity=2)
