// services/permissionService.js
const Permission = require('../models/Permission');
const { ROLE_PERMISSIONS } = require('../config/role');
const { CacheService } = require('./cacheService');

const CACHE_KEY_PREFIX = 'permissions:';
const CACHE_TTL = 3600; // 1 hour
const PERMISSION_ALIASES = {
    canManageAllAgents: 'canViewAllAgents',
    canChangeRoles: 'canChangeAnyRole',
    canDeleteBookings: 'canDeleteAnyBooking',
    canUpdateBookingStatus: 'canUpdateAnyBooking',
    canDeleteCustomers: 'canDeleteAnyCustomer',
    canViewFinancials: 'canViewFinancialReports',
    canReassignLeads: 'canAssignLeads'
};

class PermissionService {
    static normalizePermissions(rawPermissions = {}, role = null) {
        const base = role && ROLE_PERMISSIONS[role]
            ? { ...ROLE_PERMISSIONS[role] }
            : {};

        for (const [key, value] of Object.entries(rawPermissions || {})) {
            const canonicalKey = PERMISSION_ALIASES[key] || key;
            base[canonicalKey] = value === true;
        }

        return base;
    }

    static extractUpdates(payload = {}) {
        const raw = payload.permissions && typeof payload.permissions === 'object'
            ? payload.permissions
            : payload;

        const updates = {};
        for (const [key, value] of Object.entries(raw)) {
            const canonicalKey = PERMISSION_ALIASES[key] || key;
            updates[canonicalKey] = value === true;
        }
        return updates;
    }

    /**
     * Get all permissions for a role
     * Checks cache → DB → hardcoded fallback
     */
    static async getPermissions(role) {
        // 1. Check cache first
        const cacheKey = `${CACHE_KEY_PREFIX}${role}`;
        try {
            const cached = await CacheService.get(cacheKey);
            if (cached) return this.normalizePermissions(cached, role);
        } catch (err) { /* cache miss, continue */ }

        // 2. Fetch from database
        try {
            const permission = await Permission.findOne({ role }).lean();
            if (permission) {
                const perms = this.normalizePermissions(permission.permissions, role);
                // Store in cache
                try { await CacheService.set(cacheKey, perms, CACHE_TTL); } catch (err) { /* ignore */ }
                return perms;
            }
        } catch (err) {
            console.error(`[PermissionService] DB fetch error for ${role}: ${err.message}`);
        }

        // 3. Fallback to hardcoded config
        return this.normalizePermissions({}, role);
    }

    /**
     * Check if a role has a specific permission
     */
    static async hasPermission(role, permission) {
        const perms = await this.getPermissions(role);
        return perms[permission] === true;
    }

    /**
     * Update permissions for a role
     */
    static async updatePermissions(role, updates, adminId) {
        const normalizedUpdates = this.extractUpdates(updates);
        const existing = await Permission.findOne({ role });

        if (!existing) {
            // Create new permission record
            const newPerm = await Permission.create({
                role,
                permissions: { ...ROLE_PERMISSIONS[role], ...normalizedUpdates },
                lastModifiedBy: adminId,
                version: 1
            });

            await this.invalidateCache(role);
            return newPerm;
        }

        // Update existing
        Object.assign(existing.permissions, normalizedUpdates);
        existing.markModified('permissions');
        existing.lastModifiedBy = adminId;
        existing.version = (existing.version || 0) + 1;
        await existing.save();

        await this.invalidateCache(role);
        return existing;
    }

    /**
     * Get all role permissions
     */
    static async getAllPermissions() {
        const permissions = await Permission.find({})
            .populate('lastModifiedBy', 'firstName lastName email')
            .sort('role')
            .lean();

        // If DB has no permissions yet, return hardcoded defaults
        if (!permissions || permissions.length === 0) {
            return Object.keys(ROLE_PERMISSIONS).map(role => ({
                role,
                permissions: this.normalizePermissions({}, role),
                source: 'hardcoded'
            }));
        }

        return permissions.map((permission) => ({
            ...permission,
            permissions: this.normalizePermissions(permission.permissions, permission.role)
        }));
    }

    /**
     * Reset permissions to defaults from config/role.js
     */
    static async resetToDefaults(adminId) {
        const roles = Object.keys(ROLE_PERMISSIONS);

        for (const role of roles) {
            await Permission.findOneAndUpdate(
                { role },
                {
                    permissions: ROLE_PERMISSIONS[role],
                    lastModifiedBy: adminId,
                    version: 1
                },
                { upsert: true, new: true }
            );

            await this.invalidateCache(role);
        }

        return { message: `Reset permissions for ${roles.length} roles`, roles };
    }

    /**
     * Invalidate cache for a specific role
     */
    static async invalidateCache(role) {
        const cacheKey = `${CACHE_KEY_PREFIX}${role}`;
        try { await CacheService.del(cacheKey); } catch (err) { /* ignore */ }
    }

    /**
     * Invalidate all permission caches
     */
    static async invalidateAllCaches() {
        const roles = ['super_admin', 'admin', 'senior_agent', 'agent', 'junior_agent'];
        for (const role of roles) {
            await this.invalidateCache(role);
        }
    }
}

module.exports = PermissionService;
