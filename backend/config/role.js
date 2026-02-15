// config/roles.js
const ROLES = {
    SUPER_ADMIN: 'super_admin',
    ADMIN: 'admin',
    SENIOR_AGENT: 'senior_agent',
    AGENT: 'agent',
    JUNIOR_AGENT: 'junior_agent'
};

const ROLE_LEVELS = {
    super_admin: 5,
    admin: 4,
    senior_agent: 3,
    agent: 2,
    junior_agent: 1
};

const SELF_ASSIGNABLE_ROLES = ['agent'];

const ROLE_CREATION_PERMISSIONS = {
    super_admin: ['admin', 'senior_agent', 'agent', 'junior_agent'],
    admin: ['senior_agent', 'agent', 'junior_agent'],
    senior_agent: ['agent', 'junior_agent'],
    agent: [],
    junior_agent: []
};

const ROLE_PROMOTION_PERMISSIONS = {
    super_admin: ['admin', 'senior_agent', 'agent', 'junior_agent'],
    admin: ['senior_agent', 'agent', 'junior_agent'],
    senior_agent: ['agent', 'junior_agent'],
    agent: [],
    junior_agent: []
};

const ROLE_PERMISSIONS = {
    super_admin: {
        canCreateAdmin: true,
        canDeleteAgents: true,
        canViewAllAgents: true,
        canApproveAgents: true,
        canChangeAnyRole: true,
        canViewAllBookings: true,
        canDeleteAnyBooking: true,
        canUpdateAnyBooking: true,
        canViewAllCustomers: true,
        canDeleteAnyCustomer: true,
        canApproveCommissions: true,
        canProcessRefunds: true,
        canViewAllPayments: true,
        canViewFinancialReports: true,
        canAssignLeads: true,
        canViewAllLeads: true,
        canManageSettings: true,
        canViewAuditLogs: true,
        canManageTeam: true,
        canViewAnalytics: true,
        canUploadFiles: true,
        canManageNotifications: true
    },
    admin: {
        canCreateAdmin: false,
        canDeleteAgents: false,
        canViewAllAgents: true,
        canApproveAgents: true,
        canChangeAnyRole: false,
        canViewAllBookings: true,
        canDeleteAnyBooking: false,
        canUpdateAnyBooking: true,
        canViewAllCustomers: true,
        canDeleteAnyCustomer: false,
        canApproveCommissions: true,
        canProcessRefunds: true,
        canViewAllPayments: true,
        canViewFinancialReports: true,
        canAssignLeads: true,
        canViewAllLeads: true,
        canManageSettings: false,
        canViewAuditLogs: true,
        canManageTeam: true,
        canViewAnalytics: true,
        canUploadFiles: true,
        canManageNotifications: true
    },
    senior_agent: {
        canCreateAdmin: false,
        canDeleteAgents: false,
        canViewAllAgents: false,
        canApproveAgents: false,
        canChangeAnyRole: false,
        canViewAllBookings: false,
        canDeleteAnyBooking: false,
        canUpdateAnyBooking: false,
        canViewAllCustomers: false,
        canDeleteAnyCustomer: false,
        canApproveCommissions: false,
        canProcessRefunds: true,
        canViewAllPayments: false,
        canViewFinancialReports: false,
        canAssignLeads: false,
        canViewAllLeads: false,
        canManageSettings: false,
        canViewAuditLogs: false,
        canManageTeam: true,
        canViewAnalytics: true,
        canUploadFiles: true,
        canManageNotifications: true
    },
    agent: {
        canCreateAdmin: false,
        canDeleteAgents: false,
        canViewAllAgents: false,
        canApproveAgents: false,
        canChangeAnyRole: false,
        canViewAllBookings: false,
        canDeleteAnyBooking: false,
        canUpdateAnyBooking: false,
        canViewAllCustomers: false,
        canDeleteAnyCustomer: false,
        canApproveCommissions: false,
        canProcessRefunds: false,
        canViewAllPayments: false,
        canViewFinancialReports: false,
        canAssignLeads: false,
        canViewAllLeads: false,
        canManageSettings: false,
        canViewAuditLogs: false,
        canManageTeam: false,
        canViewAnalytics: true,
        canUploadFiles: true,
        canManageNotifications: true
    },
    junior_agent: {
        canCreateAdmin: false,
        canDeleteAgents: false,
        canViewAllAgents: false,
        canApproveAgents: false,
        canChangeAnyRole: false,
        canViewAllBookings: false,
        canDeleteAnyBooking: false,
        canUpdateAnyBooking: false,
        canViewAllCustomers: false,
        canDeleteAnyCustomer: false,
        canApproveCommissions: false,
        canProcessRefunds: false,
        canViewAllPayments: false,
        canViewFinancialReports: false,
        canAssignLeads: false,
        canViewAllLeads: false,
        canManageSettings: false,
        canViewAuditLogs: false,
        canManageTeam: false,
        canViewAnalytics: true,
        canUploadFiles: true,
        canManageNotifications: true
    }
};

const getRoleLevel = (role) => ROLE_LEVELS[role] || 0;
const isRoleHigherOrEqual = (role1, role2) => getRoleLevel(role1) >= getRoleLevel(role2);
const canAssignRole = (assignerRole, targetRole) => (ROLE_CREATION_PERMISSIONS[assignerRole] || []).includes(targetRole);
const canPromoteToRole = (promoterRole, targetRole) => (ROLE_PROMOTION_PERMISSIONS[promoterRole] || []).includes(targetRole);
const isSelfAssignable = (role) => SELF_ASSIGNABLE_ROLES.includes(role);
const hasPermission = (role, permission) => ROLE_PERMISSIONS[role]?.[permission] === true;

module.exports = {
    ROLES, ROLE_LEVELS, SELF_ASSIGNABLE_ROLES,
    ROLE_CREATION_PERMISSIONS, ROLE_PROMOTION_PERMISSIONS, ROLE_PERMISSIONS,
    getRoleLevel, isRoleHigherOrEqual, canAssignRole, canPromoteToRole,
    isSelfAssignable, hasPermission
};
