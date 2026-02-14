// routes/customerRoutes.js
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const { requireMinLevel } = require('../middleware/roleCheck');
const { cacheMiddleware } = require('../middleware/cache');
const { TTL } = require('../services/cacheService');
const ctrl = require('../controllers/customerController');

router.use(protect);
router.get('/stats/overview', cacheMiddleware('customers:stats', TTL.SHORT), ctrl.getCustomerStats);
router.route('/')
  .get(cacheMiddleware('customers:list', TTL.LONG), ctrl.getCustomers)
  .post(requireMinLevel(2), [body('firstName').trim().notEmpty(), body('lastName').trim().notEmpty(), body('email').isEmail(), body('phone').notEmpty(), validate], ctrl.createCustomer);
router.route('/:id').get(ctrl.getCustomer).put(requireMinLevel(2), ctrl.updateCustomer).delete(requireMinLevel(2), ctrl.deleteCustomer);

module.exports = router;