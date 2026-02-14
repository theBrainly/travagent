// services/emailService.js

/**
 * Email Simulation Service
 * In development: logs emails to console in a formatted manner
 * In production: swap transport to SMTP/SendGrid/SES
 */
class EmailService {
    /**
     * Send a simulated email (console-logged)
     * @param {Object} options
     * @param {string} options.to - Recipient email
     * @param {string} options.subject - Email subject
     * @param {string} options.text - Plain text body
     * @param {string} options.html - HTML body (optional)
     */
    static async sendEmail({ to, subject, text, html }) {
        try {
            const timestamp = new Date().toISOString();

            console.log(`
  ┌──────────────────────────────────────────────────────┐
  │  📧 EMAIL SENT (Simulated)                          │
  ├──────────────────────────────────────────────────────┤
  │  To:      ${(to || '').padEnd(42)}│
  │  Subject: ${(subject || '').substring(0, 42).padEnd(42)}│
  │  Time:    ${timestamp.padEnd(42)}│
  ├──────────────────────────────────────────────────────┤
  │  Body:                                               │
  │  ${(text || '').substring(0, 52).padEnd(52)}│
  └──────────────────────────────────────────────────────┘
      `);

            return {
                success: true,
                messageId: `sim_${Date.now()}_${Math.random().toString(36).substring(7)}`,
                to,
                subject,
                timestamp
            };
        } catch (err) {
            console.error('Email send error:', err.message);
            return { success: false, error: err.message };
        }
    }

    /**
     * Send booking confirmation email
     */
    static async sendBookingConfirmation(agentEmail, booking) {
        return EmailService.sendEmail({
            to: agentEmail,
            subject: `Booking Confirmed: ${booking.bookingReference || booking.tripDetails?.title}`,
            text: `Your booking "${booking.tripDetails?.title}" to ${booking.tripDetails?.destination} has been confirmed. Reference: ${booking.bookingReference}. Total: ₹${booking.pricing?.totalAmount?.toLocaleString()}`
        });
    }

    /**
     * Send payment receipt email
     */
    static async sendPaymentReceipt(agentEmail, payment) {
        return EmailService.sendEmail({
            to: agentEmail,
            subject: `Payment Received: ₹${payment.amount?.toLocaleString()} — ${payment.transactionId}`,
            text: `Payment of ₹${payment.amount?.toLocaleString()} via ${payment.paymentMethod} has been processed successfully. Transaction ID: ${payment.transactionId}`
        });
    }

    /**
     * Send lead assignment email
     */
    static async sendLeadAssignment(agentEmail, lead) {
        const name = lead.contactInfo ? `${lead.contactInfo.firstName} ${lead.contactInfo.lastName}` : 'Unknown';
        return EmailService.sendEmail({
            to: agentEmail,
            subject: `New Lead Assigned: ${name}`,
            text: `A new lead "${name}" has been assigned to you. Source: ${lead.source || 'N/A'}. Priority: ${lead.priority || 'medium'}. Please follow up promptly.`
        });
    }

    /**
     * Send agent approval email
     */
    static async sendAgentApproval(agentEmail, agentName) {
        return EmailService.sendEmail({
            to: agentEmail,
            subject: 'Account Approved — Welcome to the Platform!',
            text: `Hi ${agentName}, your agent account has been approved! You can now log in and start managing bookings, leads, and customers.`
        });
    }

    /**
     * Send role change email
     */
    static async sendRoleChange(agentEmail, agentName, oldRole, newRole) {
        return EmailService.sendEmail({
            to: agentEmail,
            subject: `Role Updated: ${oldRole} → ${newRole}`,
            text: `Hi ${agentName}, your role has been changed from "${oldRole}" to "${newRole}". Your permissions have been updated accordingly.`
        });
    }

    /**
     * Send commission approval email
     */
    static async sendCommissionApproval(agentEmail, commission) {
        return EmailService.sendEmail({
            to: agentEmail,
            subject: `Commission Approved: ₹${commission.totalEarning?.toLocaleString()}`,
            text: `Your commission of ₹${commission.totalEarning?.toLocaleString()} has been approved. It will be processed for payment soon.`
        });
    }
}

module.exports = EmailService;
