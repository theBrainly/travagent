// middleware/auth.js
const jwt = require('jsonwebtoken');
const Agent = require('../models/Agent');
const keys = require('../config/keys');
const { getRoleLevel } = require('../config/role');
const ApiResponse = require('../utils/apiResponse');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return ApiResponse.error(res, 'Not authorized. No token provided.', 401);
  }

  try {
    const decoded = jwt.verify(token, keys.jwtSecret);

    // ALWAYS fetch fresh role from database - never trust JWT role
    const agent = await Agent.findById(decoded.id).select('+role');

    if (!agent) {
      return ApiResponse.error(res, 'Agent no longer exists', 401);
    }

    if (!agent.isActive) {
      return ApiResponse.error(res, 'Account deactivated or pending approval. Contact admin.', 403);
    }

    // Detect JWT tampering
    if (decoded.role !== agent.role) {
      console.warn(`⚠️ ROLE MISMATCH: ${agent.email} JWT='${decoded.role}' DB='${agent.role}'`);
    }

    req.agent = agent;
    req.agentRole = agent.role;
    req.roleLevel = getRoleLevel(agent.role);

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return ApiResponse.error(res, 'Token expired. Please login again.', 401);
    }
    return ApiResponse.error(res, 'Invalid token', 401);
  }
};

// Variant that allows pending (inactive) agents through - used for approval status check
const protectPending = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return ApiResponse.error(res, 'Not authorized. No token provided.', 401);
  }

  try {
    const decoded = jwt.verify(token, keys.jwtSecret);
    const agent = await Agent.findById(decoded.id).select('+role');

    if (!agent) {
      return ApiResponse.error(res, 'Agent no longer exists', 401);
    }

    // NOTE: We intentionally do NOT check isActive here
    req.agent = agent;
    req.agentRole = agent.role;
    req.roleLevel = getRoleLevel(agent.role);

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return ApiResponse.error(res, 'Token expired. Please login again.', 401);
    }
    return ApiResponse.error(res, 'Invalid token', 401);
  }
};

module.exports = { protect, protectPending };