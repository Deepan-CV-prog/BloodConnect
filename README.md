<<<<<<< HEAD
# BloodConnect — Real-Time Blood Bank Management & Traceability System

[![Node.js](https://img.shields.io/badge/Node.js-v18+-68a063?logo=node.js)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-v19-61dafb?logo=react)](https://react.dev/)
[![Express](https://img.shields.io/badge/Express-v5-black?logo=express)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb)](https://www.mongodb.com/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-v4-010101?logo=socketdotio)](https://socket.io/)
[![Vite](https://img.shields.io/badge/Vite-v8-646CFF?logo=vite)](https://vitejs.dev/)

BloodConnect is a full-stack, enterprise-grade healthcare web application designed to modernize blood bank operations, emergency hospital requests, donor lifecycle management, inventory control, and end-to-end blood unit traceability with real-time WebSocket synchronization.

---

## Architecture Overview

```
                               ┌────────────────────────────────┐
                               │     Vercel Static Hosting      │
                               │   (React 19 + Vite SPA Client) │
                               └──────────────┬─────────────────┘
                                              │
                      REST API (HTTPS)        │        WebSocket (WSS)
                                              │
                               ┌──────────────▼─────────────────┐
                               │       Render Web Service       │
                               │   (Node.js + Express 5 Server) │
                               │        Socket.IO Server        │
                               └──────────────┬─────────────────┘
                                              │
                                       Mongoose Driver
                                              │
                               ┌──────────────▼─────────────────┐
                               │      MongoDB Atlas Cloud       │
                               │       (Database Cluster)       │
                               └────────────────────────────────┘
```

### Technology Stack
- **Frontend**: React 19, Vite 8, Lucide React icons, Socket.IO Client, modern healthcare design system.
- **Backend**: Node.js, Express 5, Socket.IO 4, Mongoose 9, JSON Web Tokens (JWT), bcryptjs.
- **Database**: MongoDB Atlas (Cloud NoSQL).
- **Hosting Targets**: Vercel (Frontend SPA) + Render (Backend Web Service) + MongoDB Atlas (Database).

---

## Role-Based Feature Matrix

| Feature | Donor | Staff | Hospital | Administrator |
| :--- | :---: | :---: | :---: | :---: |
| Profile & Medical Deferral Status | :white_check_mark: | :white_check_mark: | :white_check_mark: | :white_check_mark: |
| 3-Month Donation Eligibility Tracking | :white_check_mark: | :white_check_mark: | — | — |
| Appointment Booking & Scheduling | :white_check_mark: | :white_check_mark: | — | — |
| Real-Time In-App Hospital Blood Requests | — | :white_check_mark: | :white_check_mark: | :white_check_mark: |
| Multi-Step Unit Allocation & Issuance | — | :white_check_mark: | — | — |
| Real-Time Inventory & Expiry Alerts | — | :white_check_mark: | — | :white_check_mark: |
| Unit-Level Traceability & Timeline | — | :white_check_mark: | :white_check_mark: | :white_check_mark: |
| User Role Governance & System Audit Log | — | — | — | :white_check_mark: |

---

## Project Structure

```text
blood-bank-system/
├── .gitignore                   # Root Git ignore rules (protects all secrets)
├── README.md                    # Project documentation & deployment guide
├── client/                      # Frontend Application (React + Vite)
│   ├── .env.example             # Frontend environment variables template
│   ├── .gitignore               # Client-level Git ignore
│   ├── index.html               # SPA Entry HTML
│   ├── package.json             # Frontend dependencies & build scripts
│   ├── vercel.json              # Vercel SPA client routing configuration
│   ├── vite.config.js           # Vite build and dev configuration
│   └── src/
│       ├── config.js            # Centralized dynamic API & Socket.IO endpoints
│       ├── App.jsx              # Role-based dashboard routing & topbar
│       ├── components/          # Reusable healthcare UI components
│       │   ├── AdminDashboard.jsx
│       │   ├── BloodInventory.jsx
│       │   ├── DonationAppointments.jsx
│       │   ├── Donations.jsx
│       │   ├── DonorDashboard.jsx
│       │   ├── Donors.jsx
│       │   ├── HospitalDashboard.jsx
│       │   ├── HospitalProfile.jsx
│       │   ├── HospitalRequests.jsx
│       │   ├── Login.jsx
│       │   ├── Settings.jsx
│       │   ├── Traceability.jsx
│       │   └── UserManagement.jsx
│       └── utils/               # Date formatters and status helpers
└── server/                      # Backend Application (Node.js + Express)
    ├── .env.example             # Backend environment variables template
    ├── .gitignore               # Server-level Git ignore
    ├── package.json             # Server dependencies & start scripts
    └── src/
        ├── server.js            # Express app, Socket.IO, CORS, & Health Check
        ├── controllers/         # Business logic & request handlers
        ├── middleware/          # JWT authentication & role-based authorization
        ├── models/              # Mongoose schemas (User, Donor, BloodUnit, etc.)
        ├── routes/              # Modular Express API routes
        └── scripts/
            └── provisionAdmin.js # Local, secure CLI tool to provision Admin accounts
```

---

## Local Development Setup

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher ([Download Node.js](https://nodejs.org/))
- **MongoDB Atlas**: An active cluster ([Create Free Cluster](https://www.mongodb.com/cloud/atlas))
- **Git**: Installed and configured on your system

### 2. Clone the Repository
```bash
git clone https://github.com/<your-username>/bloodconnect.git
cd bloodconnect
```

### 3. Backend Setup
1. Open a terminal in `server/`:
   ```bash
   cd server
   npm install
   ```
2. Create your local `.env` file based on `.env.example`:
   ```bash
   # Windows PowerShell
   Copy-Item .env.example .env

   # macOS / Linux
   cp .env.example .env
   ```
3. Open `server/.env` and supply your MongoDB Atlas connection string and a secure JWT secret:
   ```env
   PORT=5000
   MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/bloodconnect?retryWrites=true&w=majority
   JWT_SECRET=your_jwt_secret_key_here_min_32_characters
   CLIENT_URL=http://localhost:5173
   ```
4. Start the backend in development mode:
   ```bash
   npm run dev
   # Server will run at http://localhost:5000
   ```
5. Verify backend health in your browser or curl:
   ```bash
   curl http://localhost:5000/api/health
   # Response: {"status":"healthy","uptime":...,"database":"connected"}
   ```

### 4. Frontend Setup
1. In a new terminal, navigate to `client/`:
   ```bash
   cd client
   npm install
   ```
2. Create your local `.env` file based on `.env.example`:
   ```bash
   # Windows PowerShell
   Copy-Item .env.example .env

   # macOS / Linux
   cp .env.example .env
   ```
3. Verify that `client/.env` points to your local server:
   ```env
   VITE_API_URL=http://localhost:5000
   VITE_SOCKET_URL=http://localhost:5000
   ```
4. Start the Vite development server:
   ```bash
   npm run dev
   # Frontend will run at http://localhost:5173
   ```
5. Open `http://localhost:5173` in your browser.

---

## Administrator Account Provisioning

For strict security, public user registration through `/api/auth/register` prevents creating accounts with the `admin` role. To safely create an initial Administrator account:

1. Navigate to `server/`:
   ```bash
   cd server
   ```
2. Run the local provisioning CLI tool interactively:
   ```bash
   node src/scripts/provisionAdmin.js
   ```
3. Follow the interactive prompts to enter the Administrator's Name, Email, and Password:
   ```text
   ========================================================
    BloodConnect — Administrator Account Provisioning Tool
   ========================================================

   Enter Admin Full Name: Super Admin
   Enter Admin Email: admin@bloodconnect.com
   Enter Admin Password (min 8 chars): SecureAdminPass2026!
   Enter Phone Number (optional): 9876543210
   ```
4. The tool securely hashes the password using project bcrypt standards and registers the account. You can now log into the application using the **Admin** role selector.

---

## Environment Variables Reference

### Backend (`server/.env`)
| Variable | Description | Example / Default |
| :--- | :--- | :--- |
| `PORT` | Local port for Express & Socket.IO | `5000` |
| `MONGO_URI` | MongoDB Atlas cluster connection URI | `mongodb+srv://...` |
| `JWT_SECRET` | Secret key used to sign and verify JWT tokens | 32+ character random string |
| `CLIENT_URL` | Allowed frontend origin(s) for CORS & WebSockets | `http://localhost:5173` (local) or `https://your-app.vercel.app` (prod) |

### Frontend (`client/.env`)
| Variable | Description | Example / Default |
| :--- | :--- | :--- |
| `VITE_API_URL` | Base URL of the backend REST API | `http://localhost:5000` (local) or `https://your-service.onrender.com` (prod) |
| `VITE_SOCKET_URL` | Base URL for real-time Socket.IO connection | `http://localhost:5000` (local) or `https://your-service.onrender.com` (prod) |

---

## Publishing to GitHub

> [!IMPORTANT]
> Never commit `.env` files containing real database credentials or secret keys. The repository `.gitignore` has already been configured to block `.env` and `node_modules`.

Follow these step-by-step commands to publish your repository:

### 1. Initialize Git and Verify Status
Open your terminal at the root of the project (`blood-bank-system`):
```bash
# 1. Initialize Git
git init

# 2. Check status to ensure NO .env files are being tracked
git status
```
> Verify that only source files and `.env.example` templates appear under "Untracked files", and **no `.env` files** are listed.

### 2. Stage and Commit
```bash
# 3. Stage all safe files
git add .

# 4. Check status again to double-confirm
git status

# 5. Create initial commit
git commit -m "feat: complete BloodConnect production ready setup"
```

### 3. Push to GitHub
1. Go to [GitHub](https://github.com/new) and create a new repository named `bloodconnect` (leave "Initialize with README" unchecked).
2. Link your local repository and push:
```bash
git branch -M main
git remote add origin https://github.com/<your-github-username>/bloodconnect.git
git push -u origin main
```

---

## Production Deployment Guide

Deploying BloodConnect requires three quick stages:
1. Database setup in **MongoDB Atlas**
2. Backend deployment on **Render** (Node.js + WebSockets)
3. Frontend deployment on **Vercel** (React SPA)

---

### Step 1: MongoDB Atlas Cloud Setup
1. Log in to [MongoDB Atlas](https://cloud.mongodb.com/).
2. Under **Network Access**, ensure Render can connect to your database:
   - Click **Add IP Address** -> Select **Allow Access from Anywhere** (`0.0.0.0/0`).
3. Under **Database Access**, verify your database user has read/write privileges.
4. Under **Database Deployments**, click **Connect** -> **Drivers** (Node.js).
5. Copy your connection string:
   ```text
   mongodb+srv://<db_user>:<db_password>@cluster0.abcde.mongodb.net/bloodconnect?retryWrites=true&w=majority
   ```

---

### Step 2: Backend Deployment on Render

1. Log in to [Render](https://dashboard.render.com/) and click **New +** -> **Web Service**.
2. Connect your GitHub repository (`bloodconnect`).
3. Configure the Web Service settings:
   - **Name**: `bloodconnect-api`
   - **Region**: Choose the region closest to you or your MongoDB cluster.
   - **Root Directory**: `server`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`
4. Expand **Advanced** -> **Health Check Path**:
   - Set to `/api/health`
5. Under **Environment Variables**, add the following keys:
   - `MONGO_URI`: *Your MongoDB Atlas connection string*
   - `JWT_SECRET`: *A secure random string (minimum 32 characters)*
   - `NODE_ENV`: `production`
   - `CLIENT_URL`: `http://localhost:5173` *(We will update this with the real Vercel URL in Step 4)*
6. Click **Deploy Web Service**.
7. Once deployed, note your Render backend URL (e.g., `https://bloodconnect-api.onrender.com`).
8. Test your backend live in browser:
   `https://bloodconnect-api.onrender.com/api/health`
   Should return: `{"status":"healthy","database":"connected"}`.

---

### Step 3: Frontend Deployment on Vercel

1. Log in to [Vercel](https://vercel.com/) and click **Add New...** -> **Project**.
2. Import your GitHub repository (`bloodconnect`).
3. Configure the project settings:
   - **Project Name**: `bloodconnect`
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click "Edit" and select `client`.
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Expand **Environment Variables** and add:
   - `VITE_API_URL`: `https://bloodconnect-api.onrender.com` *(Your Render backend URL from Step 2, no trailing slash)*
   - `VITE_SOCKET_URL`: `https://bloodconnect-api.onrender.com`
5. Click **Deploy**.
6. When deployment finishes, copy your live Vercel frontend URL (e.g., `https://bloodconnect.vercel.app`).

---

### Step 4: Final CORS & WebSocket Connection Link

1. Return to your [Render Dashboard](https://dashboard.render.com/) -> Select your `bloodconnect-api` service.
2. Go to **Environment**.
3. Update `CLIENT_URL` to include your live Vercel URL:
   ```env
   CLIENT_URL=https://bloodconnect.vercel.app,http://localhost:5173
   ```
4. Render will automatically redeploy with the updated CORS origin whitelist.
5. Open your live Vercel URL in your browser and verify:
   - Logging in as Donor, Staff, Hospital, and Admin.
   - Real-time updates across multiple open browser windows via Socket.IO.

---

## Troubleshooting Guide

| Issue | Cause | Solution |
| :--- | :--- | :--- |
| **CORS error in browser console** | Backend `CLIENT_URL` does not match the frontend domain. | Ensure `CLIENT_URL` on Render is set to your exact Vercel URL (e.g., `https://bloodconnect.vercel.app`) without trailing slashes. |
| **MongoDB connection timeout / failed** | Atlas Network Access IP whitelist is blocking Render. | Go to MongoDB Atlas -> Network Access -> Add `0.0.0.0/0` (Allow from anywhere) to allow cloud PaaS IPs. |
| **Blank screen on page refresh in Vercel** | SPA client-side routes returning 404 from static host. | The included `client/vercel.json` already contains rewrite rules (`/(.*)` -> `/index.html`) to prevent 404s. |
| **Socket.IO connection failed / polling error** | `VITE_SOCKET_URL` missing or pointing to localhost. | Ensure `VITE_SOCKET_URL` on Vercel points to your live Render backend URL (`https://bloodconnect-api.onrender.com`). |
| **Render Free Tier spins down (cold start)** | Free instances sleep after 15 minutes of inactivity. | Render will wake up automatically within 30-50 seconds on the first incoming request. Check `/api/health` to warm up. |

---

## Academic Project Declaration

This system was developed as a final-year academic engineering project:
- **Project Title**: BloodConnect — Real-Time Blood Bank Management & Traceability System
- **Core Domain**: Healthcare Information Systems, Supply Chain Traceability, Real-Time WebSockets
- **License**: MIT
=======
# BloodConnect
>>>>>>> a61935dc3895f013fa3066355f4376541f6ee44b
