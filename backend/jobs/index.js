// jobs/index.js — Job Runner Initialization
const { createEmailQueue, getQueue: getEmailQueue } = require('./queues/emailQueue');
const { createReportQueue, getQueue: getReportQueue } = require('./queues/reportQueue');
const processEmailJob = require('./processors/emailProcessor');
const processReportJob = require('./processors/reportProcessor');
const startBookingReminder = require('./cron/bookingReminder');
const startStaleLeadCleanup = require('./cron/staleLeadCleanup');
const startCommissionCalc = require('./cron/commissionCalc');
const { startDailySnapshot } = require('./cron/dailySnapshot');

let cronTasks = [];
let isRunning = false;

/**
 * Start all background jobs: cron tasks + Bull queues
 */
const startJobs = () => {
    if (isRunning) return;

    console.log('\n  ┌────────────────────────────────────────────┐');
    console.log('  │  ⏰ Starting Background Jobs                │');
    console.log('  └────────────────────────────────────────────┘');

    // ── Cron Jobs ────────────────────────────────────
    try {
        const bookingReminderTask = startBookingReminder();
        bookingReminderTask.start();
        cronTasks.push(bookingReminderTask);
        console.log('  ✅ Cron: Booking Reminder (daily 9 AM)');
    } catch (err) {
        console.error(`  ❌ Cron: Booking Reminder failed — ${err.message}`);
    }

    try {
        const staleLeadTask = startStaleLeadCleanup();
        staleLeadTask.start();
        cronTasks.push(staleLeadTask);
        console.log('  ✅ Cron: Stale Lead Cleanup (daily midnight)');
    } catch (err) {
        console.error(`  ❌ Cron: Stale Lead Cleanup failed — ${err.message}`);
    }

    try {
        const commissionTask = startCommissionCalc();
        commissionTask.start();
        cronTasks.push(commissionTask);
        console.log('  ✅ Cron: Commission Calculation (hourly)');
    } catch (err) {
        console.error(`  ❌ Cron: Commission Calculation failed — ${err.message}`);
    }

    try {
        const snapshotTask = startDailySnapshot();
        snapshotTask.start();
        cronTasks.push(snapshotTask);
        console.log('  ✅ Cron: Daily Stats Snapshot (daily 11 PM)');
    } catch (err) {
        console.error(`  ❌ Cron: Daily Stats Snapshot failed — ${err.message}`);
    }

    // ── Bull Queues ──────────────────────────────────
    try {
        const emailQueue = createEmailQueue();
        if (emailQueue) {
            emailQueue.process('send-email', processEmailJob);
        }
    } catch (err) {
        console.error(`  ❌ Queue: Email Queue failed — ${err.message}`);
    }

    try {
        const reportQueue = createReportQueue();
        if (reportQueue) {
            reportQueue.process('generate-report', processReportJob);
        }
    } catch (err) {
        console.error(`  ❌ Queue: Report Queue failed — ${err.message}`);
    }

    isRunning = true;
    console.log('  ────────────────────────────────────────────');
    console.log('  ✅ All background jobs started\n');
};

/**
 * Stop all background jobs gracefully
 */
const stopJobs = async () => {
    console.log('  Stopping background jobs...');

    // Stop cron tasks
    for (const task of cronTasks) {
        task.stop();
    }
    cronTasks = [];

    // Close Bull queues
    try {
        const emailQueue = getEmailQueue();
        if (emailQueue) await emailQueue.close();
    } catch (err) { /* ignore */ }

    try {
        const reportQueue = getReportQueue();
        if (reportQueue) await reportQueue.close();
    } catch (err) { /* ignore */ }

    isRunning = false;
    console.log('  ✅ Background jobs stopped');
};

/**
 * Get job system health status
 */
const getJobsHealth = () => {
    return {
        isRunning,
        cronJobs: cronTasks.length,
        queues: {
            email: getEmailQueue() ? 'active' : 'inactive',
            report: getReportQueue() ? 'active' : 'inactive'
        }
    };
};

module.exports = { startJobs, stopJobs, getJobsHealth };
