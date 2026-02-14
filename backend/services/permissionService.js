// services/permissionService.js
const Permission = require('../models/Permission');
const { ROLE_PERMISSIONS } = require('../config/role');
const { CacheService } = require('./cacheService');

const CACHE_KEY_PREFIX = 'permissions:';
const CACHE_TTL = 3600; // 1 hour

class PermissionService {
    /**
     * Get all permissions for a role
     * Checks cache → DB → hardcoded fallback
     */
    static async getPermissions(role) {
        // 1. Check cache first
        const cacheKey = `${CACHE_KEY_PREFIX}${role}`;
        try {
            const cached = await CacheService.get(cacheKey);
            if (cached) return cached;
        } catch (err) { /* cache miss, continue */ }

        // 2. Fetch from database
        try {
            const permission = await Permission.findOne({ role }).lean();
            if (permission) {
                const perms = permission.permissions;
                // Store in cache
                try { await CacheService.set(cacheKey, perms, CACHE_TTL); } catch (err) { /* ignore */ }
                return perms;
            }
        } catch (err) {
            console.error(`[PermissionService] DB fetch error for ${role}: ${err.message}`);
        }

        // 3. Fallback to hardcoded config
        return ROLE_PERMISSIONS[role] || {};
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
        const existing = await Permission.findOne({ role });

        if (!existing) {
            // Create new permission record
            const newPerm = await Permission.create({
                role,
                permissions: { ...ROLE_PERMISSIONS[role], ...updates },
                lastModifiedBy: adminId,
                version: 1
            });

            await this.invalidateCache(role);
            return newPerm;
        }

        // Update existing
        Object.assign(existing.permissions, updates);
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
                permissions: ROLE_PERMISSIONS[role],
                source: 'hardcoded'
            }));
        }

        return permissions;
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
