// server.js — Microservice Orchestrator
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

dotenv.config();
connectDB();

// Initialize Redis (graceful degradation — runs without it)
const { connectRedis, gracefulShutdown: redisShutdown, isConnected } = require('./config/redis');
connectRedis();

// Initialize Background Jobs (cron + Bull queues)
const { startJobs, stopJobs, getJobsHealth } = require('./jobs');

// Initialize Cloudinary (for file uploads)
const { configureCloudinary } = require('./config/cloudinary');
configureCloudinary();

// ── Service Registry & Event Bus ────────────────────────────
const { serviceRegistry } = require('./shared/serviceRegistry');
const { eventBus } = require('./shared/eventBus');

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || '*', credentials: true }));

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    message: { success: false, message: 'Too many requests, try again after 15 minutes' }
});
app.use('/api/', limiter);

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { success: false, message: 'Too many auth attempts, try again later' }
});
app.use('/api/auth/', authLimiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

// ── Health Endpoint (Enhanced with Microservice Status) ─────
app.get('/api/health', async (req, res) => {
    const serviceHealth = await serviceRegistry.healthCheck();
    const serviceSummary = serviceRegistry.getSummary();

    res.status(200).json({
        success: true,
        message: 'B2B Travel Platform API is running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        architecture: 'microservice-simulation',
        redis: isConnected() ? 'connected' : 'disconnected',
        jobs: getJobsHealth(),
        services: {
            summary: serviceSummary,
            details: serviceHealth
        },
        eventBus: {
            subscriptions: eventBus.getSubscriptions(),
            recentEvents: eventBus.getEventLog(5)
        }
    });
});

// ══════════════════════════════════════════════════════════════
//   MICROSERVICE ROUTE MOUNTING (via Service Facades)
// ══════════════════════════════════════════════════════════════

// ── Auth Service ─────────────────────────────────────────────
const authService = require('./services/auth');
app.use('/api', authService.router);
serviceRegistry.register(authService.name, authService);

// ── Booking Service ──────────────────────────────────────────
const bookingService = require('./services/booking');
app.use('/api', bookingService.router);
serviceRegistry.register(bookingService.name, bookingService);

// ── Payment Service ──────────────────────────────────────────
const paymentService = require('./services/payment');
app.use('/api', paymentService.router);
serviceRegistry.register(paymentService.name, paymentService);

// ── Notification Service ─────────────────────────────────────
const notificationService = require('./services/notification');
app.use('/api', notificationService.router);
serviceRegistry.register(notificationService.name, notificationService);

// ── Analytics Service ────────────────────────────────────────
const analyticsService = require('./services/analytics');
app.use('/api', analyticsService.router);
serviceRegistry.register(analyticsService.name, analyticsService);

// ══════════════════════════════════════════════════════════════
//   PLATFORM ROUTES (cross-cutting, not in any single service)
// ══════════════════════════════════════════════════════════════

// ── Cache Management (Admin) ────────────────────────────────
const { protect } = require('./middleware/auth');
const { checkPermission } = require('./middleware/roleCheck');
const { CacheService } = require('./services/cacheService');
const ApiResponse = require('./utils/apiResponse');

app.get('/api/cache/status', protect, checkPermission('canManageSettings'), (req, res) => {
    ApiResponse.success(res, { connected: isConnected(), enabled: process.env.CACHE_ENABLED !== 'false' }, 'Cache status');
});

app.post('/api/cache/flush', protect, checkPermission('canManageSettings'), async (req, res) => {
    const result = await CacheService.flush();
    ApiResponse.success(res, { flushed: result }, result ? 'Cache flushed' : 'Flush failed — Redis not connected');
});

app.post('/api/cache/invalidate/:resource', protect, checkPermission('canManageSettings'), async (req, res) => {
    await CacheService.invalidate(req.params.resource);
    ApiResponse.success(res, null, `Cache invalidated for ${req.params.resource}`);
});

// ── File Upload Routes ───────────────────────────────────────
app.use('/api/uploads', require('./routes/uploadRoutes'));

// ── Permission Management Routes ─────────────────────────────
app.use('/api/permissions', require('./routes/permissionRoutes'));

// ── Event Bus Debug Endpoint (Admin only) ────────────────────
app.get('/api/events/log', protect, checkPermission('canManageSettings'), (req, res) => {
    ApiResponse.success(res, {
        subscriptions: eventBus.getSubscriptions(),
        recentEvents: eventBus.getEventLog(50)
    }, 'Event bus status');
});

// ── 404 handler ──────────────────────────────────────────────
app.use('*', (req, res) => {
    res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
    console.log(`
  ╔═══════════════════════════════════════════════╗
  ║   B2B Travel Platform API Server              ║
  ║   Architecture: Microservice Simulation       ║
  ║   Environment: ${(process.env.NODE_ENV || 'development').padEnd(33)}║
  ║   Port: ${String(PORT).padEnd(38)}║
  ║   Status: Running ✓                           ║
  ║   Redis:  ${(isConnected() ? 'Connected ✓' : 'Not connected (degraded)').padEnd(36)}║
  ║   Cache:  ${(process.env.CACHE_ENABLED !== 'false' ? 'Enabled' : 'Disabled').padEnd(36)}║
  ║   Services: ${String(serviceRegistry.getSummary().total + ' registered').padEnd(34)}║
  ╚═══════════════════════════════════════════════╝
  `);

    // Start background jobs after server is listening
    startJobs();

    // Seed default permissions (only if DB has none)
    const seedPermissions = require('./seeders/seedPermissions');
    seedPermissions();
});

// Graceful shutdown
const gracefulShutdown = async () => {
    console.log('\n  Shutting down gracefully...');
    await stopJobs();
    await redisShutdown();
    server.close(() => process.exit(0));
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

process.on('unhandledRejection', (err) => {
    console.error(`Unhandled Rejection: ${err.message}`);
    server.close(() => process.exit(1));
});

process.on('uncaughtException', (err) => {
    console.error(`Uncaught Exception: ${err.message}`);
    server.close(() => process.exit(1));
});
