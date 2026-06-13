markdown
# VIPNET Portal – Unified Management System

**VIPNET Portal** is a professional digital platform that integrates two core management systems for organizations:  
- **Payment Request Management (FDP)** – Manage payment requests with a 7‑step validation workflow.  
- **Material Management (FGM)** – Track material entries and exits with digital signatures.

Both systems share a modern, responsive interface, secure authentication, role‑based access control, electronic signatures, and professional printing capabilities.

---

## 🚀 Overview of the Two Systems

| System | Full Name | Purpose |
|--------|-----------|---------|
| **FDP** | *Fiche de Demande de Paiement* | Manage payment requests from creation to final validation and cash execution. |
| **FGM** | *Fiche de Gestion de Matériel* | Manage material entry/exit requests with a signature workflow and printable forms. |

Both applications are accessible from the main portal dashboard and share the same authentication & database backend.

---

## 📌 FDP – Payment Request Management

### Core Features
- Create, edit, and track payment requests (FDP)
- 8 user roles with specific actions in a **7‑step validation workflow**
- Electronic signatures via canvas (draw or upload image)
- Professional printing in half‑A4 format (conforms to official PDF model)
- Dashboard tailored to each role
- Full history of modifications and signatures

### Validation Workflow (7 Steps)

| Step | Role | Action |
|------|------|--------|
| 1 | **Requester** | Creates the request, fills details, submits |
| 2 | **Operations** | First validation, enters proposed amount |
| 3 | **Supplier** | Optional validation (if applicable) |
| 4 | **Department Head** | Hierarchical validation |
| 5 | **Financial Officer** | Budget verification |
| 6 | **Accountant** | Compliance control |
| 7 | **Director General** | Final validation, sets approved amount |
| 8 | **Cashier** | Confirms payment execution |

> After the Director General signs, the request is locked and cannot be modified.

---

## 📦 FGM – Material Management (Entry/Exit)

### Core Features
- Create material entry and exit requests
- Digital signatures (mandatory: Requester + Director General; optional others)
- Professional printing – half‑A4 format, identical to official PDF template
- Role‑based access: Requester, DG, Quality Control, Storekeeper, etc.
- Dashboard with request status tracking
- Full history of signatures and modifications

### User Roles (FGM)

| Role | Permissions |
|------|-------------|
| **Requester** | Create, edit, delete own requests (before DG signature) |
| **Director General (DG)** | Sign and lock any request (final step) |
| **Quality Control** | View and sign requests |
| **Storekeeper** | View and sign entry/exit documents |
| **Substitute Hiderctrique** | View and sign as needed |
| **Branch Director** | View and sign |
| **Management Controller** | View and sign |

### Signature Workflow
1. **Requester** signs the request.
2. Optional signers (according to roles) may sign.
3. **Director General** signs – the request is then locked.

---

## 🛠️ Technology Stack (Both Systems)

| Component | Technology |
|-----------|-------------|
| **Frontend** | React 18 + TypeScript + Tailwind CSS + Vite |
| **Backend** | Node.js + Express (TypeScript) |
| **Database** | PostgreSQL 13+ |
| **Authentication** | JWT (JSON Web Tokens) |
| **Password Hashing** | bcrypt |
| **Signatures** | react‑signature‑canvas (canvas with image import) |
| **HTTP Client** | Axios |

---

## 📋 Prerequisites

- **Node.js** >= 18.0.0
- **npm** (or yarn)
- **PostgreSQL** >= 13.0
- **Git** (optional, for cloning)

---

## 🔧 Installation (Unified)

Both systems are contained in the same repository. Follow these steps to set up the whole portal.

### 1. Clone the repository

