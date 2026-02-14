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
        canManageAllAgents: { type: Boolean, default: false },
        canApproveAgents: { type: Boolean, default: false },
        canChangeRoles: { type: Boolean, default: false },
        canViewAllAgents: { type: Boolean, default: false },
        canManageTeam: { type: Boolean, default: false },

        // Booking Management
        canViewAllBookings: { type: Boolean, default: false },
        canDeleteBookings: { type: Boolean, default: false },
        canUpdateBookingStatus: { type: Boolean, default: false },

        // Customer Management
        canViewAllCustomers: { type: Boolean, default: false },
        canDeleteCustomers: { type: Boolean, default: false },

        // Financial
        canViewAllPayments: { type: Boolean, default: false },
        canProcessRefunds: { type: Boolean, default: false },
        canProcessAllRefunds: { type: Boolean, default: false },
        canViewAllCommissions: { type: Boolean, default: false },
        canApproveCommissions: { type: Boolean, default: false },
        canMarkCommissionsPaid: { type: Boolean, default: false },
        canViewFinancials: { type: Boolean, default: false },

        // Leads
        canViewAllLeads: { type: Boolean, default: false },
        canDeleteLeads: { type: Boolean, default: false },
        canReassignLeads: { type: Boolean, default: false },

        // Itineraries
        canViewAllItineraries: { type: Boolean, default: false },
        canDeleteItineraries: { type: Boolean, default: false },

        // Settings & System
        canManageSettings: { type: Boolean, default: false },
        canViewAuditLogs: { type: Boolean, default: false },
        canExportData: { type: Boolean, default: false },

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
