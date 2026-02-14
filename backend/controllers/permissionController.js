// controllers/permissionController.js
const PermissionService = require('../services/permissionService');
const ApiResponse = require('../utils/apiResponse');
const AuditService = require('../services/auditService');

/**
 * Get all role permissions
 * GET /api/permissions
 */
exports.getAllPermissions = async (req, res, next) => {
    try {
        const permissions = await PermissionService.getAllPermissions();
        ApiResponse.success(res, { permissions, count: permissions.length });
    } catch (error) {
        next(error);
    }
};

/**
 * Get permissions for a specific role
 * GET /api/permissions/:role
 */
exports.getRolePermissions = async (req, res, next) => {
    try {
        const { role } = req.params;
        const validRoles = ['super_admin', 'admin', 'senior_agent', 'agent', 'junior_agent'];

        if (!validRoles.includes(role)) {
            return ApiResponse.error(res, `Invalid role. Must be one of: ${validRoles.join(', ')}`, 400);
        }

        const permissions = await PermissionService.getPermissions(role);
        ApiResponse.success(res, { role, permissions });
    } catch (error) {
        next(error);
    }
};

/**
 * Update permissions for a role
 * PUT /api/permissions/:role
 * Body: { permission1: true/false, permission2: true/false, ... }
 */
exports.updateRolePermissions = async (req, res, next) => {
    try {
        const { role } = req.params;
        const updates = req.body;

        const validRoles = ['super_admin', 'admin', 'senior_agent', 'agent', 'junior_agent'];
        if (!validRoles.includes(role)) {
            return ApiResponse.error(res, `Invalid role. Must be one of: ${validRoles.join(', ')}`, 400);
        }

        if (!updates || Object.keys(updates).length === 0) {
            return ApiResponse.error(res, 'At least one permission update is required', 400);
        }

        const permission = await PermissionService.updatePermissions(role, updates, req.agent._id);

        // Audit log — critical action
        AuditService.logCritical(req, 'PERMISSION_UPDATED', 'Permission', permission._id,
            `Updated permissions for role '${role}': ${Object.keys(updates).join(', ')}`,
            { before: {}, after: updates }
        );

        ApiResponse.success(res, { permission }, `Permissions updated for ${role}`);
    } catch (error) {
        next(error);
    }
};

/**
 * Reset all permissions to defaults
 * POST /api/permissions/reset
 */
exports.resetPermissions = async (req, res, next) => {
    try {
        const result = await PermissionService.resetToDefaults(req.agent._id);

        AuditService.logCritical(req, 'PERMISSIONS_RESET', 'Permission', null,
            'All role permissions reset to default values'
        );

        ApiResponse.success(res, result, 'Permissions reset to defaults');
    } catch (error) {
        next(error);
    }
};
