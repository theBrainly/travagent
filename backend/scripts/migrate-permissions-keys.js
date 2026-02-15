// scripts/migrate-permissions-keys.js
// One-time migration to normalize legacy permission keys to canonical keys.
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Permission = require('../models/Permission');
const { ROLE_PERMISSIONS } = require('../config/role');

const LEGACY_KEY_MAP = {
  canManageAllAgents: 'canViewAllAgents',
  canChangeRoles: 'canChangeAnyRole',
  canDeleteBookings: 'canDeleteAnyBooking',
  canUpdateBookingStatus: 'canUpdateAnyBooking',
  canDeleteCustomers: 'canDeleteAnyCustomer',
  canViewFinancials: 'canViewFinancialReports',
  canReassignLeads: 'canAssignLeads',
  canProcessAllRefunds: 'canProcessRefunds',
  canViewAllCommissions: 'canApproveCommissions',
  canMarkCommissionsPaid: 'canApproveCommissions',
  canDeleteLeads: 'canViewAllLeads',
  canViewAllItineraries: 'canViewAllBookings',
  canDeleteItineraries: 'canDeleteAnyBooking',
  canExportData: 'canManageSettings'
};

async function migratePermissionDoc(doc) {
  const permissions = doc.permissions || {};
  const roleDefaults = ROLE_PERMISSIONS[doc.role] || {};

  const setOps = {};
  const unsetOps = {};

  // 1) Move/merge legacy keys into canonical keys.
  for (const [legacyKey, canonicalKey] of Object.entries(LEGACY_KEY_MAP)) {
    if (Object.prototype.hasOwnProperty.call(permissions, legacyKey)) {
      if (!Object.prototype.hasOwnProperty.call(permissions, canonicalKey)) {
        setOps[`permissions.${canonicalKey}`] = permissions[legacyKey] === true;
      }
      unsetOps[`permissions.${legacyKey}`] = '';
    }
  }

  // 2) Ensure every canonical key exists and is normalized as boolean.
  for (const [key, defaultValue] of Object.entries(roleDefaults)) {
    if (!Object.prototype.hasOwnProperty.call(permissions, key) && !Object.prototype.hasOwnProperty.call(setOps, `permissions.${key}`)) {
      setOps[`permissions.${key}`] = defaultValue === true;
    } else if (Object.prototype.hasOwnProperty.call(permissions, key)) {
      setOps[`permissions.${key}`] = permissions[key] === true;
    }
  }

  if (Object.keys(setOps).length === 0 && Object.keys(unsetOps).length === 0) {
    return false;
  }

  const update = {};
  if (Object.keys(setOps).length > 0) update.$set = setOps;
  if (Object.keys(unsetOps).length > 0) update.$unset = unsetOps;
  update.$inc = { version: 1 };

  await Permission.collection.updateOne({ _id: doc._id }, update);
  return true;
}

async function run() {
  try {
    await connectDB();

    const docs = await Permission.collection.find({}).toArray();
    if (!docs.length) {
      console.log('No permission documents found. Nothing to migrate.');
      return;
    }

    let changed = 0;
    for (const doc of docs) {
      const updated = await migratePermissionDoc(doc);
      if (updated) changed++;
    }

    console.log(`Migration complete. Updated ${changed}/${docs.length} permission documents.`);
  } catch (err) {
    console.error('Permission migration failed:', err);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
}

run();
