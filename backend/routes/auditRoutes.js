// routes/auditRoutes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { checkPermission } = require('../middleware/roleCheck');
const ctrl = require('../controllers/auditController');

router.use(protect);
router.use(checkPermission('canViewAuditLogs'));

router.get('/', ctrl.getAuditLogs);
router.get('/stats', ctrl.getAuditStats);
router.get('/:id', ctrl.getAuditLog);

module.exports = router;
