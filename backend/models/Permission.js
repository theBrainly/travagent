// models/Permission.js
const mongoose = require('mongoose');

const permissionSchema = new mongoose.Schema({
    role: {
        type: String,
        required: true,
        unique: true,
        enum: ['super_admin', 'admin', 'senior_agent', 'agent', 'junior_agent'],
        index: true
    },
    permissions: {
        // Agent Management
        canCreateAdmin: { type: Boolean, default: false },
        canDeleteAgents: { type: Boolean, default: false },
        canApproveAgents: { type: Boolean, default: false },
        canChangeAnyRole: { type: Boolean, default: false },
        canViewAllAgents: { type: Boolean, default: false },
        canManageTeam: { type: Boolean, default: false },

        // Booking Management
        canViewAllBookings: { type: Boolean, default: false },
        canDeleteAnyBooking: { type: Boolean, default: false },
        canUpdateAnyBooking: { type: Boolean, default: false },

        // Customer Management
        canViewAllCustomers: { type: Boolean, default: false },
        canDeleteAnyCustomer: { type: Boolean, default: false },

        // Financial
        canViewAllPayments: { type: Boolean, default: false },
        canProcessRefunds: { type: Boolean, default: false },
        canApproveCommissions: { type: Boolean, default: false },
        canViewFinancialReports: { type: Boolean, default: false },

        // Leads
        canViewAllLeads: { type: Boolean, default: false },
        canAssignLeads: { type: Boolean, default: false },

        // Settings & System
        canManageSettings: { type: Boolean, default: false },
        canViewAuditLogs: { type: Boolean, default: false },

        // Dashboard & Analytics
        canViewAnalytics: { type: Boolean, default: true },

        // File uploads
        canUploadFiles: { type: Boolean, default: true },

        // Notifications
        canManageNotifications: { type: Boolean, default: false }
    },
    version: { type: Number, default: 1 },
    lastModifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Agent'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Permission', permissionSchema);
