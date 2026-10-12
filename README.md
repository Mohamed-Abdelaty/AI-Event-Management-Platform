# AI Event Management & Venue Booking Platform

[![Node.js](https://img.shields.io/badge/Node.js-v18+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-v4.18.2-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0+-4479A1?logo=mysql&logoColor=white)](https://www.mysql.com/)
[![Python](https://img.shields.io/badge/Python-3.9+-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![Scikit--Learn](https://img.shields.io/badge/Scikit--Learn-Machine_Learning-F7931E?logo=scikit-learn&logoColor=white)](https://scikit-learn.org/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-v4.8-010101?logo=socket.io&logoColor=white)](https://socket.io/)
[![Swagger](https://img.shields.io/badge/OpenAPI-3.0_Swagger-85EA2D?logo=swagger&logoColor=black)](https://swagger.io/)
[![JWT](https://img.shields.io/badge/JWT-Multi--Tier_Auth-000000?logo=jsonwebtokens&logoColor=white)](https://jwt.io/)

An enterprise-grade, full-stack event registration and physical venue booking ecosystem powered by dual-model machine learning decision intelligence, financial escrow vaults, real-time WebSockets, and dedicated workshop team workspaces.

---

## Table of Contents

- [Architectural Overview](#architectural-overview)
- [Key Features](#key-features)
- [System Architecture](#system-architecture)
- [Machine Learning & Decision Pipeline](#machine-learning--decision-pipeline)
- [Multi-Tier Authentication & Security](#multi-tier-authentication--security)
- [Database Schema & Data Architecture](#database-schema--data-architecture)
- [Tech Stack](#tech-stack)
- [API Surface & Swagger Documentation](#api-surface--swagger-documentation)
- [Project Directory Structure](#project-directory-structure)
- [Installation & Getting Started](#installation--getting-started)
- [Background Daemons & Scheduled Jobs](#background-daemons--scheduled-jobs)
- [Database Seeding](#database-seeding)
- [Contributing & License](#contributing--license)

---

## Architectural Overview

The **AI Event Management Platform** solves the fragmentation inherent in organizing, financing, staffing, and hosting large-scale events. By bringing together hosts, venue owners, operational workshop committees, attendees, and platform administrators into one coordinated platform, it eliminates manual contracting, financial uncertainty, and attendance unpredictability.

### Primary User Domains:
1. **Attendees**: Discover localized events, view dynamic multi-tier seat maps, book tickets via card or in-app wallet balance, receive cryptographically generated QR codes, and participate in live real-time event chatrooms.
2. **Event Organizers (Hosts)**: Create events, select physical venues with calendar conflict checking, access AI-assisted marketing campaign builders, inspect live ticket sales, simulate attendance feasibility with machine learning notebooks, and withdraw completed revenue from escrow vaults.
3. **Physical Venue Owners**: List venues with granular chair-capacity tiers (Standard, Special, VIP), manage booking proposals, inspect occupied schedule timelines, and collect rental fees held securely in escrow until post-event verification.
4. **Workshop Operational Committees**: Work inside an isolated subsystem featuring scoped access credentials, role hierarchies (Heads, Vice-Heads, Members), department task boards (Kanban), internal document drives, and live camera-based QR check-in scanners.
5. **System Administrators**: Oversee platform health, inspect transaction logs, review pending venue submissions, moderate events, enforce site maintenance/lockdown gates, and manage platform fee withdrawals.

---

## Key Features

- **Multi-Tier Seat Mapping & Ticketing**:
  - Interactive seating engine dividing capacities into Standard, Special, and VIP tiers.
  - Ticket issuance with unique codes and instant QR code image rendering.
  - Fast on-site ticket validation scanner with per-seat duplicate check-in protection.
- **Escrow-Secured Venue Contracting**:
  - Real-time venue availability verification preventing scheduling collisions.
  - Multi-phase state machine (`pending` &rarr; `accepted_by_owner` &rarr; `confirmed`).
  - Rental funds held in `held` transaction state and automatically distributed upon event completion.
- **AI-Powered Event Feasibility & Attendance Forecasting**:
  - Pre-launch evaluation analyzing 65 feature inputs across organizer history, market prices, and calendar signals.
  - Binary classification determining approval viability and regression predicting attendee turnout.
  - Natural-language breakdown highlighting actionable strengths and operational risks.
- **Dedicated Workshop Operations Subsystem**:
  - Independent department-level workspace for event staff (Logistics, PR, Operations).
  - Drag-and-drop task management boards with priority and assignment flags.
  - Secure internal department chat rooms and authenticated document attachment repository.
- **In-Platform Digital Wallet & Financial Ledger**:
  - Double-entry ledger tracking balances, mock card top-ups, and bank card withdrawals.
  - Automated refund pipeline crediting attendee balances atomically if events are canceled.
  - Dedicated organizer holding vaults with configurable clearance holding periods.
- **Real-Time Communication Engine**:
  - Socket.IO-driven attendee chat with presence monitoring and active viewer counts.
  - Host-only announcement lock mode and 1-second debounce rate-limiting to mitigate spam.
  - Direct 1-on-1 private messaging channel between Event Hosts and Venue Owners.
- **Generative AI Marketing Engine**:
  - OpenAI GPT integration generating targeted multi-channel campaign roadmaps based on audience demographics, budget, and sales targets.

---

## System Architecture

```
                                  +---------------------------------------+
                                  |         Web Client / Browser          |
                                  |  (HTML5, CSS3, Vanilla JS MVC Engine) |
                                  +---------------------------------------+
                                           |                      |
                            HTTP / REST    |                      | WebSockets (Socket.IO)
                            (Port 5000)    v                      v
                +-------------------------------------------------------------------+
                |                     Node.js / Express Core                        |
                |                                                                   |
                |  +--------------------+  +--------------------+  +--------------+ |
                |  | Global Middleware  |  |   28 Route Groups  |  |  Socket.IO   | |
                |  | - Auth (3 Realms)  |  | - 234 REST Endpts  |  |  Event &     | |
                |  | - Platform Access  |  | - Controllers &    |  |  Direct Chat | |
                |  | - CORS & Multer    |  |   Models Layer     |  |  Rooms       | |
                |  +--------------------+  +--------------------+  +--------------+ |
                |                            |               |                      |
                |        Scheduled Daemons   |               | HTTP RPC             |
                |        (node-cron Jobs)    |               | (Port 5050)          |
                +----------------------------|---------------|----------------------+
                                             |               |
                                             v               v
                +---------------------------------+   +-----------------------------+
                |        MySQL 8 Database         |   | Python ML Decision Service  |
                |        (52 Relational Tables)   |   | (Flask + Scikit-Learn SVC & |
                | - ACID Transactions             |   |  Random Forest Regressor)   |
                | - Idempotent Migrations         |   +-----------------------------+
                | - Financial Audit Ledgers       |
                +---------------------------------+
```

---

## Machine Learning & Decision Pipeline

The platform incorporates machine learning models both during event creation and inside interactive organizer notebooks:

### Dual-Model Decision Bundle (`event_decision_bundle.pkl`)
- **Classifier (Event Viability)**:
  - **Algorithm**: `SVC(probability=True, random_state=42)` (Support Vector Classifier).
  - **Preprocessing**: `ColumnTransformer` applying `StandardScaler` to numerical attributes and `OneHotEncoder(handle_unknown='ignore')` to categorical variables.
  - **Task**: Predicts event success probability against a configurable decision threshold ($0.5$).
- **Regressor (Attendance Rate)**:
  - **Algorithm**: `RandomForestRegressor(max_depth=8, n_estimators=200, random_state=42)`.
  - **Task**: Computes expected visitor attendance ratios and projected headcounts ($attendance\_rate \times guest\_count$).
- **Explainability Engine**:
  - Generates human-readable decision justifications comparing venue capacity ratios, lead-time safety margins, organizer historical cancellation rates, ticket price vs. category market averages, and marketing reach scores.

### Simulation Feature Vector
The backend dynamically derives and feeds a **65-feature vector** into the decision service:
1. **User-Configured Variables**: Category, event type, minimum age, duration, indoor/outdoor, capacity, pricing tiers, marketing channel budgets, amenities, number of speakers.
2. **Aggregated Database Metrics**: Organizer lifetime event count, historical cancellation rate, average organizer rating, follower count, verified status.
3. **Server-Derived Context**: Day of week, meteorological season, weekend flags, proximity to registration deadline, seasonal temperature averages.

---

## Multi-Tier Authentication & Security

The platform enforces three completely isolated security realms to prevent privilege escalation:

| Security Realm | Auth Mechanism | Secret / Verification | Attached Context | Intended Scope |
| :--- | :--- | :--- | :--- | :--- |
| **Platform User / Host** | Bearer JWT | `JWT_SECRET` | `req.user` | Public users, attendees, and event organizers. |
| **Workshop Committee** | Bearer JWT | `WORKSHOP_JWT_SECRET` | `req.workshopMember` | Departmental heads, vice-heads, and staff. Restricts data to the assigned event and department. |
| **System Administrator** | Session Bearer | `admin_sessions` DB table | `req.admin` | Administrative dashboard access with real-time session revocation and inactivity tracking. |

### Additional Security Highlights:
- **Bcrypt Password Hashing**: Adaptive work factor preventing brute-force dictionary attacks.
- **Global Maintenance & Lockdown Gateway**: `platformAccessMiddleware` intercepts all API requests and returns HTTP `503` when system maintenance or administrative lock is enabled.
- **Upload File Validation**: Multi-part disk storage strictly sanitizes filenames and rejects dangerous extensions (e.g., `.exe`, `.bat`, `.sh`, `.php`).

---

## Database Schema & Data Architecture

The persistence layer is built on **MySQL 8** across **52 normalized relational tables**, organized into clean operational domains:

1. **User Identity & Profiles**: `users`, `followers`, `user_notification_preferences`.
2. **Venues & Availability**: `venues`, `venue_bookings`, `venue_availability_blocks`, `venue_wishlist`, `venue_reviews`.
3. **Events & Ticketing**: `events`, `bookings`, `booking_ticket_checkins`, `event_checkins`, `event_views`, `event_reviews`, `event_team`, `event_waitlist`, `promo_codes`.
4. **Financial Ledgers & Escrow**: `wallet_transactions`, `wallet_withdrawals`, `payments`, `event_vaults`, `event_vault_transactions`, `platform_wallet`, `platform_wallet_transactions`, `admin_wallet_transactions`.
5. **Workshop Operations**: `workshops`, `workshop_categories`, `workshop_members`, `workshop_tasks`, `workshop_messages`, `workshop_events`, `workshop_files`, `workshop_activity_log`, `workshop_notifications`.
6. **Communication & Messaging**: `event_chat_messages`, `event_chat_read_state`, `direct_chats`, `direct_chat_messages`, `direct_chat_read_state`, `notifications`, `email_outbox`.
7. **AI & Decision Simulation**: `notebooks`, `event_marketing_setups`.
8. **Administration & Audit**: `admins`, `admin_sessions`, `admin_audit_logs`, `site_settings`, `faqs`, `subscription_plans`, `support_tickets`.

---

## Tech Stack

### Backend
- **Runtime**: Node.js (v18+)
- **Framework**: Express.js (`4.18.2`)
- **WebSockets**: Socket.IO (`4.8.3`)
- **Database Driver**: `mysql2` (`3.6.5` / `3.11.0`) with Promise connection pooling
- **Security**: `jsonwebtoken` (`9.0.2`), `bcryptjs` (`2.4.3`)
- **Task Scheduling**: `node-cron` (`4.2.1`)
- **File Uploads**: `multer` (`1.4.5-lts.1`)
- **Documentation**: `swagger-ui-express` (`5.0.1`), `swagger-jsdoc` (`6.3.0`)
- **Utilities**: `qrcode` (`1.5.3`), `uuid` (`9.0.1`), `validator` (`13.11.0`), `dotenv` (`16.3.1`)

### Machine Learning
- **Language**: Python (v3.9+)
- **Microservice Framework**: Flask
- **Libraries**: Scikit-Learn, Joblib, Pandas, NumPy
- **Generative AI**: OpenAI REST API integration

### Frontend
- **Languages**: HTML5, Modern CSS3 (Responsive Grid/Flexbox)
- **JavaScript**: Modular Vanilla JS adhering to strict MVC architectural principles
- **Client Libraries**: Socket.IO Client, QRCode.js

---

## API Surface & Swagger Documentation

The backend exposes **234 REST endpoints** grouped into 28 domain routers:

- `/api/Account`: Authentication, user registration, credential validation, login.
- `/api/Events`: Public event catalog, seat availability, organizer CRUD, revenue tracking, cancellation refunds.
- `/api/venues`: Public venue directory, search by governorate/category, booking submissions.
- `/api/venue-owner`: Dedicated venue management, calendar timeline, booking approval/rejection, escrow wallet.
- `/api/Bookings`: Seat checkout, QR ticket code verification, cancellation preview.
- `/api/wallet`: Balance management, mock top-ups, withdrawal requests, transaction audit trails.
- `/api/workshop`: Internal department operations, member provisioning, Kanban task board, internal chat, live attendee QR check-in.
- `/api/notebooks`: Machine learning simulation sandboxes, feature persistence, real-time prediction execution.
- `/api/direct-chat`: Private messaging between event hosts and venue owners.
- `/api/chat`: Attendee event chat, online count streaming, announcement locks.
- `/api/Admin`: System oversight, approval queues, platform wallet fee withdrawals, site configuration.

### Interactive Swagger Docs
When the server is running, the interactive OpenAPI 3.0 documentation is accessible at:
```
http://localhost:5000/api-docs
```
Raw OpenAPI JSON specification:
```
http://localhost:5000/api-docs.json
```

---

## Project Directory Structure

```text
.
├── backend/
│   ├── config/                     # Database connection pool & Swagger definitions
│   ├── controllers/                # Request validation and business flow controllers
│   │   └── admin/                  # Administrative controllers
│   ├── middleware/                 # Multi-realm JWT and access restriction guards
│   ├── models/                     # SQL data access objects & query builders
│   ├── routes/                     # REST API route definitions
│   │   └── admin/                  # Admin API endpoints
│   ├── services/                   # Core business logic (Escrow, ML, Chat, Lifecycle)
│   ├── utils/                      # Helper scripts, seeders, and socket event handlers
│   ├── migration_*.js              # 22 sequential database migration scripts
│   ├── seed_full.js                # Full database seeding script
│   └── server.js                   # Express application entrypoint
├── database/
│   ├── init.sql                    # Initial database creation and schema definitions
│   └── create-all-tables.sql       # Complete idempotent table creation script
├── docs/                           # Architecture guides and feature specifications
├── event_ai_decision_system/
│   ├── event_decision_bundle.pkl   # Serialized Scikit-Learn ML pipeline bundle
│   └── predict_service.py          # Python Flask inference microservice
├── frontend/
│   ├── admin/                      # 14 Admin dashboard management views
│   ├── css/                        # 40 custom responsive stylesheets
│   ├── html/                       # 39 attendee, organizer, and workshop HTML views
│   ├── js/                         # Frontend MVC controllers, models, and views
│   ├── public/                     # Shared authentication guards and navigation scripts
│   └── uploads/                    # Local asset storage (profile pictures, workshop files)
└── README.md
```

---

## Installation & Getting Started

### Prerequisites
- **Node.js**: v18.x or later
- **MySQL**: 8.0 or later
- **Python**: 3.9+ (with `pip`)

---

### Step 1: Clone the Repository
```bash
git clone https://github.com/Mohamed-Abdelaty/AI-Event-Management-Platform.git
cd AI-Event-Management-Platform
```

---

### Step 2: Install Node Dependencies
```bash
# Root & backend dependencies
npm install
cd backend && npm install
cd ..
```

---

### Step 3: Configure Environment Variables
Copy the sample environment file in `backend/`:
```bash
cd backend
cp project.env.example project.env
```

Edit `backend/project.env` with your local settings:

| Variable | Description | Example |
| :--- | :--- | :--- |
| `PORT` | Node.js HTTP server port | `5000` |
| `DB_HOST` | MySQL hostname | `localhost` |
| `DB_USER` | MySQL username | `root` |
| `DB_PASSWORD` | MySQL password | `your_mysql_password` |
| `DB_NAME` | MySQL database name | `event_registration_db` |
| `CORS_ORIGIN` | Allowed frontend origin | `http://localhost:5000` |
| `JWT_SECRET` | Primary JWT secret for platform users | `strong_secret_key` |
| `WORKSHOP_JWT_SECRET` | Secret key for workshop committee JWTs | `strong_workshop_secret` |
| `ADMIN_JWT_SECRET` | Secret for admin authentication | `strong_admin_secret` |
| `PREDICT_SERVICE_HOST`| Hostname for Python ML microservice | `127.0.0.1` |
| `PREDICT_SERVICE_PORT`| Port for Python ML microservice | `5050` |
| `OPENAI_API_KEY` | OpenAI API key for marketing plans | `sk-...` |

---

### Step 4: Database Initialization
Start your MySQL server and create the database:
```sql
CREATE DATABASE event_registration_db;
```
Import the base schema:
```bash
mysql -u root -p event_registration_db < database/create-all-tables.sql
```
*(Note: When `server.js` boots, `databaseSetup.js` and all 22 migration scripts run automatically to ensure all tables, columns, and indexes are up to date).*

---

### Step 5: Start the Python ML Microservice
In a separate terminal:
```bash
cd event_ai_decision_system
pip install flask joblib pandas scikit-learn
python predict_service.py
```
The decision microservice will be running at `http://localhost:5050`.

---

### Step 6: Start the Backend Server
In your primary terminal:
```bash
cd backend
npm run dev
```
*(or `npm start` for production mode)*.

The application server will start on `http://localhost:5000`.
- **Public Portal**: `http://localhost:5000/html/signin.html`
- **Admin Login**: `http://localhost:5000/admin/login.html`
- **API Swagger Documentation**: `http://localhost:5000/api-docs`

---

## Background Daemons & Scheduled Jobs

On server launch, `server.js` initializes four automated `node-cron` workers to handle asynchronous lifecycle events:

1. **Event Lifecycle Engine (`eventLifecycleService.js`)**: Scans hourly for past events, updates statuses to `expired`, compiles financial completion earnings, and notifies organizers.
2. **Venue Booking Expiration Worker (`venueBookingExpiryService.js`)**: Automatically expires and marks unconfirmed venue reservations as `declined_auto_expired` after the owner response window lapses.
3. **Escrow Fund Release Worker (`venueBookingFundReleaseService.js`)**: Evaluates completed events and safely transitions held escrow payments to venue owners once the review grace period concludes.
4. **Chat Retention Purge Worker (`chatCleanupService.js`)**: Runs daily cleanup tasks archiving and pruning historical transient event chat streams.

---

## Database Seeding

To quickly populate the platform with realistic sample data for testing, run the comprehensive seed script:

```bash
cd backend
node seed_full.js
```

This generates:
- **500 Registered Users** (`user1` through `user500`, default password: `password123`)
- **20 Physical Venue Owners** with approved venue listings across 20 Egyptian governorates
- **50 Events** across 20 distinct industry categories
- Randomized bookings across Standard, Special, and VIP tiers
- Realistic digital wallet transactions, escrow records, reviews, and notifications

---

## Contributing & License

Contributions, feature suggestions, and bug reports are welcome! Please open an issue or submit a pull request.

This project is licensed under the **ISC License**.
#   A I - E v e n t - M a n a g e m e n t - P l a t f o r m  
 