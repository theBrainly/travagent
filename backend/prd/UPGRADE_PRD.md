# 🚀 B2B Travel Agent Platform — Upgrade PRD

## Master Enhancement Plan (10 Steps)

> **Version:** 3.0.0-roadmap  
> **Author:** Akash Sharma  
> **Created:** 2026-02-14  
> **Base:** Current v2.0.0 (Node/Express + React/Vite + MongoDB)  
> **Goal:** Transform the platform from a functional MVP to an **enterprise-grade, interview-winning** system.

---

## 📋 Execution Order & Dependency Map

```
Step 1: Redis Caching ──────────────┐
Step 2: Activity / Audit Logs ──────┤── (Independent — can start in any order)
Step 3: Notification System ────────┘
                │
Step 4: Dashboard Analytics ────────── (Benefits from Steps 1 & 2)
Step 5: Booking Conflict Protection ── (Independent)
Step 6: Advanced Search + Filters ──── (Independent, best after Step 1)
                │
Step 7: Background Jobs ───────────── (Connects Steps 1, 3, 4)
Step 8: File Upload Feature ────────── (Independent)
Step 9: Role Permission Matrix ─────── (Depends on Step 2)
                │
Step 10: Microservice Simulation ───── (Capstone — depends on all above)
```

---

---

# 📦 STEP 1 — Redis Caching

> **Tier:** 🥇 1 (Most Important)  
> **Interview Impact:** ⭐⭐⭐⭐⭐  
> **Estimated Time:** 3–4 hours  
> **Dependencies:** None (can be implemented first)

## 1.1 Overview

Add Redis as a caching layer for frequently accessed, read-heavy APIs. This reduces MongoDB load, dramatically improves response times, and demonstrates **system design maturity**.

## 1.2 What to Cache

| API Endpoint | Cache Key Pattern | TTL | Invalidation Trigger |
|---|---|---|---|
| `GET /api/leads` | `leads:list:{agentId}:{page}:{limit}` | 5 min | Lead created / updated / deleted |
| `GET /api/bookings` | `bookings:list:{agentId}:{page}:{limit}` | 5 min | Booking created / updated / status changed |
| `GET /api/dashboard/stats` | `dashboard:stats:{agentId}` | 2 min | Any booking / lead / payment change |
| `GET /api/agents/dashboard/stats` | `agent:stats:{agentId}` | 3 min | Agent profile update / booking change |
| `GET /api/customers` | `customers:list:{agentId}:{page}` | 10 min | Customer created / updated / deleted |
| `GET /api/commissions/summary` | `commissions:summary:{agentId}` | 5 min | Commission approved / paid |

## 1.3 Technical Implementation

### New Dependencies
```bash
npm install ioredis
```

### New Files to Create
```
backend/
├── config/
│   └── redis.js                 # Redis connection + client singleton
├── middleware/
│   └── cache.js                 # Express cache middleware
├── services/
│   └── cacheService.js          # Cache get/set/invalidate utilities
```

### Files to Modify
```
backend/
├── server.js                    # Import & initialize Redis on boot
├── controllers/
│   ├── bookingController.js     # Add cache middleware to GET routes
│   ├── leadController.js        # Add cache middleware to GET routes
│   ├── dashboardController.js   # Add cache middleware
│   ├── customerController.js    # Add cache middleware
│   └── commissionController.js  # Add cache middleware
├── .env                         # Add REDIS_URL
├── package.json                 # Add ioredis dependency
```

### 1.3.1 `config/redis.js`
```js
// Singleton Redis client
// Connect to REDIS_URL from .env (default: redis://localhost:6379)
// Export: redisClient instance
// Handle connect, error, reconnect events with console logging
// Graceful shutdown on SIGTERM
```

### 1.3.2 `services/cacheService.js`
```js
class CacheService {
  static async get(key)                    // Get cached data (parse JSON)
  static async set(key, data, ttlSeconds)  // Set cache with TTL
  static async del(key)                    // Delete single key
  static async delPattern(pattern)         // Delete all keys matching pattern (e.g., 'bookings:*')
  static async flush()                     // Flush all cache (admin only)
  static generateKey(...parts)             // Helper to build cache keys
}
```

### 1.3.3 `middleware/cache.js`
```js
// Express middleware factory
// Usage: router.get('/', cache('bookings:list', 300), controller.getAll)
// Checks Redis first → if hit, return cached response
// If miss, wraps res.json() to auto-cache the response
```

### 1.3.4 Cache Invalidation Strategy
- On **create/update/delete** in any controller, call `CacheService.delPattern()` for related cache keys
- Example: Creating a booking invalidates `bookings:list:*`, `dashboard:stats:*`
- Use a helper map to track which mutations invalidate which caches

## 1.4 Environment Variables
```env
REDIS_URL=redis://localhost:6379
CACHE_ENABLED=true
```

## 1.5 Acceptance Criteria
- [ ] Redis connects on server startup (logged in console)
- [ ] GET `/api/bookings` returns cached response on second call (check via `X-Cache: HIT` header)
- [ ] Creating a booking invalidates the bookings cache
- [ ] Dashboard stats are cached and faster on subsequent requests
- [ ] Server degrades gracefully (falls back to DB) if Redis is unavailable
- [ ] Cache can be disabled via `CACHE_ENABLED=false`

## 1.6 README Addition
```markdown
### ⚡ Redis Caching
Implemented Redis caching for high-traffic APIs to improve performance.
- Cached endpoints: Leads, Bookings, Dashboard Stats, Agent Stats, Customers, Commissions
- Smart cache invalidation on write operations
- Graceful fallback when Redis is unavailable
- Configurable TTL per endpoint
```

---

---

# 📦 STEP 2 — Activity / Audit Logs (Expanded)

> **Tier:** 🥇 1  
> **Interview Impact:** ⭐⭐⭐⭐⭐  
> **Estimated Time:** 3–4 hours  
> **Dependencies:** None

