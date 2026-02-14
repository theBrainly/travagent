// routes/itineraryRoutes.js
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const { requireMinLevel } = require('../middleware/roleCheck');
const ctrl = require('../controllers/itineraryController');

router.use(protect);
router.get('/templates', ctrl.getTemplates);
router.route('/')
  .get(ctrl.getItineraries)
  .post(requireMinLevel(2), [body('title').notEmpty(), body('tripType').notEmpty(), body('startDate').isISO8601(), body('endDate').isISO8601(), validate], ctrl.createItinerary);
router.route('/:id').get(ctrl.getItinerary).put(requireMinLevel(2), ctrl.updateItinerary).delete(requireMinLevel(2), ctrl.deleteItinerary);
router.post('/:id/clone', requireMinLevel(2), ctrl.cloneItinerary);
router.post('/:id/day-plans', requireMinLevel(2), ctrl.addDayPlan);
router.put('/:id/day-plans/:dayPlanId', requireMinLevel(2), ctrl.updateDayPlan);
router.delete('/:id/day-plans/:dayPlanId', requireMinLevel(2), ctrl.deleteDayPlan);

module.exports = router;