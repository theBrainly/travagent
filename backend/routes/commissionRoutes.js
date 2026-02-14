// routes/commissionRoutes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { checkPermission } = require('../middleware/roleCheck');
const { cacheMiddleware } = require('../middleware/cache');
const { TTL } = require('../services/cacheService');
const ctrl = require('../controllers/commissionController');

router.use(protect);
router.get('/summary', cacheMiddleware('commissions:summary', TTL.SHORT), ctrl.getCommissionSummary);
router.route('/').get(cacheMiddleware('commissions:list', TTL.MEDIUM), ctrl.getCommissions);
router.get('/agent/:id', ctrl.getCommissionsByAgent);
router.route('/:id').get(ctrl.getCommission);
router.patch('/:id/approve', checkPermission('canApproveCommissions'), ctrl.approveCommission);
router.patch('/:id/pay', checkPermission('canApproveCommissions'), ctrl.markCommissionPaid);

module.exports = router;