## 2.1 Overview

Expand the existing `AuditLog` model and `AuditService` to comprehensively track **every significant action** in the system. Add an API to query and filter audit logs, and a frontend page to display them.

## 2.2 Current State (What Exists)

| Component | Status |
|---|---|
| `models/AuditLog.js` | ✅ Exists — basic schema with `action`, `performedBy`, `targetModel`, `targetId`, `changes`, `metadata` |
| `services/auditService.js` | ✅ Exists — simple `AuditService.log()` method |
| Routes / Controller | ❌ Missing — no API to query audit logs |
| Frontend Page | ❌ Missing |
| Integration into controllers | ⚠️ Partial — not consistently used everywhere |

## 2.3 Actions to Track

| Resource | Actions to Log |
|---|---|
| **Booking** | `BOOKING_CREATED`, `BOOKING_UPDATED`, `BOOKING_STATUS_CHANGED`, `BOOKING_DELETED`, `BOOKING_CANCELLED` |
| **Payment** | `PAYMENT_PROCESSED`, `PAYMENT_REFUNDED`, `PAYMENT_FAILED` |
| **Lead** | `LEAD_CREATED`, `LEAD_UPDATED`, `LEAD_STATUS_CHANGED`, `LEAD_ASSIGNED`, `LEAD_CONVERTED`, `LEAD_DELETED` |
| **Agent** | `AGENT_REGISTERED`, `AGENT_APPROVED`, `AGENT_DEACTIVATED`, `AGENT_ROLE_CHANGED`, `AGENT_PROFILE_UPDATED` |
| **Customer** | `CUSTOMER_CREATED`, `CUSTOMER_UPDATED`, `CUSTOMER_DELETED` |
| **Commission** | `COMMISSION_CREATED`, `COMMISSION_APPROVED`, `COMMISSION_PAID` |
| **Itinerary** | `ITINERARY_CREATED`, `ITINERARY_UPDATED`, `ITINERARY_DELETED`, `ITINERARY_CLONED` |
| **Auth** | `AUTH_LOGIN`, `AUTH_LOGOUT`, `AUTH_PASSWORD_CHANGED` |

## 2.4 Technical Implementation

### Files to Modify
```
backend/
├── models/AuditLog.js           # Expand schema (add resourceType enum, severity levels)
├── services/auditService.js     # Add query methods, filter helpers, bulk log
├── utils/constants.js           # Add AUDIT_ACTIONS enum
```

### New Files to Create
```
backend/
├── controllers/auditController.js   # Query audit logs API
├── routes/auditRoutes.js            # Routes: GET /api/audit-logs
frontend/
├── src/pages/AuditLogsPage.tsx      # Audit log viewer page
```

### Files to Integrate Logging Into (add `AuditService.log()` calls)
```
backend/controllers/
├── bookingController.js
├── paymentController.js
├── leadController.js
├── agentController.js
├── customerController.js
├── commissionController.js
├── itineraryController.js
├── authController.js
```

### 2.4.1 Enhanced `AuditLog` Schema
```js
// Add to existing schema:
severity: { type: String, enum: ['info', 'warning', 'critical'], default: 'info' }
resourceType: { type: String, enum: ['booking', 'payment', 'lead', 'agent', 'customer', 'commission', 'itinerary', 'auth'] }
// Add compound index: { resourceType: 1, createdAt: -1 }
// Add index: { targetId: 1 }
```

### 2.4.2 Audit Log API Endpoints

| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/audit-logs` | List audit logs (paginated, filterable) | Admin+ |
| `GET` | `/api/audit-logs/stats` | Audit log statistics | Admin+ |
| `GET` | `/api/audit-logs/:id` | Get single audit log detail | Admin+ |

#### Query Parameters for `GET /api/audit-logs`
```
?action=BOOKING_CREATED
?performedBy=<agentId>
?resourceType=booking
?targetId=<resourceId>
?severity=critical
?startDate=2026-01-01&endDate=2026-02-01
?page=1&limit=20
?sort=-createdAt
```

## 2.5 Acceptance Criteria
- [ ] Every controller action creates an audit log entry
- [ ] Audit logs store before/after `changes` for update operations
- [ ] `GET /api/audit-logs` returns paginated, filterable results
- [ ] Only Admin+ can access audit log endpoints
- [ ] Frontend page displays audit logs in a timeline/table view
- [ ] Client IP and user agent are captured in metadata

---

---

# 📦 STEP 3 — Notification System

> **Tier:** 🥇 1  
> **Interview Impact:** ⭐⭐⭐⭐  
> **Estimated Time:** 3–4 hours  
> **Dependencies:** None (benefits from Step 2 for trigger events)

## 3.1 Overview

Implement a **dual notification system**: in-app notifications stored in MongoDB + email simulation via console logging. Notifications fire on key business events.

## 3.2 Notification Triggers

| Event | Notification To | Channel | Priority |
|---|---|---|---|
| Lead assigned to agent | Assigned agent | In-app + Email | High |
| Booking confirmed | Agent + Customer (simulated) | In-app + Email | High |
| Payment received | Agent + Admin | In-app + Email | High |
| Booking cancelled | Agent + Admin | In-app | Medium |
| Agent approved | Agent | In-app + Email | High |
| Agent role changed | Agent | In-app + Email | Medium |
| Commission approved | Agent | In-app + Email | Medium |
| Lead status changed | Assigned agent | In-app | Low |
| Booking reminder (7d before) | Agent | In-app + Email | Medium |

## 3.3 Technical Implementation

### New Dependencies
```bash
npm install nodemailer   # (For email simulation via Ethereal/console transport)
```

### New Files to Create
```
backend/
├── models/Notification.js           # Notification schema
├── services/notificationService.js  # Core notification logic
├── services/emailService.js         # Email simulation (console + Ethereal)
├── controllers/notificationController.js
├── routes/notificationRoutes.js
frontend/
├── src/pages/NotificationsPage.tsx        # Notification center
├── src/components/NotificationBell.tsx    # Header bell icon with badge
```

### Files to Modify
```
backend/
├── server.js                     # Mount notification routes
├── controllers/
│   ├── bookingController.js      # Trigger notification on confirm/cancel
│   ├── paymentController.js      # Trigger notification on payment received
│   ├── leadController.js         # Trigger notification on assign/status change
│   ├── agentController.js        # Trigger notification on approve/role change
│   └── commissionController.js   # Trigger notification on approve
frontend/
├── src/components/Layout.tsx     # Add NotificationBell to header
├── src/App.tsx                   # Add notification route
```

### 3.3.1 `Notification` Schema
```js
{
  recipient: { type: ObjectId, ref: 'Agent', required: true, index: true },
  type: { type: String, enum: [
    'LEAD_ASSIGNED', 'BOOKING_CONFIRMED', 'BOOKING_CANCELLED',
    'PAYMENT_RECEIVED', 'AGENT_APPROVED', 'ROLE_CHANGED',
    'COMMISSION_APPROVED', 'LEAD_STATUS_CHANGED', 'BOOKING_REMINDER',
    'SYSTEM'
  ]},
  title: { type: String, required: true },
  message: { type: String, required: true },
  resourceType: String,       // 'booking', 'lead', 'payment', etc.
  resourceId: ObjectId,       // Link to the related resource
  isRead: { type: Boolean, default: false, index: true },
  readAt: Date,
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  emailSent: { type: Boolean, default: false }
}
// timestamps: true
// Index: { recipient: 1, isRead: 1, createdAt: -1 }
```

### 3.3.2 Notification API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/notifications` | Get my notifications (paginated) |
| `GET` | `/api/notifications/unread-count` | Get unread notification count |
| `PATCH` | `/api/notifications/:id/read` | Mark notification as read |
| `PATCH` | `/api/notifications/read-all` | Mark all as read |
| `DELETE` | `/api/notifications/:id` | Delete a notification |

