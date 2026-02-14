// jobs/processors/emailProcessor.js
const EmailService = require('../../services/emailService');

/**
 * Process email queue jobs
 * Called by Bull when a job is dequeued
 */
const processEmailJob = async (job) => {
    const { to, subject, text, html } = job.data;

    console.log(`  📧 [EmailProcessor] Processing job ${job.id}: "${subject}" → ${to}`);

    const result = await EmailService.sendEmail({ to, subject, text, html });

    if (!result.success) {
        throw new Error(`Email send failed: ${result.error}`);
    }

    return result;
};

module.exports = processEmailJob;