```bash
git clone https://github.com/Enochbi/vipnet-portal.git
cd vipnet-portal
2. Install dependencies
bash
npm install
3. Configure PostgreSQL database
Create a database and a user:

sql
CREATE DATABASE vipnet_portal;
CREATE USER portal_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE vipnet_portal TO portal_user;
Run the SQL script(s) located in codesql/ or sql/ folders:

bash
psql -U portal_user -d vipnet_portal -f codesql/code.sql
The script creates all necessary tables for both FDP and FGM.

4. Environment variables
Create a .env file at the project root:

env
# Server
PORT=5000
JWT_SECRET=your_secure_jwt_secret_change_this

# Database
DB_USER=portal_user
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432
DB_NAME=vipnet_portal

# Frontend (optional)
VITE_API_URL=http://localhost:5000/api
5. Start the application
Development mode (frontend + backend together):

bash
npm run dev
Frontend: http://localhost:5173

Backend API: http://localhost:5000/api

Production mode:

bash
npm run build          # Builds the frontend
node server/index.js   # Starts the backend

The same backend serves both systems via different API endpoints (/api/fdp/* and /api/fgm/*).
```
📜 Available Scripts
Command	Description
npm run dev	Starts frontend (Vite) and backend concurrently
npm run dev:client	Starts only the frontend
npm run dev:server	Starts only the backend
npm run build	Builds frontend for production (output in dist/)
npm run lint	Runs ESLint
npm run preview	Previews the production build locally
🔒 Security
Passwords hashed with bcrypt (cost factor 10)

JWT tokens signed with a secret, expire after 24 hours

CORS configured to accept only the frontend origin

Input validation on both client and server sides

Parameterized SQL queries prevent injection (using pg)

🖨️ Printing (Both Systems)
Format: Half A4 (148mm × 210mm) – saves paper

Accuracy: Exact reproduction of official PDF models (DGI for FDP, internal material form for FGM)

Print CSS: Hides buttons, adjusts margins, ensures clean output

📱 Responsive Design
Desktop (>1024px): Full sidebar navigation

Tablet (768px–1024px): Collapsible menu

Mobile (<768px): Hamburger menu, stacked forms

🧪 Demo Accounts (Optional)
You can register users via the /register page.
For testing, you may manually insert a user with SQL:

sql
INSERT INTO users (email, password_hash, role, full_name) 
VALUES ('requester@vipnet.com', '$2b$10$...', 'requester', 'John Doe');
Roles available for FDP: requester, operations, supplier, head_of_department, financial_officer, accountant, director_general, cashier.
For FGM: requester, director_general, quality_control, storekeeper, substitute_hiderctrique, branch_director, management_controller.

🐛 Troubleshooting
Database connection refused (ECONNREFUSED)

Ensure PostgreSQL is running: sudo systemctl status postgresql (Linux) or check Windows services.

Test connection: psql -U portal_user -d vipnet_portal -c "SELECT 1"

Port already in use (5000 or 5173)

Change PORT in .env (e.g., 5001)

Change Vite port in vite.config.ts: server: { port: 5174 }

JWT_SECRET not set

The server will refuse to start. Always set it in .env.

Module not found errors

Delete node_modules and package-lock.json, then re-run npm install.

🚀 Production Deployment
Recommended environment variables for production:

env
NODE_ENV=production
PORT=5000
JWT_SECRET=<long_random_string>
DB_HOST=<production_db_host>
DB_PASSWORD=<strong_password>
Build and start with PM2 (recommended):

bash
npm install -g pm2
npm run build
pm2 start server/index.js --name vipnet-portal
pm2 save
pm2 startup
🤝 Contributing
Fork the repository

Create a feature branch (git checkout -b feature/amazing-feature)

Commit your changes (git commit -m 'Add amazing feature')

Push to the branch (git push origin feature/amazing-feature)

Open a Pull Request

🔄 Changelog
v1.0.0 (2026-06-13)
Initial release with both FDP and FGM systems

Unified authentication and dashboard

7‑step workflow for payment requests

Digital signatures for material management

Responsive interface and half‑A4 printing

Developed with ❤️ for VIPNET – Secure digital management for payment requests and material tracking

#   R e c o r d - m a n a g e m e n t - s y s t e m - w i t h - e l e c t r o n i c - s i g n a t u r e  
 