### 3.3.3 Email Simulation
```js
// emailService.js
// Uses nodemailer with a console/stream transport
// Logs email subject, to, body to console in a formatted manner
// In production: swap transport to SMTP/SendGrid/SES
// Function: sendEmail({ to, subject, html, text })
```

## 3.4 Acceptance Criteria
- [ ] Notifications created on all trigger events
- [ ] `GET /api/notifications` returns paginated results for current user
- [ ] Unread count endpoint works for the notification bell badge
- [ ] Mark as read / mark all as read works
- [ ] Email simulation logs detailed email output to console
- [ ] Frontend bell icon shows unread count badge
- [ ] Clicking bell opens notification panel/page

---

---

# 📦 STEP 4 — Dashboard Analytics APIs

> **Tier:** 🥈 2  
> **Interview Impact:** ⭐⭐⭐⭐⭐  
> **Estimated Time:** 3–4 hours  
> **Dependencies:** Benefits from Step 1 (cache analytics responses)

## 4.1 Overview

Supercharge the existing basic dashboard with **advanced MongoDB aggregation pipelines** to provide rich analytics: total revenue, conversion rates, top agents, monthly growth trends, revenue breakdowns, and more.

## 4.2 Current State

The existing `dashboardController.js` has basic stats: `totalCustomers`, `totalBookings`, `totalRevenue`, `totalCommission`, `pendingBookings`, `confirmedBookings`, `totalLeads`, `conversionRate`.

**What's missing:** Time-series data, top agents ranking, monthly growth, revenue by trip type, booking trends, and period-over-period comparisons.

## 4.3 New Analytics Endpoints

| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/dashboard/analytics/revenue` | Revenue breakdowns (by month, trip type, agent) | Admin+ |
| `GET` | `/api/dashboard/analytics/bookings` | Booking trends (by status, month, trip type) | Admin+ |
| `GET` | `/api/dashboard/analytics/conversion` | Lead conversion funnel metrics | Admin+ |
| `GET` | `/api/dashboard/analytics/top-agents` | Top agents by revenue, bookings, conversion | Admin+ |
| `GET` | `/api/dashboard/analytics/monthly-growth` | Month-over-month growth metrics | Admin+ |
| `GET` | `/api/dashboard/analytics/overview` | Combined overview with all key KPIs | All |

### Query Parameters
```
?period=7d|30d|90d|1y|all        # Time period filter
?startDate=2026-01-01             # Custom range start
?endDate=2026-02-14               # Custom range end
?groupBy=month|week|day           # Aggregation granularity
```

## 4.4 Technical Implementation

### New Files to Create
```
backend/
├── services/analyticsService.js         # All aggregation pipeline logic
├── controllers/analyticsController.js   # Thin controller wrapping service
├── routes/analyticsRoutes.js            # New routes under /api/dashboard/analytics
```

### Files to Modify
```
backend/
├── server.js                            # Mount analytics routes (or add to dashboard routes)
├── routes/dashboardRoutes.js            # Add analytics sub-routes
frontend/
├── src/pages/DashboardPage.tsx          # Enhanced charts and KPIs
```

### 4.4.1 Key Aggregation Pipelines

#### Revenue by Month
```js
Booking.aggregate([
  { $match: { status: { $in: ['confirmed', 'completed'] }, createdAt: { $gte: startDate } } },
  { $group: {
      _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
      totalRevenue: { $sum: '$pricing.totalAmount' },
      bookingCount: { $sum: 1 },
      avgBookingValue: { $avg: '$pricing.totalAmount' }
  }},
  { $sort: { '_id.year': 1, '_id.month': 1 } }
])
```

#### Top Agents
```js
Booking.aggregate([
  { $match: { status: { $in: ['confirmed', 'completed'] } } },
  { $group: {
      _id: '$agent',
      totalRevenue: { $sum: '$pricing.totalAmount' },
      totalBookings: { $sum: 1 }
  }},
  { $sort: { totalRevenue: -1 } },
  { $limit: 10 },
  { $lookup: { from: 'agents', localField: '_id', foreignField: '_id', as: 'agentInfo' } }
])
```

#### Conversion Funnel
```js
// Count leads at each status stage → calculate drop-off rates
Lead.aggregate([
  { $group: { _id: '$status', count: { $sum: 1 } } },
  { $sort: { count: -1 } }
])
```

#### Monthly Growth (Period-over-Period)
```js
// Compare current month vs previous month for: revenue, bookings, leads, customers
// Calculate percentage growth
```

## 4.5 Acceptance Criteria
- [ ] Revenue endpoint returns monthly revenue breakdown with totals
- [ ] Top agents endpoint returns ranked agent list with revenue + bookings
- [ ] Conversion funnel shows lead pipeline with drop-off rates
- [ ] Monthly growth shows period-over-period percentage changes
- [ ] All endpoints support period filtering (`?period=30d`)
- [ ] Responses are cached via Redis (from Step 1) if available
- [ ] Frontend dashboard shows charts for revenue trends and top agents

---

---

# 📦 STEP 5 — Booking Conflict Protection

> **Tier:** 🥈 2  
> **Interview Impact:** ⭐⭐⭐⭐  
> **Estimated Time:** 2–3 hours  
> **Dependencies:** None

## 5.1 Overview

Prevent real-world booking conflicts:
- **Same customer** cannot have overlapping bookings for the **same destination** on **same dates**
- **Duplicate payment prevention** — same transaction cannot be processed twice
- **Concurrent booking protection** — use optimistic locking to prevent race conditions

## 5.2 Conflict Rules

| Rule | Description | HTTP Response |
|---|---|---|
| **Date Overlap** | Customer already has a booking at the same destination with overlapping `startDate`–`endDate` | 409 Conflict |
| **Duplicate Booking** | Identical customer + destination + exact dates | 409 Conflict |
| **Duplicate Payment** | Same `booking` + same `amount` + `status: completed` within 5 minutes | 409 Conflict |
| **Race Condition** | Two agents creating same booking simultaneously | 409 Conflict (optimistic lock) |

## 5.3 Technical Implementation

### Files to Modify
```
backend/
├── services/bookingService.js       # Add conflict check logic before create
├── services/paymentService.js       # Add duplicate payment detection
├── models/Booking.js                # Add compound index + version key (__v)
├── models/Payment.js                # Add compound index for dedup
├── controllers/bookingController.js # Return 409 on conflict with details
├── controllers/paymentController.js # Return 409 on duplicate
```

### New Files to Create
```
backend/
├── services/conflictService.js      # Centralized conflict detection logic
```

### 5.3.1 Booking Conflict Detection
```js
// In conflictService.js
class ConflictService {
  static async checkBookingConflict(customerId, destination, startDate, endDate, excludeBookingId = null) {
    const conflict = await Booking.findOne({
      customer: customerId,
      'tripDetails.destination': destination,
      status: { $nin: ['cancelled', 'refunded'] },
      _id: { $ne: excludeBookingId },
      $or: [
        { 'tripDetails.startDate': { $lte: endDate }, 'tripDetails.endDate': { $gte: startDate } }
      ]
    });
    return conflict; // null = no conflict
  }

  static async checkDuplicatePayment(bookingId, amount, windowMinutes = 5) {
    const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);
    const duplicate = await Payment.findOne({
      booking: bookingId,
      amount: amount,
      status: 'completed',
      createdAt: { $gte: windowStart }
    });
    return duplicate; // null = no duplicate
  }
}
```

### 5.3.2 MongoDB Indexes
```js
// Booking model — add compound index
bookingSchema.index(
  { customer: 1, 'tripDetails.destination': 1, 'tripDetails.startDate': 1, 'tripDetails.endDate': 1 },
  { name: 'booking_conflict_check' }
);

// Payment model — add compound index
paymentSchema.index(
  { booking: 1, amount: 1, status: 1, createdAt: -1 },
  { name: 'payment_dedup_check' }
);
```

## 5.4 Acceptance Criteria
- [ ] Creating a booking with overlapping dates for same customer + destination returns 409
- [ ] Error response includes details about the conflicting booking
- [ ] Duplicate payment within 5-minute window is rejected with 409
- [ ] Cancelled/refunded bookings do NOT cause conflicts
- [ ] Updating a booking's dates also runs conflict check (excluding self)
- [ ] Compound indexes are created for efficient conflict queries

---

---

# 📦 STEP 6 — Advanced Search + Filters

> **Tier:** 🥈 2  
> **Interview Impact:** ⭐⭐⭐⭐  
> **Estimated Time:** 3–4 hours  
> **Dependencies:** Benefits from Step 1 (cache search results)

## 6.1 Overview

Add powerful search and filter capabilities across bookings, leads, customers, and payments. Include text search, date range filters, status filters, sorting, and MongoDB indexes for performance.

## 6.2 Search Capabilities

### Booking Search
```
GET /api/bookings?search=Paris
                 &destination=Paris
                 &status=confirmed,completed
                 &tripType=honeymoon,family
                 &agent=<agentId>
                 &customer=<customerId>
                 &startDateFrom=2026-03-01
                 &startDateTo=2026-06-01
                 &minAmount=50000
                 &maxAmount=200000
                 &priority=high,urgent
                 &sortBy=createdAt
                 &sortOrder=desc
                 &page=1
                 &limit=20
```

### Lead Search
```
GET /api/leads?search=John
              &status=new,contacted,qualified
              &source=website,referral
              &assignedAgent=<agentId>
              &priority=high
              &createdFrom=2026-01-01
              &createdTo=2026-02-01
              &sortBy=createdAt
              &sortOrder=desc
```

### Customer Search
```
GET /api/customers?search=sharma
                  &city=Mumbai
                  &sortBy=name
