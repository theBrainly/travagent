// seeders/seedPermissions.js
const Permission = require('../models/Permission');
const { ROLE_PERMISSIONS } = require('../config/role');

/**
 * Seed default permissions from config/role.js into the Permission collection
 * Only seeds if no permissions exist in DB (first boot)
 */
const seedPermissions = async () => {
    try {
        const existingCount = await Permission.countDocuments();

        if (existingCount > 0) {
            console.log(`  ℹ️  Permissions already seeded (${existingCount} roles found)`);
            return { seeded: false, count: existingCount };
        }

        console.log('  🌱 Seeding default permissions...');

        const roles = Object.keys(ROLE_PERMISSIONS);
        const operations = roles.map(role => ({
            updateOne: {
                filter: { role },
                update: {
                    $setOnInsert: {
                        role,
                        permissions: ROLE_PERMISSIONS[role],
                        version: 1
                    }
                },
                upsert: true
            }
        }));

        const result = await Permission.bulkWrite(operations);

        console.log(`  ✅ Permissions seeded for ${roles.length} roles: ${roles.join(', ')}`);
        return { seeded: true, count: roles.length, roles };
    } catch (err) {
        console.error(`  ❌ Permission seeding error: ${err.message}`);
        return { seeded: false, error: err.message };
    }
};

module.exports = seedPermissions;
