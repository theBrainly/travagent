// services/auth/index.js — Auth Service Facade
const express = require('express');
const router = express.Router();
const { eventBus, EVENTS } = require('../../shared/eventBus');

const SERVICE_NAME = 'AuthService';

/**
 * Auth Service — handles authentication, agent management
 * Routes: /api/auth, /api/agents
 */

// Mount existing routes
router.use('/auth', require('../../routes/authRoutes'));
router.use('/agents', require('../../routes/agentRoutes'));

// Event subscriptions
eventBus.subscribe(EVENTS.AGENT_ROLE_CHANGED, async (data) => {
    console.log(`  [${SERVICE_NAME}] Agent role changed: ${data.agentId} → ${data.newRole}`);
}, SERVICE_NAME);

module.exports = {
    name: SERVICE_NAME,
    router,
    description: 'Authentication, agent registration, login, and agent management',
    routes: ['/api/auth', '/api/agents'],
    healthCheck: async () => {
        const Agent = require('../../models/Agent');
        await Agent.countDocuments();
        return true;
    }
};