```

### Payment Search
```
GET /api/payments?status=completed,pending
                 &paymentMethod=upi,bank_transfer
                 &minAmount=1000
                 &maxAmount=50000
                 &dateFrom=2026-01-01
                 &dateTo=2026-02-01
```

## 6.3 Technical Implementation

### New Files to Create
```
backend/
├── utils/queryBuilder.js       # Reusable query builder utility
```

### Files to Modify
```
backend/
├── controllers/bookingController.js    # Enhanced list with filters
├── controllers/leadController.js       # Enhanced list with filters
├── controllers/customerController.js   # Enhanced list with filters
├── controllers/paymentController.js    # Enhanced list with filters
├── models/Booking.js                   # Add text index
├── models/Lead.js                      # Add text index
├── models/Customer.js                  # Add text index
├── models/Payment.js                   # Add indexes
frontend/
├── src/pages/BookingsPage.tsx          # Add filter panel UI
├── src/pages/LeadsPage.tsx             # Add filter panel UI
```

### 6.3.1 `utils/queryBuilder.js`
```js
class QueryBuilder {
  constructor(query, queryParams) {
    this.query = query;
    this.queryParams = queryParams;
  }

  search(fields) { /* text search across specified fields */ }
  filter() { /* apply equality filters */ }
  dateRange(field, fromParam, toParam) { /* date range filter */ }
  numberRange(field, minParam, maxParam) { /* number range filter */ }
  inArray(field, param) { /* filter by comma-separated values */ }
  sort() { /* apply sorting */ }
  paginate() { /* apply pagination, return pagination metadata */ }

  async execute() { /* run query and return { data, pagination } */ }
}
```

### 6.3.2 MongoDB Text Indexes
```js
// Booking
bookingSchema.index({ 'tripDetails.title': 'text', 'tripDetails.destination': 'text', bookingReference: 'text' });

// Lead
leadSchema.index({ 'name.firstName': 'text', 'name.lastName': 'text', 'contactInfo.email': 'text' });

// Customer
customerSchema.index({ firstName: 'text', lastName: 'text', email: 'text', phone: 'text' });
```

## 6.4 Acceptance Criteria
- [ ] `QueryBuilder` utility handles search, filter, sort, paginate generically
- [ ] Bookings can be filtered by destination, status, trip type, date range, amount range
- [ ] Leads can be filtered by status, source, assigned agent, date range
- [ ] Text search works across relevant fields (booking reference, destination, customer name)
- [ ] Pagination metadata returned: `{ page, limit, totalDocs, totalPages, hasNext, hasPrev }`
- [ ] MongoDB indexes created for performance
- [ ] Frontend has a collapsible filter panel on booking and lead pages

---

---

# 📦 STEP 7 — Background Jobs

> **Tier:** 🥉 3  
> **Interview Impact:** ⭐⭐⭐⭐⭐  
> **Estimated Time:** 4–5 hours  
> **Dependencies:** Step 1 (Redis for Bull queue), Step 3 (Notifications for reminders)

## 7.1 Overview

Implement background job processing using **Bull queue** (backed by Redis) and **node-cron** for scheduled tasks. This demonstrates **production-grade architecture** — critical operations shouldn't block the API response.

## 7.2 Job Types

### Scheduled Jobs (Cron)
| Job | Schedule | Description |
|---|---|---|
| **Booking Reminder** | Every day at 9 AM | Find bookings starting in 7 days → send notification |
| **Stale Lead Cleanup** | Every day at midnight | Mark leads with no activity in 30 days as `lost` |
| **Commission Calculation** | Every hour | Calculate pending commissions for completed bookings |
| **Cache Warm-up** | Every 5 minutes | Pre-warm frequently accessed cache keys |
| **Stats Snapshot** | Daily at 11 PM | Save daily stats snapshot for historical trends |

### Async Queue Jobs (Bull)
| Job | Trigger | Description |
|---|---|---|
| **Send Email** | On booking confirm, payment, etc. | Async email sending (no blocking) |
| **Generate Report** | Admin request | Generate PDF/CSV report in background |
| **Bulk Lead Import** | Admin upload | Process CSV of leads asynchronously |
| **Audit Log Batch** | On every request | Batch-write audit logs for performance |

## 7.3 Technical Implementation

### New Dependencies
```bash
npm install bull node-cron
```

### New Files to Create
```
backend/
├── jobs/
│   ├── index.js                    # Job runner initialization
│   ├── queues/
│   │   ├── emailQueue.js           # Bull queue for emails
│   │   ├── reportQueue.js          # Bull queue for reports
│   │   └── leadImportQueue.js      # Bull queue for bulk imports
│   ├── cron/
│   │   ├── bookingReminder.js      # Cron: 7-day booking reminder
│   │   ├── staleLeadCleanup.js     # Cron: Mark stale leads
│   │   ├── commissionCalc.js       # Cron: Auto commission calculation
│   │   └── dailySnapshot.js        # Cron: Stats snapshot
│   └── processors/
│       ├── emailProcessor.js       # Process email queue jobs
│       ├── reportProcessor.js      # Process report generation
│       └── leadImportProcessor.js  # Process bulk lead imports
```

### Files to Modify
```
backend/
├── server.js                       # Initialize job runner on startup
├── package.json                    # Add bull, node-cron deps
├── controllers/bookingController.js # Queue email on booking confirm
├── controllers/paymentController.js # Queue email on payment
```

### 7.3.1 Job Runner (`jobs/index.js`)
```js
// Initialize all cron jobs
// Initialize all Bull queues
// Register all processors
// Export start/stop functions
// Log job execution status
```

### 7.3.2 Example Cron Job (`jobs/cron/bookingReminder.js`)
```js
const cron = require('node-cron');
const Booking = require('../../models/Booking');
const NotificationService = require('../../services/notificationService');

