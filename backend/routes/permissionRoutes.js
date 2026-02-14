// routes/permissionRoutes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { requireRole, checkPermission } = require('../middleware/roleCheck');
const permissionController = require('../controllers/permissionController');

// All permission routes require authentication
router.use(protect);

// GET all permissions — admin+ can view
router.get('/', requireRole('super_admin', 'admin'), permissionController.getAllPermissions);

// GET permissions for a specific role — admin+ can view
router.get('/:role', requireRole('super_admin', 'admin'), permissionController.getRolePermissions);

// UPDATE permissions for a role — super_admin only
router.put('/:role', requireRole('super_admin'), permissionController.updateRolePermissions);

// RESET permissions to defaults — super_admin only
router.post('/reset', requireRole('super_admin'), permissionController.resetPermissions);

module.exports = router;
