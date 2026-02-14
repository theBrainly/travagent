// middleware/roleCheck.js
const ApiResponse = require('../utils/apiResponse');
const {
  getRoleLevel, hasPermission: hasPermissionSync, canPromoteToRole,
  ROLE_PROMOTION_PERMISSIONS
} = require('../config/role');
const PermissionService = require('../services/permissionService');

const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.agent) return ApiResponse.error(res, 'Authentication required', 401);
    if (!allowedRoles.includes(req.agent.role)) {
      return ApiResponse.error(res,
        `Access denied. Role '${req.agent.role}' not authorized. Required: ${allowedRoles.join(', ')}`, 403);
    }
    next();
  };
};

// Alias for authorize (used in permission routes)
const requireRole = (...allowedRoles) => authorize(...allowedRoles);

/**
 * Dynamic permission check — async, checks DB via PermissionService
 * Falls back to hardcoded config if DB query fails
 */
const checkPermission = (permission) => {
  return async (req, res, next) => {
    if (!req.agent) return ApiResponse.error(res, 'Authentication required', 401);

    try {
      // Try dynamic DB-driven permission check
      const allowed = await PermissionService.hasPermission(req.agent.role, permission);
      if (allowed) return next();

      return ApiResponse.error(res, `Access denied. Missing permission: '${permission}'`, 403);
    } catch (err) {
      // Fallback to hardcoded config if DB/cache fails
      console.warn(`[roleCheck] DB permission check failed, using hardcoded fallback: ${err.message}`);
      if (hasPermissionSync(req.agent.role, permission)) return next();
      return ApiResponse.error(res, `Access denied. Missing permission: '${permission}'`, 403);
    }
  };
};

const requireMinLevel = (minLevel) => {
  return (req, res, next) => {
    if (!req.agent) return ApiResponse.error(res, 'Authentication required', 401);
    if (getRoleLevel(req.agent.role) < minLevel) {
      return ApiResponse.error(res, `Access denied. Minimum level ${minLevel} required. Yours: ${getRoleLevel(req.agent.role)}`, 403);
    }
    next();
  };
};

const authorizeOwnerOrHigher = (resourceAgentField = 'agent') => {
  return async (req, res, next) => {
    if (!req.agent) return ApiResponse.error(res, 'Authentication required', 401);
    if (getRoleLevel(req.agent.role) >= 4) return next();
    if (req.resource) {
      const resourceAgentId = req.resource[resourceAgentField]?.toString();
      if (resourceAgentId !== req.agent._id.toString()) {
        return ApiResponse.error(res, 'Access denied. You can only access your own resources.', 403);
      }
    }
    next();
  };
};

const validateRoleChange = () => {
  return (req, res, next) => {
    if (!req.agent) return ApiResponse.error(res, 'Authentication required', 401);
    const { role: newRole } = req.body;
    if (!newRole) return ApiResponse.error(res, 'New role is required', 400);

    if (!canPromoteToRole(req.agent.role, newRole)) {
      const allowed = ROLE_PROMOTION_PERMISSIONS[req.agent.role]?.join(', ') || 'none';
      return ApiResponse.error(res,
        `Role '${req.agent.role}' cannot assign '${newRole}'. Allowed: ${allowed}`, 403);
    }

    if (req.params.id === req.agent._id.toString()) {
      return ApiResponse.error(res, 'You cannot change your own role', 403);
    }
    next();
  };
};

module.exports = {
  authorize, requireRole, checkPermission, requireMinLevel,
  authorizeOwnerOrHigher, validateRoleChange
};