// Run daily at 9 AM
cron.schedule('0 9 * * *', async () => {
  const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const today = new Date();

  const upcomingBookings = await Booking.find({
    'tripDetails.startDate': { $gte: today, $lte: sevenDaysFromNow },
    status: { $in: ['confirmed', 'in_progress'] }
  }).populate('agent customer');

  for (const booking of upcomingBookings) {
    await NotificationService.send({
      recipient: booking.agent._id,
      type: 'BOOKING_REMINDER',
      title: `Upcoming Trip: ${booking.tripDetails.title}`,
      message: `Booking ${booking.bookingReference} starts on ${booking.tripDetails.startDate.toLocaleDateString()}`,
      resourceType: 'booking',
      resourceId: booking._id
    });
  }
});
```

## 7.4 Acceptance Criteria
- [ ] Cron jobs start automatically on server boot
- [ ] Booking reminder sends notifications for bookings starting in 7 days
- [ ] Stale leads are auto-marked as `lost` after 30 days of inactivity
- [ ] Bull queues process email jobs asynchronously
- [ ] Job failures are logged and retried (3 attempts)
- [ ] Dashboard shows job status (optional admin view)

---

---

# 📦 STEP 8 — File Upload Feature

> **Tier:** 🥉 3  
> **Interview Impact:** ⭐⭐⭐⭐  
> **Estimated Time:** 3–4 hours  
> **Dependencies:** None

## 8.1 Overview

Add file upload capabilities for itinerary PDFs, customer documents (passport, visa), and booking attachments. Use **Multer** for local handling and **Cloudinary** for cloud storage.

## 8.2 Upload Use Cases

| Feature | File Types | Max Size | Storage |
|---|---|---|---|
| Itinerary PDF | PDF | 10 MB | Cloudinary |
| Customer Documents | PDF, JPG, PNG | 5 MB | Cloudinary |
| Booking Attachments | PDF, JPG, PNG, DOC | 10 MB | Cloudinary |
| Agent Profile Photo | JPG, PNG | 2 MB | Cloudinary |

## 8.3 Technical Implementation

### New Dependencies
```bash
npm install multer cloudinary multer-storage-cloudinary
```

### New Files to Create
```
backend/
├── config/cloudinary.js          # Cloudinary config
├── middleware/upload.js           # Multer + Cloudinary storage middleware
├── controllers/uploadController.js
├── routes/uploadRoutes.js
├── models/Document.js            # Document metadata model
```

### Files to Modify
```
backend/
├── .env                          # Add Cloudinary credentials
├── server.js                     # Mount upload routes
├── models/Booking.js             # Add attachments field
├── models/Customer.js            # Add documents field
├── models/Itinerary.js           # Add pdfUrl field
├── models/Agent.js               # Add profilePhoto field
├── package.json                  # Add dependencies
```

### 8.3.1 `Document` Model
```js
{
  fileName: String,
  originalName: String,
  fileUrl: String,                // Cloudinary URL
  publicId: String,               // Cloudinary public ID (for deletion)
  fileType: String,               // 'pdf', 'image', 'document'
  mimeType: String,
  fileSize: Number,               // In bytes
  uploadedBy: { type: ObjectId, ref: 'Agent' },
  linkedTo: {
    model: { type: String, enum: ['Booking', 'Customer', 'Itinerary', 'Agent'] },
    documentId: ObjectId
  },
  category: { type: String, enum: ['itinerary', 'passport', 'visa', 'ticket', 'receipt', 'profile_photo', 'other'] }
}
```

### 8.3.2 Upload API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/uploads/single` | Upload single file |
| `POST` | `/api/uploads/multiple` | Upload multiple files (max 5) |
| `DELETE` | `/api/uploads/:id` | Delete uploaded file |
| `GET` | `/api/uploads/booking/:bookingId` | Get files for a booking |
| `GET` | `/api/uploads/customer/:customerId` | Get files for a customer |

### 8.3.3 Environment Variables
```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

## 8.4 Acceptance Criteria
- [ ] Single and multiple file uploads work via API
- [ ] Files uploaded to Cloudinary and URLs stored in Document model
- [ ] File type and size validation enforced (reject invalid files)
- [ ] Files can be linked to bookings, customers, itineraries, or agents
- [ ] Files can be deleted (removes from Cloudinary + DB)
- [ ] Frontend shows file upload UI on booking/customer/itinerary detail pages

---

---

# 📦 STEP 9 — Role Permission Matrix (Dynamic)

> **Tier:** 🥉 3  
> **Interview Impact:** ⭐⭐⭐⭐⭐  
> **Estimated Time:** 4–5 hours  
> **Dependencies:** Step 2 (Audit logs for permission changes)

## 9.1 Overview

Move the currently **hardcoded** role-permission matrix (`config/role.js`) to a **database-driven, dynamically configurable** system. Super Admins can modify role permissions via an admin UI without code changes.

## 9.2 Current State

Permissions are hardcoded in `config/role.js` as the `ROLE_PERMISSIONS` object. Each role has ~18 boolean permissions. Changes require code deployment.

## 9.3 Technical Implementation

### New Files to Create
```
backend/
├── models/Permission.js                 # Permission matrix model
├── services/permissionService.js        # Permission CRUD + caching
├── controllers/permissionController.js
├── routes/permissionRoutes.js
├── seeders/seedPermissions.js           # Seed default permissions from current config
frontend/
├── src/pages/PermissionMatrixPage.tsx   # Admin UI for managing permissions
```

### Files to Modify
```
backend/
├── config/role.js              # Fallback to hardcoded if DB unavailable
├── middleware/roleCheck.js     # Check permissions from DB (via service) instead of config
├── server.js                   # Mount permission routes + seed on first boot
```

### 9.3.1 `Permission` Model
```js
{
  role: { type: String, enum: ['super_admin', 'admin', 'senior_agent', 'agent', 'junior_agent'], required: true, unique: true },
  permissions: {
    canCreateAdmin: { type: Boolean, default: false },
    canDeleteAgents: { type: Boolean, default: false },
    canViewAllAgents: { type: Boolean, default: false },
    canApproveAgents: { type: Boolean, default: false },
    canChangeAnyRole: { type: Boolean, default: false },
    canViewAllBookings: { type: Boolean, default: false },
    canDeleteAnyBooking: { type: Boolean, default: false },
    canUpdateAnyBooking: { type: Boolean, default: false },
    canViewAllCustomers: { type: Boolean, default: false },
    canDeleteAnyCustomer: { type: Boolean, default: false },
    canApproveCommissions: { type: Boolean, default: false },
    canProcessRefunds: { type: Boolean, default: false },
    canViewAllPayments: { type: Boolean, default: false },
    canViewFinancialReports: { type: Boolean, default: false },
    canAssignLeads: { type: Boolean, default: false },
    canViewAllLeads: { type: Boolean, default: false },
    canManageSettings: { type: Boolean, default: false },
    canViewAuditLogs: { type: Boolean, default: false },
    canManageTeam: { type: Boolean, default: false },
    // New permissions that can be added dynamically:
    canUploadFiles: { type: Boolean, default: false },
    canViewAnalytics: { type: Boolean, default: false },
    canManageNotifications: { type: Boolean, default: false }
  },
  lastModifiedBy: { type: ObjectId, ref: 'Agent' },
  version: { type: Number, default: 1 }
}
```

### 9.3.2 Permission API Endpoints

| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/permissions` | Get all role permissions | Admin+ |
| `GET` | `/api/permissions/:role` | Get permissions for a role | Admin+ |
| `PUT` | `/api/permissions/:role` | Update permissions for a role | Super Admin |
| `POST` | `/api/permissions/reset` | Reset to default permissions | Super Admin |

