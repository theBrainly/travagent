// jobs/queues/emailQueue.js
const Bull = require('bull');
const { getRedisClient, isConnected } = require('../../config/redis');

let emailQueue = null;

const createEmailQueue = () => {
    if (!isConnected()) {
        console.log('  ⚠️  [EmailQueue] Redis not connected — email queue disabled');
        return null;
    }

    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

    emailQueue = new Bull('email-queue', redisUrl, {
        defaultJobOptions: {
            attempts: 3,
            backoff: { type: 'exponential', delay: 2000 },
            removeOnComplete: 50,
            removeOnFail: 100
        }
    });

    emailQueue.on('completed', (job) => {
        console.log(`  ✅ [EmailQueue] Job ${job.id} completed: ${job.data.subject}`);
    });

    emailQueue.on('failed', (job, err) => {
        console.error(`  ❌ [EmailQueue] Job ${job.id} failed: ${err.message}`);
    });

    emailQueue.on('error', (err) => {
        console.error(`  ❌ [EmailQueue] Queue error: ${err.message}`);
    });

    console.log('  ✅ [EmailQueue] Initialized');
    return emailQueue;
};

const addEmailJob = async (emailData) => {
    if (!emailQueue) {
        // Fallback: send email synchronously if queue unavailable
        const EmailService = require('../../services/emailService');
        return EmailService.sendEmail(emailData);
    }
    return emailQueue.add('send-email', emailData);
};

const getQueue = () => emailQueue;

module.exports = { createEmailQueue, addEmailJob, getQueue };
