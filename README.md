<div align="center">

# ✈️ B2B Travel Agent Platform

### Enterprise-grade Travel Management System with Microservice Simulation, Role-Based Access Control, Background Jobs, and Advanced Commission Tracking.

![Version](https://img.shields.io/badge/version-2.0.0-blue?style=for-the-badge)
![Node](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-8.0-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-7.0-DC382D?style=for-the-badge&logo=redis&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![License](https://img.shields.io/badge/license-Private-red?style=for-the-badge)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Architecture & Design](#-architecture--design)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [API Reference](#-api-reference)
- [Microservice Simulation](#-microservice-simulation)
- [Background Jobs](#-background-jobs)
- [Role Hierarchy & RBAC](#-role-hierarchy--rbac)
- [Security](#-security)
- [Database Models](#-database-models)
- [Frontend Pages](#-frontend-pages)
- [Contributing](#-contributing)

---

## 🌟 Overview

The **B2B Travel Agent Platform** is a comprehensive solution for managing the entire travel agency lifecycle. Beyond standard CRUD operations, it features a sophisticated **simulated microservice architecture**, **event-driven communication**, **background processing queues**, and a **dynamic permission matrix**.

Designed for scalability and modularity, the system uses an orchestrator pattern to manage multiple logical services within a single runtime, providing the benefits of microservices (separation of concerns, independent scaling potential) without the operational overhead of managing distributed systems during development.

---

## ✨ Key Features

### 🏢 Microservice Architecture (Simulated)
- **Service Registry**: Dynamic service discovery and health monitoring.
- **Event Bus**: Internal pub/sub system for decoupled service-to-service communication.
- **Service Facades**: Modularized service entry points (Auth, Booking, Payment, Notification, Analytics).

### ⚡ Background Processing
- **Bull Queues**: Redis-backed queues for asynchronous tasks (Email Dispatch, Report Generation).
- **Scheduled Cron Jobs**:
  - `Booking Reminder`: Daily notifications for upcoming trips.
  - `Stale Lead Cleanup`: Auto-archive inactive leads after 30 days.
  - `Commission Calculation`: Hourly computation for completed bookings.
  - `Daily Snapshot`: Nightly data aggregation for analytics.

### 🔐 Advanced Security & RBAC
- **Dynamic Permission Matrix**: Database-driven permissions with Redis caching (overrides hardcoded roles).
- **Hierarchical Access**: 5-level role system (Super Admin → Junior Agent).
- **6-Layer Security**: JWT, account status, role check, permission check, resource ownership, hierarchy validation.
- **Audit Logging**: Comprehensive tracking of critical actions.

### 📂 File Management
- **Cloudinary Integration**: Secure file storage for documents, itineraries, and profiles.
- **Document Metadata**: Track file types, sizes, and associations (Customer, Booking, etc.).

### 🖼️ Core Business Modules
- **Agent Management**: Registration, approval, role promotion, performance tracking.
- **Customer CRM**: Detailed profiles, booking history, document wallet.
- **Booking Engine**: Full lifecycle management (Draft → Confirmed → Completed), support for multiple trip types.
- **Itinerary Builder**: Day-by-day planner with templates and cloning.
- **Financials**: Payment processing (partial/full), refund workflows, automated commission tracking with tiered rates.
- **Lead Pipeline**: Kanban-style lead tracking from inquiry to conversion.

### 📊 Analytics & Dashboard
- **Real-time Metrics**: Revenue, active bookings, conversion rates.
- **Visual Analytics**: Interactive charts for sales performance and lead sources.

---

## 🏗️ Architecture & Design

 The system implements a **Hybrid Monolith / Simulated Microservice** architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                     ORCHESTRATOR (server.js)                 │
│  Mounts Services • Initializes Jobs • Global Middleware      │
└──────────────┬───────────────────────────────┬──────────────┘
               │                               │
┌──────────────▼─────────────┐   ┌─────────────▼──────────────┐
│      SERVICE REGISTRY      │   │         EVENT BUS          │
│   Health & Discovery       │   │   Pub/Sub Communication    │
└──────────────┬─────────────┘   └─────────────┬──────────────┘
               │                               │
      ┌────────┴───────────────────────────────┴────────┐
      │                                                 │
┌─────▼──────┐  ┌─────▼──────┐  ┌─────▼──────┐  ┌─────▼──────┐
│    AUTH    │  │  BOOKING   │  │  PAYMENT   │  │ ANALYTICS  │
│  SERVICE   │  │  SERVICE   │  │  SERVICE   │  │  SERVICE   │
└─────┬──────┘  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘
      │               │               │               │
┌─────▼──────┐  ┌─────▼──────┐  ┌─────▼──────┐  ┌─────▼──────┐
│  Mongodb   │  │  Mongodb   │  │  Mongodb   │  │  Mongodb   │
│  (Agents)  │  │ (Bookings) │  │ (Payments) │  │  (Logs)    │
└────────────┘  └────────────┘  └────────────┘  └────────────┘
```

---

## 🛠️ Tech Stack

### Backend
| Component | Technology | Description |
|-----------|------------|-------------|
| **Runtime** | Node.js | Core execution environment |
| **Framework** | Express.js | REST API server & orchestrator |
| **Database** | MongoDB + Mongoose | Data persistence & schema modeling |
| **Caching** | Redis (ioredis) | Permission caching, session storage |
| **Queue** | Bull | Background job processing |
| **Scheduling** | node-cron | Recurring task automation |
| **Storage** | Cloudinary | Cloud file storage |
| **Security** | Helmet, CORS, Rate Limit | API security layers |
| **Auth** | JWT, bcryptjs | Authentication & hashing |

### Frontend
| Component | Technology | Description |
|-----------|------------|-------------|
| **Framework** | React 19 | UI library |
| **Build Tool** | Vite | Fast development & building |
| **Language** | TypeScript | Static typing & interface definitions |
| **Styling** | TailwindCSS v4 | Utility-first styling |
| **Routing** | React Router v7 | Client-side navigation |
| **State** | React Context | Global state management |
| **Charts** | Recharts | Data visualization |
| **Icons** | Lucide React | Consistent iconography |

---

## 📁 Project Structure

```
travel/
├── backend/
│   ├── jobs/                         # Background Processing
│   │   ├── cron/                     #   Scheduled tasks (Reminders, Cleanup)
│   │   ├── processors/               #   Job logic (Email, Reports)
│   │   ├── queues/                   #   Bull queue definitions
│   │   └── index.js                  #   Job runner
│   │
│   ├── services/                     # Business Logic & Facades
│   │   ├── auth/index.js             #   Auth Service Facade
│   │   ├── booking/index.js          #   Booking Service Facade
│   │   ├── payment/index.js          #   Payment Service Facade
│   │   ├── analytics/index.js        #   Analytics Service Facade
│   │   ├── notification/index.js     #   Notification Service Facade
│   │   ├── permissionService.js      #   Dynamic Permissions
│   │   └── ... (core services)
│   │
│   ├── shared/                       # Shared Modules
│   │   ├── eventBus.js               #   Event Emitter (Pub/Sub)
│   │   └── serviceRegistry.js        #   Service Health & Discovery
│   │
│   ├── controllers/                  # Request Handlers
│   ├── models/                       # Mongoose Schemas (11 models)
│   ├── routes/                       # Express Routes
│   ├── middleware/                   # Auth, RBAC, Upload, Validation
│   ├── config/                       # DB, Redis, Cloudinary Config
│   ├── seeders/                      # Data Seeding
│   └── server.js                     # Orchestrator Entry Point
│
└── frontend/
    ├── src/
    │   ├── pages/                    # 14 Application Pages
    │   ├── components/               # Reusable UI Components
    │   ├── context/                  # AuthContext
    │   ├── services/                 # API Clients
    │   └── types/                    # TypeScript Interfaces
    └── ...
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** v18+
- **MongoDB** (Atlas or local)
- **Redis** (Required for Queues & Caching)

### Backend Setup
1.  **Navigate to backend**:
    ```bash
    cd backend
    ```
2.  **Install dependencies**:
    ```bash
    npm install
    ```
3.  **Configure Environment**:
    Copy `.env.example` to `.env` and fill in your credentials (see below).
4.  **Seed Database**:
    ```bash
    npm run create-super-admin  # Creates initial super admin
    npm run seed                # (Optional) Populates sample data
    ```
5.  **Start Server**:
    ```bash
    npm run dev
    ```
    *The orchestrator will start all services, connect to Redis/Mongo, and initialize cron jobs.*

### Frontend Setup
1.  **Navigate to frontend**:
    ```bash
    cd frontend
    ```
2.  **Install dependencies**:
    ```bash
    npm install
    ```
3.  **Start Dev Server**:
    ```bash
    npm run dev
    ```

### Default Credentials
| Role | Email | Password |
|------|-------|----------|
| **Super Admin** | `superadmin@travelplatform.com` | `SuperAdmin@123456` |

---

## 🔑 Environment Variables

Create `backend/.env`:

```env
# Application
NODE_ENV=development
PORT=5001

# Database
MONGO_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/travel

# Authentication
JWT_SECRET=<secret>
JWT_EXPIRE=7d
JWT_REFRESH_SECRET=<refresh_secret>
JWT_REFRESH_EXPIRE=30d

# Redis (Caching & Queues)
REDIS_URL=redis://<user>:<pass>@<host>:<port>
CACHE_ENABLED=true

# Cloudinary (File Uploads)
CLOUDINARY_CLOUD_NAME=<cloud_name>
CLOUDINARY_API_KEY=<api_key>
CLOUDINARY_API_SECRET=<api_secret>

# Business Logic
COMMISSION_RATE_DEFAULT=10
```

---

## 📡 API Reference

Base URL: `http://localhost:5001/api`

### System & Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | **Enhanced**: Returns status of all microservices, Redis, Jobs, and Event Bus |
| `GET` | `/events/log` | **New**: View recent event bus activity (Admin only) |

### 🔐 Auth & Permissions (New)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/permissions` | List all role permissions |
| `PUT` | `/permissions/:role` | Update dynamic permissions for a role |
| `POST` | `/permissions/reset` | Reset permissions to system defaults |

### 📂 File Uploads (New)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/uploads/single` | Upload a single file (Cloudinary) |
| `GET` | `/uploads/:resourceType/:id` | Get files attached to a resource |
| `DELETE` | `/uploads/:id` | Delete a file |

### 📊 Analytics & Reporting (New)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/dashboard/analytics` | Advanced analytics data |
| `GET` | `/audit-logs` | View system audit trail |

*(Standard CRUD endpoints for Agents, Customers, Bookings, Payments, etc. are also available)*

---

## 🏢 Microservice Simulation

The system simulates a microservice environment to demonstrate scalability patterns:
1.  **Service Isolation**: Each logic domain (Auth, Booking, etc.) is encapsulated in its own directory with a dedicated facade.
2.  **Event-Driven**: Services do not import each other directly for side effects. Instead, they emit events (e.g., `PAYMENT_COMPLETED`) via the `EventBus`. Other services subscribe to these events to react (e.g., Notification Service sends an email, Booking Service updates status).
3.  **Discovery**: The `ServiceRegistry` tracks which services are active and exposing routes.

---

## ⚡ Background Jobs

### Cron Jobs (node-cron)
| Job Name | Schedule | Description |
|----------|----------|-------------|
| `Booking Reminder` | 09:00 Daily | Finds bookings starting in 7 days and triggers notifications. |
| `Stale Lead Cleanup` | 00:00 Daily | Marks leads with no activity > 30 days as 'Lost'. |
| `Commission Calc` | Hourly | Checks completed bookings and generates missing commissions. |
| `Daily Snapshot` | 23:00 Daily | Aggregates system stats (Revenue, Leads, Bookings) for historical analytics. |

### Message Queues (Bull)
| Queue | Processor | Function |
|-------|-----------|----------|
| `emailQueue` | `emailProcessor` | Handles sending transactional emails (Welcome, Itinerary, Reset Password) with retry logic. |
| `reportQueue` | `reportProcessor` | Generates heavy PDF/Excel reports in the background. |

---

## 🛡️ Security

The platform implements **6 layers of security** for every API request:
1.  **JWT Validation**: Token authentication via `auth.js`.
2.  **Account Status**: Checks if account is active/approved.
3.  **Role-Based Access**: Route-level role checks via `authorize()`.
4.  **Dynamic Permission Checks**: DB-backed permission validation (cached in Redis).
5.  **Resource Ownership**: Ensures users access only their own resources.
6.  **Hierarchy Validation**: Enforces role assignment rules (e.g., Agent cannot promote to Admin).

---

## 🤝 Contributing

1.  Fork the repository
2.  Create your feature branch (`git checkout -b feature/amazing-feature`)
3.  Commit your changes (`git commit -m 'Add amazing feature'`)
4.  Push to the branch (`git push origin feature/amazing-feature`)
5.  Open a Pull Request

---

<div align="center">

**Built by Akash Sharma**

</div>