### 9.3.3 Permission Service (with Cache)
```js
class PermissionService {
  static async getPermissions(role)           // DB lookup with Redis cache
  static async hasPermission(role, permission) // Single permission check
  static async updatePermissions(role, updates, adminId) // Update + audit log + cache invalidate
  static async resetToDefaults()              // Reset all roles to hardcoded defaults
  static async loadAllPermissions()           // Load all into cache on startup
}
```

### 9.3.4 Frontend Permission Matrix UI
- Grid/table view with roles as columns and permissions as rows
- Toggle switches for each permission
- Only Super Admin can modify
- Shows version history of changes
- Confirms before saving with "Are you sure?" dialog

## 9.4 Acceptance Criteria
- [ ] Permissions seeded from current hardcoded config on first boot
- [ ] `hasPermission()` reads from DB (cached in Redis) instead of hardcoded config
- [ ] Super Admin can update any role's permissions via UI
- [ ] Permission changes are audit-logged (Step 2)
- [ ] Cache invalidated after permission change
- [ ] Fallback to hardcoded permissions if DB is unavailable
- [ ] `super_admin` permissions cannot be reduced below critical thresholds

---

---

# 📦 STEP 10 — Microservice Simulation

> **Tier:** 💎 4 (Elite)  
> **Interview Impact:** ⭐⭐⭐⭐⭐  
> **Estimated Time:** 6–8 hours  
> **Dependencies:** All previous steps (this is the capstone)

## 10.1 Overview

Refactor the monolithic Express application into a **simulated microservice architecture**. Each service runs in the same process but is structured as an independent module with its own routes, controllers, services, and models — communicating via an **internal event bus**.

> ⚠️ **Note:** This is a *simulation*, not a full deployment split. The goal is to demonstrate **microservice design thinking** without the operational complexity of separate deployments. An interviewer will be impressed by the architecture pattern even in a monolith.

## 10.2 Service Boundaries

| Service | Responsibility | Models | Routes |
|---|---|---|---|
| **Auth Service** | Authentication, authorization, agent management | Agent, Permission | `/api/auth/*`, `/api/agents/*` |
| **Booking Service** | Bookings, itineraries, customers | Booking, Itinerary, Customer | `/api/bookings/*`, `/api/itineraries/*`, `/api/customers/*` |
| **Payment Service** | Payments, commissions, financial reports | Payment, Commission | `/api/payments/*`, `/api/commissions/*` |
| **Notification Service** | Notifications, emails | Notification | `/api/notifications/*` |
| **Analytics Service** | Dashboard, reports, audit logs | AuditLog | `/api/dashboard/*`, `/api/audit-logs/*` |

## 10.3 Technical Implementation

### New Project Structure
```
backend/
├── server.js                          # Orchestrator — mounts all services
├── shared/
│   ├── eventBus.js                    # Internal event emitter (pub/sub)
│   ├── serviceRegistry.js            # Service health + discovery
│   └── middleware/                    # Shared middleware (auth, etc.)
│       ├── auth.js
│       ├── roleCheck.js
│       ├── errorHandler.js
│       └── validate.js
├── services/
│   ├── auth/
│   │   ├── index.js                  # Service entry point (mini express router)
│   │   ├── controllers/
│   │   │   ├── authController.js
│   │   │   └── agentController.js
│   │   ├── routes/
│   │   │   ├── authRoutes.js
│   │   │   └── agentRoutes.js
│   │   ├── models/
│   │   │   └── Agent.js
│   │   └── services/
│   │       └── authService.js
│   ├── booking/
│   │   ├── index.js
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── models/
│   │   └── services/
│   ├── payment/
│   │   ├── index.js
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── models/
│   │   └── services/
│   ├── notification/
│   │   ├── index.js
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── models/
│   │   └── services/
│   └── analytics/
│       ├── index.js
│       ├── controllers/
│       ├── routes/
│       ├── models/
│       └── services/
├── config/                            # Shared config
├── utils/                             # Shared utilities
└── jobs/                              # Background jobs (from Step 7)
```

