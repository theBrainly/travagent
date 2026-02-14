// routes/paymentRoutes.js
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const { authorize, checkPermission, requireMinLevel } = require('../middleware/roleCheck');
const ctrl = require('../controllers/paymentController');

router.use(protect);
router.get('/stats', ctrl.getPaymentStats);
router.route('/')
  .get(ctrl.getPayments)
  .post(requireMinLevel(2), [body('booking').notEmpty(), body('amount').isFloat({ min: 1 }), body('paymentMethod').notEmpty(), validate], ctrl.processPayment);
router.get('/:id', ctrl.getPayment);
router.post('/:id/refund', checkPermission('canProcessRefunds'), ctrl.processRefund);

module.exports = router;