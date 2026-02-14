// utils/constants.js
const { ROLES } = require('../config/role');

module.exports = {
  // Agent Roles (re-exported from config/role.js — single source of truth)
  ROLES,

  // Booking Statuses
  BOOKING_STATUS: {
    DRAFT: 'draft',
    PENDING: 'pending',
    CONFIRMED: 'confirmed',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
    REFUNDED: 'refunded'
  },

  // Payment Statuses
  PAYMENT_STATUS: {
    PENDING: 'pending',
    PROCESSING: 'processing',
    COMPLETED: 'completed',
    FAILED: 'failed',
    REFUNDED: 'refunded'
  },

  // Payment Methods
  PAYMENT_METHODS: {
    CREDIT_CARD: 'credit_card',
    DEBIT_CARD: 'debit_card',
    BANK_TRANSFER: 'bank_transfer',
    UPI: 'upi',
    WALLET: 'wallet'
  },

  // Lead Statuses
  LEAD_STATUS: {
    NEW: 'new',
    CONTACTED: 'contacted',
    QUALIFIED: 'qualified',
    PROPOSAL_SENT: 'proposal_sent',
    NEGOTIATION: 'negotiation',
    CONVERTED: 'converted',
    LOST: 'lost'
  },

  // Lead Sources
  LEAD_SOURCES: {
    WEBSITE: 'website',
    REFERRAL: 'referral',
    SOCIAL_MEDIA: 'social_media',
    WALK_IN: 'walk_in',
    PHONE: 'phone',
    EMAIL: 'email',
    PARTNER: 'partner'
  },

  // Trip Types
  TRIP_TYPES: {
    DOMESTIC: 'domestic',
    INTERNATIONAL: 'international',
    HONEYMOON: 'honeymoon',
    FAMILY: 'family',
    ADVENTURE: 'adventure',
    BUSINESS: 'business',
    GROUP: 'group',
    SOLO: 'solo',
    PILGRIMAGE: 'pilgrimage'
  },

  // Commission Statuses
  COMMISSION_STATUS: {
    PENDING: 'pending',
    APPROVED: 'approved',
    PAID: 'paid',
    REJECTED: 'rejected'
  },

  // Commission rate tiers
  COMMISSION_TIERS: {
    JUNIOR: { min: 0, max: 50000, rate: 8 },
    STANDARD: { min: 50001, max: 200000, rate: 10 },
    SENIOR: { min: 200001, max: 500000, rate: 12 },
    PREMIUM: { min: 500001, max: Infinity, rate: 15 }
  },

  // Audit Log Actions
  AUDIT_ACTIONS: {
    // Booking
    BOOKING_CREATED: 'BOOKING_CREATED',
    BOOKING_UPDATED: 'BOOKING_UPDATED',
    BOOKING_STATUS_CHANGED: 'BOOKING_STATUS_CHANGED',
    BOOKING_DELETED: 'BOOKING_DELETED',
    BOOKING_CANCELLED: 'BOOKING_CANCELLED',
    // Payment
    PAYMENT_PROCESSED: 'PAYMENT_PROCESSED',
    PAYMENT_REFUNDED: 'PAYMENT_REFUNDED',
    PAYMENT_FAILED: 'PAYMENT_FAILED',
    // Lead
    LEAD_CREATED: 'LEAD_CREATED',
    LEAD_UPDATED: 'LEAD_UPDATED',
    LEAD_STATUS_CHANGED: 'LEAD_STATUS_CHANGED',
    LEAD_ASSIGNED: 'LEAD_ASSIGNED',
    LEAD_CONVERTED: 'LEAD_CONVERTED',
    LEAD_DELETED: 'LEAD_DELETED',
    // Agent
    AGENT_REGISTERED: 'AGENT_REGISTERED',
    AGENT_APPROVED: 'AGENT_APPROVED',
    AGENT_REJECTED: 'AGENT_REJECTED',
    AGENT_DEACTIVATED: 'AGENT_DEACTIVATED',
    AGENT_ACTIVATED: 'AGENT_ACTIVATED',
    AGENT_ROLE_CHANGED: 'AGENT_ROLE_CHANGED',
    AGENT_PROFILE_UPDATED: 'AGENT_PROFILE_UPDATED',
    AGENT_ASSIGNED_TO_TEAM: 'AGENT_ASSIGNED_TO_TEAM',
    AGENT_REMOVED_FROM_TEAM: 'AGENT_REMOVED_FROM_TEAM',
    // Customer
    CUSTOMER_CREATED: 'CUSTOMER_CREATED',
    CUSTOMER_UPDATED: 'CUSTOMER_UPDATED',
    CUSTOMER_DELETED: 'CUSTOMER_DELETED',
    // Commission
    COMMISSION_CREATED: 'COMMISSION_CREATED',
    COMMISSION_APPROVED: 'COMMISSION_APPROVED',
    COMMISSION_PAID: 'COMMISSION_PAID',
    // Itinerary
    ITINERARY_CREATED: 'ITINERARY_CREATED',
    ITINERARY_UPDATED: 'ITINERARY_UPDATED',
    ITINERARY_DELETED: 'ITINERARY_DELETED',
    ITINERARY_CLONED: 'ITINERARY_CLONED',
    // Auth
    AUTH_LOGIN: 'AUTH_LOGIN',
    AUTH_LOGOUT: 'AUTH_LOGOUT',
    AUTH_PASSWORD_CHANGED: 'AUTH_PASSWORD_CHANGED',
    AUTH_REGISTER: 'AUTH_REGISTER'
  },

  // Notification Types
  NOTIFICATION_TYPES: {
    LEAD_ASSIGNED: 'LEAD_ASSIGNED',
    LEAD_STATUS_CHANGED: 'LEAD_STATUS_CHANGED',
    BOOKING_CONFIRMED: 'BOOKING_CONFIRMED',
    BOOKING_CANCELLED: 'BOOKING_CANCELLED',
    BOOKING_CREATED: 'BOOKING_CREATED',
    PAYMENT_RECEIVED: 'PAYMENT_RECEIVED',
    PAYMENT_REFUNDED: 'PAYMENT_REFUNDED',
    AGENT_APPROVED: 'AGENT_APPROVED',
    AGENT_REJECTED: 'AGENT_REJECTED',
    ROLE_CHANGED: 'ROLE_CHANGED',
    COMMISSION_APPROVED: 'COMMISSION_APPROVED',
    COMMISSION_PAID: 'COMMISSION_PAID',
    BOOKING_REMINDER: 'BOOKING_REMINDER',
    SYSTEM: 'SYSTEM'
  }
};