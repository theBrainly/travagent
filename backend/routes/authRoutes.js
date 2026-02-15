// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { protect, protectPending } = require('../middleware/auth');
const { authorize, checkPermission } = require('../middleware/roleCheck');
const ctrl = require('../controllers/authController');

router.post('/register', [
  body('firstName').trim().notEmpty().withMessage('First name required'),
  body('lastName').trim().notEmpty().withMessage('Last name required'),
  body('email').isEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 8 }).withMessage('Min 8 characters'),
  body('phone').notEmpty().withMessage('Phone required'),
  validate
], ctrl.register);

router.post('/login', [
  body('email').isEmail(), body('password').notEmpty(), validate
], ctrl.login);

router.post('/admin/create-agent',
  protect, authorize('super_admin', 'admin', 'senior_agent'), checkPermission('canManageTeam'),
  [
    body('firstName').trim().notEmpty(), body('lastName').trim().notEmpty(),
    body('email').isEmail(), body('password').isLength({ min: 8 }),
    body('phone').notEmpty(),
    body('role').notEmpty().isIn(['admin', 'senior_agent', 'agent', 'junior_agent'])
      .withMessage('Invalid role. Note: only super_admin can create admin accounts'),
    validate
  ], ctrl.adminCreateAgent
);

router.get('/me', protect, ctrl.getMe);
router.get('/approval-status', protectPending, ctrl.checkApprovalStatus);
router.post('/refresh-token', ctrl.refreshToken);
router.put('/change-password', protect, ctrl.changePassword);
router.post('/logout', protect, ctrl.logout);

module.exports = router;