### 10.3.1 Event Bus (`shared/eventBus.js`)
```js
const EventEmitter = require('events');

class EventBus extends EventEmitter {
  publish(event, data) {
    console.log(`[EventBus] Publishing: ${event}`);
    this.emit(event, data);
  }

  subscribe(event, handler) {
    console.log(`[EventBus] Subscribing: ${event}`);
    this.on(event, handler);
  }
}

// Events:
// BOOKING_CREATED → Payment Service (auto-create commission), Notification Service
// PAYMENT_COMPLETED → Booking Service (update payment status), Notification Service
// LEAD_ASSIGNED → Notification Service
// AGENT_APPROVED → Notification Service
// AGENT_ROLE_CHANGED → Auth Service (refresh permissions cache)
```

### 10.3.2 Service Registry
```js
class ServiceRegistry {
  static services = new Map();

  static register(name, service) { /* register service with health check */ }
  static get(name) { /* get service instance */ }
  static healthCheck() { /* return health status of all services */ }
}
```

### 10.3.3 Server Orchestrator (`server.js` rewrite)
```js
// Import all services
const authService = require('./services/auth');
const bookingService = require('./services/booking');
const paymentService = require('./services/payment');
const notificationService = require('./services/notification');
const analyticsService = require('./services/analytics');

// Mount services
app.use('/api', authService.routes);
app.use('/api', bookingService.routes);
app.use('/api', paymentService.routes);
app.use('/api', notificationService.routes);
app.use('/api', analyticsService.routes);

// Health endpoint shows per-service status
app.get('/api/health', (req, res) => {
  res.json({
    status: 'running',
    services: ServiceRegistry.healthCheck()
  });
});
```

## 10.4 Migration Strategy

1. **Phase 1:** Create the `shared/` folder and move common middleware + utils
2. **Phase 2:** Create `services/auth/` and move auth-related files (maintaining same API contracts)
3. **Phase 3:** Create `services/booking/` and move booking-related files
4. **Phase 4:** Create `services/payment/` and move payment-related files
5. **Phase 5:** Create `services/notification/` and `services/analytics/`
6. **Phase 6:** Wire up the event bus for cross-service communication
7. **Phase 7:** Update `server.js` to be the orchestrator
8. **Phase 8:** Test all existing API endpoints still work identically

## 10.5 Acceptance Criteria
- [ ] All files organized into service-specific directories
- [ ] Each service has its own `index.js` entry point exporting its router
- [ ] Shared middleware and utils are in `shared/` directory
- [ ] Event bus handles cross-service communication (no direct imports between services)
- [ ] All existing API endpoints work identically (zero breaking changes)
- [ ] `/api/health` shows per-service health status
- [ ] Service Registry tracks all mounted services
- [ ] README documents the microservice architecture

---

---

# 📊 Master Implementation Summary

| Step | Feature | Tier | Time | Key Dependencies | New Packages |
|:---:|---|:---:|:---:|---|---|
| 1 | Redis Caching | 🥇 | 3–4h | None | `ioredis` |
| 2 | Audit Logs (Expanded) | 🥇 | 3–4h | None | None |
| 3 | Notification System | 🥇 | 3–4h | None | `nodemailer` |
| 4 | Dashboard Analytics | 🥈 | 3–4h | Step 1 (optional) | None |
| 5 | Booking Conflict Protection | 🥈 | 2–3h | None | None |
| 6 | Advanced Search + Filters | 🥈 | 3–4h | Step 1 (optional) | None |
| 7 | Background Jobs | 🥉 | 4–5h | Steps 1, 3 | `bull`, `node-cron` |
| 8 | File Upload | 🥉 | 3–4h | None | `multer`, `cloudinary`, `multer-storage-cloudinary` |
| 9 | Role Permission Matrix | 🥉 | 4–5h | Step 2 | None |
| 10 | Microservice Simulation | 💎 | 6–8h | All | None |

**Total estimated time: 35–45 hours**

---

## 🏷️ README Additions After All Steps

Add this section to `README.md` under **Features**:

```markdown
### ⚡ Performance & Caching
- Redis caching for high-traffic APIs (leads, bookings, dashboard, commissions)
- Smart cache invalidation on write operations
- Configurable TTL per endpoint with graceful fallback

### 📋 Enterprise Audit Trail
- Comprehensive activity logging for all CRUD operations
- Before/after change tracking for update operations
- Filterable audit log viewer (by action, user, resource, date range)
- Admin-only audit log API with pagination

### 🔔 Notification System
- In-app notifications with unread count badge
- Email simulation (console-based, production-ready architecture)
- Event-driven triggers for key business events (booking confirm, payment, lead assignment)

### 📈 Advanced Analytics
- Revenue breakdowns by month, trip type, and agent
- Lead conversion funnel with drop-off analysis
- Top agents ranking by revenue and bookings
- Month-over-month growth metrics with period comparisons

### 🛡️ Booking Conflict Protection
- Overlapping date detection for same customer + destination
- Duplicate payment prevention within time windows
- Optimistic locking for concurrent booking protection

### 🔍 Advanced Search & Filters
- Full-text search across bookings, leads, customers
- Multi-criteria filtering (status, date range, amount range, destination)
- MongoDB text indexes for performance
- Generic QueryBuilder utility for consistent filtering

### ⏰ Background Job Processing
- Bull queue for async email/report processing
- Cron-based scheduled tasks (booking reminders, stale lead cleanup)
- Auto commission calculation for completed bookings

### 📎 File Upload System
- Cloudinary-based cloud file storage
- Support for itinerary PDFs, customer documents, booking attachments
- File type/size validation, document metadata tracking

### 🔐 Dynamic Permission Management
- Database-driven role-permission matrix (replaces hardcoded config)
- Admin UI for toggling role permissions in real-time
- Version-tracked permission changes with audit trail

### 🏗️ Microservice Architecture
- Service-oriented module structure (Auth, Booking, Payment, Notification, Analytics)
- Internal event bus for cross-service communication
- Service registry with per-service health monitoring
```

---

> **Tip:** When presenting in interviews, walk through the system design decisions for each feature — *why* Redis over in-memory caching, *why* Bull over simple setTimeout, *why* event bus for cross-service communication. The "why" is more impressive than the "what".
