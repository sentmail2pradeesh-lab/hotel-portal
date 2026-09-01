# 🏨 Hotel Booking & Multi-Tenant Property Management Portal

A modern, high-performance, multi-tenant property management and hotel booking system designed for real-time simultaneous multi-device frontdesk operations. Built with a **Python FastAPI** backend and a **React 19 + Vite** frontend.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/Frontend-React%2019%20%7C%20Vite-61DAFB?logo=react)
![FastAPI](https://img.shields.io/badge/Backend-FastAPI%20%7C%20Python-009688?logo=fastapi)
![Docker](https://img.shields.io/badge/Container-Docker%20%7C%20Docker%20Compose-2496ED?logo=docker)

---

## ✨ Features

- **🏢 Multi-Tenant Manager & Property Management**:
  - Manager registration, authentication, and property creation.
  - Multi-property switching via custom `X-Property-ID` headers.
  - Manager invitation system to grant property access to team members.

- **🛏️ Real-Time Room & Booking Management**:
  - Live visual room matrix (occupied, vacant, upcoming, checked-in, checked-out).
  - Booking creation, edit, instant confirmation, check-in, check-out, and early check-out with hidden slot protection.
  - Guest ID card upload, digital verification, and ID preview modal.

- **🧾 Billing, Receipts & Expense Tracking**:
  - Automated tax and bill calculation.
  - Exportable digital PDF/image receipts (`html-to-image`).
  - Expense logging and category tracking.
  - Daily frontdesk register status lock & unlock toggle.

- **🚀 Modular Architecture**:
  - Completely separated `frontend/` and `backend/` services.
  - Docker & Docker Compose setup for single-command deployment.
  - Cross-platform deployment guides for Hostinger (VPS & Shared Hosting), Render, Vercel, and Railway.

---

## 📁 Repository Structure

```
Hotel-Booking/
├── frontend/                     # React 19 + Vite SPA Client
│   ├── src/                      # UI components, services, hooks & styles
│   ├── public/                   # Static assets & icons
│   ├── vite.config.js            # Vite configuration with backend API proxy
│   ├── package.json              # Frontend dependencies
│   ├── Dockerfile                # Nginx production container build
│   └── nginx.conf                # Nginx SPA fallback configuration
├── backend/                      # Python FastAPI REST API
│   ├── main.py                   # FastAPI application & endpoints
│   ├── models.py                 # SQLAlchemy ORM models
│   ├── schemas.py                # Pydantic v2 schemas
│   ├── database.py               # Database engine (SQLite / PostgreSQL)
│   ├── requirements.txt          # Python dependencies
│   ├── Procfile                  # Cloud web process entrypoint
│   └── Dockerfile                # Python 3.11 Uvicorn container
├── docker-compose.yml            # Multi-container local & server orchestration
├── DEPLOYMENT.md                 # Complete host deployment guide
├── package.json                  # Root runner scripts (npm run dev)
└── .gitignore                    # Comprehensive repository ignore rules
```

---

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite, Lucide React Icons, HTML-to-Image, CSS Modern Design System.
- **Backend**: FastAPI, SQLAlchemy ORM, Pydantic v2, PyJWT, Passlib, Bcrypt, Uvicorn / Gunicorn.
- **Database**: SQLite (Default local) / PostgreSQL (Production supported via `DATABASE_URL`).
- **Containerization**: Docker, Docker Compose, Nginx Alpine.

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- **Node.js** (v18+ or v20+)
- **Python** (v3.10+ or v3.11+)

### 1. Clone & Install Dependencies

```bash
# Clone repository
git clone https://github.com/sentmail2pradeesh-lab/hotel-portal.git
cd hotel-portal

# Install root & frontend Node dependencies
npm install
npm install --prefix frontend

# Install Python backend dependencies
pip install -r backend/requirements.txt
```

### 2. Start Both Frontend & Backend

From the root workspace directory, run:

```bash
npm run dev
```

- **Frontend**: App launches at [`http://localhost:5173`](http://localhost:5173) (or `http://localhost:5174` if port is in use).
- **Backend API Interactive Docs**: OpenAPI Swagger available at [`http://localhost:8000/docs`](http://localhost:8000/docs).

---

## 🐳 Docker Setup

Run the entire application stack using Docker Compose:

```bash
docker compose up --build -d
```

- Frontend served via Nginx on port `80`.
- Backend FastAPI server on port `8000`.

To stop the containers:
```bash
docker compose down
```

---

## ⚙️ Environment Variables

### Frontend (`frontend/.env`)
| Variable | Description | Default |
| :--- | :--- | :--- |
| `VITE_API_URL` | Base backend API endpoint URL | `/api` (Proxied in dev) |

### Backend (`backend/.env`)
| Variable | Description | Default |
| :--- | :--- | :--- |
| `PORT` | FastAPI server port | `8000` |
| `SECRET_KEY` | JWT secret signature key | `hotel_frontdesk_secret_key...` |
| `DATABASE_URL` | Database connection string | `sqlite:///./hotel_booking.db` |
| `CORS_ORIGINS` | Allowed CORS origins (comma-separated or `*`) | `*` |

---

## 🌐 Production Deployment

Refer to [`DEPLOYMENT.md`](DEPLOYMENT.md) for step-by-step production guides:

- **Hostinger VPS** (Docker Compose / Systemd + Nginx + Certbot SSL)
- **Hostinger Shared Web Hosting** (`public_html` upload + `.htaccess` + Render backend)
- **Render** (Full-stack web service & static site)
- **Vercel & Railway** (Vite frontend + Railway FastAPI container)

---

## 📜 License

Distributed under the MIT License. See `LICENSE` for more information.
