// jobs/queues/reportQueue.js
const Bull = require('bull');
const { isConnected } = require('../../config/redis');

let reportQueue = null;

const createReportQueue = () => {
    if (!isConnected()) {
        console.log('  ⚠️  [ReportQueue] Redis not connected — report queue disabled');
        return null;
    }

    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

    reportQueue = new Bull('report-queue', redisUrl, {
        defaultJobOptions: {
            attempts: 2,
            backoff: { type: 'fixed', delay: 5000 },
            removeOnComplete: 20,
            removeOnFail: 50,
            timeout: 60000 // 60s max for report generation
        }
    });

    reportQueue.on('completed', (job) => {
        console.log(`  ✅ [ReportQueue] Job ${job.id} completed: ${job.data.reportType}`);
    });

    reportQueue.on('failed', (job, err) => {
        console.error(`  ❌ [ReportQueue] Job ${job.id} failed: ${err.message}`);
    });

    console.log('  ✅ [ReportQueue] Initialized');
    return reportQueue;
};

const addReportJob = async (reportData) => {
    if (!reportQueue) {
        console.warn('[ReportQueue] Queue not available — cannot generate report in background');
        return null;
    }
    return reportQueue.add('generate-report', reportData);
};

const getQueue = () => reportQueue;

module.exports = { createReportQueue, addReportJob, getQueue };
