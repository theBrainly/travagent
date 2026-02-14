// jobs/cron/staleLeadCleanup.js
const cron = require('node-cron');
const Lead = require('../../models/Lead');

/**
 * Stale Lead Cleanup — runs daily at midnight
 * Marks leads with no activity in 30 days as 'lost'
 */
const startStaleLeadCleanup = () => {
    const task = cron.schedule('0 0 * * *', async () => {
        console.log('  ⏰ [Cron] Running stale lead cleanup...');

        try {
            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

            const result = await Lead.updateMany(
                {
                    status: { $in: ['new', 'contacted'] },
                    updatedAt: { $lte: thirtyDaysAgo }
                },
                {
                    $set: {
                        status: 'lost',
                        lostReason: 'Auto-closed: No activity for 30 days',
                        lostAt: new Date()
                    }
                }
            );

            console.log(`  ✅ [Cron] Stale leads marked as lost: ${result.modifiedCount}`);
        } catch (err) {
            console.error(`  ❌ [Cron] Stale lead cleanup error: ${err.message}`);
        }
    }, {
        scheduled: false,
        timezone: 'Asia/Kolkata'
    });

    return task;
};

module.exports = startStaleLeadCleanup;
