// routes/leadRoutes.js
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const { authorize, checkPermission, requireMinLevel } = require('../middleware/roleCheck');
const { cacheMiddleware } = require('../middleware/cache');
const { TTL } = require('../services/cacheService');
const ctrl = require('../controllers/leadController');

router.use(protect);
router.get('/stats', cacheMiddleware('leads:stats', TTL.SHORT), ctrl.getLeadStats);
router.route('/')
  .get(cacheMiddleware('leads:list', TTL.MEDIUM), ctrl.getLeads)
  .post(requireMinLevel(2), [
    body('contactInfo.firstName').notEmpty(), body('contactInfo.lastName').notEmpty(),
    body('contactInfo.email').isEmail(), body('contactInfo.phone').notEmpty(),
    body('source').notEmpty(), validate
  ], ctrl.createLead);
router.route('/:id').get(ctrl.getLead).put(requireMinLevel(2), ctrl.updateLead).delete(requireMinLevel(2), ctrl.deleteLead);
router.post('/:id/follow-ups', requireMinLevel(2), [body('type').notEmpty(), body('notes').notEmpty(), validate], ctrl.addFollowUp);
router.post('/:id/convert', requireMinLevel(2), ctrl.convertLead);
router.patch('/:id/assign', checkPermission('canAssignLeads'), ctrl.assignLead);

module.exports = router;