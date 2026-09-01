# Hotel Booking & Property Management - Deployment Guide

This repository is modularized into two distinct folders:
- **`frontend/`**: React + Vite single-page application.
- **`backend/`**: FastAPI + SQLAlchemy multi-tenant property management backend.

---

## 1. Quick Local Development

Run both the React frontend and FastAPI backend simultaneously from the root directory:

```bash
# Install dependencies in root and frontend
npm install
npm install --prefix frontend

# Install Python backend dependencies
pip install -r backend/requirements.txt

# Start both frontend (port 5173) and backend (port 8000)
npm run dev
```

- **Frontend**: `http://localhost:5173`
- **Backend API Docs (Swagger UI)**: `http://localhost:8000/docs`

---

## 2. Docker Compose Deployment (Single Server / VPS)

Deploy the entire stack with a single command on any Docker-enabled server (AWS EC2, DigitalOcean, Linode, Hetzner):

```bash
docker compose up --build -d
```

- **Frontend**: Accessible on port `80` (or behind an Nginx reverse proxy / SSL cert via Certbot).
- **Backend API**: Accessible on port `8000`.

---

## 3. Platform Cloud Deployment

### Option A: Render (Recommended for Full-Stack)

#### **A1. Backend Deployment (Web Service)**
1. Connect your repository on [Render](https://render.com).
2. Create a new **Web Service**:
   - **Root Directory**: `backend`
   - **Environment**: `Python`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn main:app -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT`
3. Add Environment Variables:
   - `SECRET_KEY`: `<Generate a random secret string>`
   - `CORS_ORIGINS`: `https://your-frontend-domain.onrender.app`
   - `DATABASE_URL`: Optional (Defaults to SQLite; attach Render PostgreSQL if persistence is required).

#### **A2. Frontend Deployment (Static Site)**
1. Create a new **Static Site** on Render:
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
2. Add Environment Variable:
   - `VITE_API_URL`: `https://your-backend-service.onrender.com/api`

---

### Option B: Vercel / Netlify (Frontend) + Railway / Render (Backend)

#### **Deploy Frontend to Vercel**:
1. Import repository on [Vercel](https://vercel.com).
2. Set **Root Directory** to `frontend`.
3. Set **Framework Preset** to `Vite`.
4. Add Environment Variable:
   - `VITE_API_URL`: `https://your-backend-api.up.railway.app/api`
5. Deploy!

#### **Deploy Backend to Railway**:
1. New Project on [Railway](https://railway.app) -> Deploy from GitHub.
2. Set **Root Directory** to `backend`.
3. Railway automatically detects `requirements.txt` and `Procfile`.
4. Set Environment Variables (`SECRET_KEY`, `CORS_ORIGINS`, `DATABASE_URL`).

---

## 4. Hostinger Deployment Guide

Hostinger supports two main types of hosting: **Hostinger VPS** (recommended for full-stack Node/React + Python apps) and **Hostinger Shared Web Hosting** (static frontend only).

---

### Option 1: Hostinger VPS (Recommended for Full-Stack)

Hostinger VPS gives you full root access to run both React and FastAPI backend.

#### **Method A: Docker Compose (Simplest)**
1. **Log in to Hostinger VPS via SSH**:
   ```bash
   ssh root@<YOUR_HOSTINGER_VPS_IP>
   ```
2. **Install Git & Docker** (if not already installed):
   ```bash
   sudo apt update && sudo apt install -y git docker.io docker-compose-plugin
   ```
3. **Clone your repository**:
   ```bash
   git clone https://github.com/your-username/Hotel-Booking.git
   cd Hotel-Booking
   ```
4. **Launch Application**:
   ```bash
   docker compose up --build -d
   ```
5. **Set up Domain & SSL (Certbot + Nginx Reverse Proxy)**:
   - Point your Hostinger Domain DNS (A Record) to `<YOUR_HOSTINGER_VPS_IP>`.
   - Configure Nginx reverse proxy to forward domain requests to port `80` (Frontend) and `/api` requests to port `8000` (Backend).

---

#### **Method B: Manual Setup (Nginx + Systemd + Gunicorn)**

1. **Install Python, Node & Nginx on VPS**:
   ```bash
   sudo apt update
   sudo apt install -y python3-pip python3-venv nginx git
   ```
2. **Set up Backend Service**:
   ```bash
   cd /var/www/
   git clone https://github.com/your-username/Hotel-Booking.git
   cd Hotel-Booking/backend
   python3 -m venv venv
   source venv/bin/venv/bin/activate
   pip install -r requirements.txt
   ```
3. **Create Systemd Service for FastAPI (`/etc/systemd/system/hotel-backend.service`)**:
   ```ini
   [Unit]
   Description=Hotel Booking FastAPI Backend
   After=network.target

   [Service]
   User=root
   WorkingDirectory=/var/www/Hotel-Booking/backend
   ExecStart=/var/www/Hotel-Booking/backend/venv/bin/gunicorn main:app -k uvicorn.workers.UvicornWorker --bind 127.0.0.1:8000
   Restart=always

   [Install]
   WantedBy=multi-user.target
   ```
   Enable and start the service:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable --now hotel-backend
   ```

4. **Build Frontend**:
   ```bash
   cd /var/www/Hotel-Booking/frontend
   npm install
   VITE_API_URL=https://yourdomain.com/api npm run build
   ```

5. **Configure Nginx Site (`/etc/nginx/sites-available/hotel-booking`)**:
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com www.yourdomain.com;

       # Serve React Frontend Static Files
       root /var/www/Hotel-Booking/frontend/dist;
       index index.html;

       location / {
           try_files $uri $uri/ /index.html;
       }

       # Proxy API requests to FastAPI backend
       location /api/ {
           proxy_pass http://127.0.0.1:8000/api/;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```
   Symlink and reload Nginx:
   ```bash
   sudo ln -s /etc/nginx/sites-available/hotel-booking /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```

6. **Add Free SSL Certificate (Certbot)**:
   ```bash
   sudo apt install -y certbot python3-certbot-nginx
   sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
   ```

---

### Option 2: Hostinger Shared Web Hosting (hPanel)

> **Note**: Hostinger Shared Hosting (`hPanel`) supports hosting static files (`HTML/CSS/JS`) and PHP, but **cannot** run Python long-running Uvicorn background servers.
> For shared hosting, host the **Frontend** on Hostinger and the **Backend** on Render/Railway (or Hostinger VPS).

#### **Step 1: Host Backend on Cloud Service (Render or Railway)**
1. Deploy `backend/` to [Render](https://render.com) or [Railway](https://railway.app) (see Section 3 above).
2. Note your live backend API URL (e.g. `https://hotel-api.onrender.com/api`).
3. Set backend `CORS_ORIGINS` to `https://yourhostingerdomain.com`.

#### **Step 2: Build Frontend for Hostinger Shared Hosting**
1. On your local machine, open `frontend/.env` and set the backend API URL:
   ```ini
   VITE_API_URL=https://hotel-api.onrender.com/api
   ```
2. Build the production static bundle:
   ```bash
   npm run build --prefix frontend
   ```
   This generates the production files inside `frontend/dist/`.

#### **Step 3: Upload to Hostinger hPanel File Manager**
1. Log in to Hostinger **hPanel** -> Go to **File Manager**.
2. Open the `public_html` directory.
3. Upload all files and subfolders from `frontend/dist/` into `public_html/`.

#### **Step 4: Add `.htaccess` for React Router Support**
Create or edit `.htaccess` inside Hostinger `public_html/` with the following content:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteCond %{REQUEST_FILENAME} !-l
  RewriteRule . /index.html [L]
</IfModule>
```
This ensures React SPA routing works when navigating or refreshing pages on Hostinger Shared Hosting.

---

## Environment Variables Reference

### Frontend (`frontend/.env`)
| Variable | Description | Example |
| :--- | :--- | :--- |
| `VITE_API_URL` | Base API endpoint for backend | `https://api.yourdomain.com/api` |

### Backend (`backend/.env`)
| Variable | Description | Example |
| :--- | :--- | :--- |
| `PORT` | HTTP port for server | `8000` |
| `SECRET_KEY` | JWT signature secret key | `supersecretkey123` |
| `DATABASE_URL` | SQLAlchemy connection string | `postgresql://user:pass@host/dbname` or `sqlite:///./hotel_booking.db` |
| `CORS_ORIGINS` | Allowed CORS origins (comma-separated or `*`) | `https://myfrontend.com,http://localhost:5173` |
