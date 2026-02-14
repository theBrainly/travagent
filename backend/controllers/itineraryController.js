// controllers/itineraryController.js
const Itinerary = require('../models/Itinerary');
const ApiResponse = require('../utils/apiResponse');
const { hasPermission } = require('../config/role');
const { buildPagination } = require('../utils/helpers');
const AuditService = require('../services/auditService');
const { CacheService } = require('../services/cacheService');

exports.createItinerary = async (req, res, next) => {
  try {
    req.body.agent = req.agent._id;
    const itinerary = await Itinerary.create(req.body);

    AuditService.logCreate(req, 'Itinerary', itinerary._id, `Created itinerary: ${itinerary.title}`);
    CacheService.invalidate('itinerary');

    ApiResponse.created(res, { itinerary });
  } catch (error) { next(error); }
};

exports.getItineraries = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1; const limit = parseInt(req.query.limit) || 10;
    let filter = {};
    if (!hasPermission(req.agent.role, 'canViewAllBookings')) filter.agent = req.agent._id;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.tripType) filter.tripType = req.query.tripType;
    if (req.query.isTemplate !== undefined) filter.isTemplate = req.query.isTemplate === 'true';
    if (req.query.search) {
      filter.$or = [{ title: { $regex: req.query.search, $options: 'i' } }, { 'destinations.city': { $regex: req.query.search, $options: 'i' } }];
    }
    const total = await Itinerary.countDocuments(filter);
    const { pagination, startIndex } = buildPagination(page, limit, total);
    const itineraries = await Itinerary.find(filter).populate('agent', 'firstName lastName').populate('customer', 'firstName lastName email').sort('-createdAt').skip(startIndex).limit(limit);
    ApiResponse.paginated(res, itineraries, pagination);
  } catch (error) { next(error); }
};

exports.getItinerary = async (req, res, next) => {
  try {
    const itinerary = await Itinerary.findById(req.params.id).populate('agent', 'firstName lastName email agencyName').populate('customer', 'firstName lastName email phone');
    if (!itinerary) return ApiResponse.error(res, 'Not found', 404);
    if (!hasPermission(req.agent.role, 'canViewAllBookings') && itinerary.agent._id.toString() !== req.agent._id.toString())
      return ApiResponse.error(res, 'Not authorized', 403);
    ApiResponse.success(res, { itinerary });
  } catch (error) { next(error); }
};

exports.updateItinerary = async (req, res, next) => {
  try {
    let itinerary = await Itinerary.findById(req.params.id);
    if (!itinerary) return ApiResponse.error(res, 'Not found', 404);
    if (!hasPermission(req.agent.role, 'canViewAllBookings') && itinerary.agent.toString() !== req.agent._id.toString())
      return ApiResponse.error(res, 'Not authorized', 403);
    delete req.body.agent;
    req.body.version = itinerary.version + 1;
    itinerary = await Itinerary.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });

    AuditService.logUpdate(req, 'Itinerary', itinerary._id, null, req.body, `Updated itinerary: ${itinerary.title}`);
    CacheService.invalidate('itinerary');

    ApiResponse.success(res, { itinerary }, 'Updated');
  } catch (error) { next(error); }
};

exports.deleteItinerary = async (req, res, next) => {
  try {
    const itinerary = await Itinerary.findById(req.params.id);
    if (!itinerary) return ApiResponse.error(res, 'Not found', 404);
    if (!hasPermission(req.agent.role, 'canViewAllBookings') && itinerary.agent.toString() !== req.agent._id.toString())
      return ApiResponse.error(res, 'Not authorized', 403);
    await Itinerary.findByIdAndDelete(req.params.id);

    AuditService.logDelete(req, 'Itinerary', req.params.id, `Deleted itinerary: ${itinerary.title}`);
    CacheService.invalidate('itinerary');

    ApiResponse.success(res, null, 'Deleted');
  } catch (error) { next(error); }
};

exports.cloneItinerary = async (req, res, next) => {
  try {
    const original = await Itinerary.findById(req.params.id);
    if (!original) return ApiResponse.error(res, 'Not found', 404);
    const cloneData = original.toObject();
    delete cloneData._id; delete cloneData.createdAt; delete cloneData.updatedAt;
    cloneData.agent = req.agent._id; cloneData.title = `${cloneData.title} (Copy)`;
    cloneData.status = 'draft'; cloneData.version = 1;
    cloneData.customer = req.body.customer || null;
    const cloned = await Itinerary.create(cloneData);

    AuditService.log({
      action: 'ITINERARY_CLONED',
      performedBy: req.agent._id,
      performedByRole: req.agent.role,
      targetModel: 'Itinerary',
      targetId: cloned._id,
      changes: { before: { originalId: original._id } },
      metadata: AuditService.getMetadata(req),
      description: `Cloned itinerary "${original.title}" → "${cloned.title}"`
    });
    CacheService.invalidate('itinerary');

    ApiResponse.created(res, { itinerary: cloned }, 'Cloned');
  } catch (error) { next(error); }
};

exports.getTemplates = async (req, res, next) => {
  try {
    const templates = await Itinerary.find({ isTemplate: true }).populate('agent', 'firstName lastName').sort('-createdAt');
    ApiResponse.success(res, { templates });
  } catch (error) { next(error); }
};

exports.addDayPlan = async (req, res, next) => {
  try {
    const itinerary = await Itinerary.findById(req.params.id);
    if (!itinerary) return ApiResponse.error(res, 'Not found', 404);
    if (!hasPermission(req.agent.role, 'canViewAllBookings') && itinerary.agent.toString() !== req.agent._id.toString())
      return ApiResponse.error(res, 'Not authorized', 403);
    req.body.dayNumber = itinerary.dayPlans.length + 1;
    itinerary.dayPlans.push(req.body);
    await itinerary.save();

    AuditService.logUpdate(req, 'Itinerary', itinerary._id, null, { dayPlanAdded: req.body }, `Day plan ${req.body.dayNumber} added to "${itinerary.title}"`);

    ApiResponse.success(res, { itinerary }, 'Day plan added');
  } catch (error) { next(error); }
};

exports.updateDayPlan = async (req, res, next) => {
  try {
    const itinerary = await Itinerary.findById(req.params.id);
    if (!itinerary) return ApiResponse.error(res, 'Not found', 404);
    const dayPlan = itinerary.dayPlans.id(req.params.dayPlanId);
    if (!dayPlan) return ApiResponse.error(res, 'Day plan not found', 404);
    Object.assign(dayPlan, req.body);
    await itinerary.save();
    ApiResponse.success(res, { itinerary }, 'Day plan updated');
  } catch (error) { next(error); }
};

exports.deleteDayPlan = async (req, res, next) => {
  try {
    const itinerary = await Itinerary.findById(req.params.id);
    if (!itinerary) return ApiResponse.error(res, 'Not found', 404);
    itinerary.dayPlans.pull(req.params.dayPlanId);
    itinerary.dayPlans.forEach((dp, i) => { dp.dayNumber = i + 1; });
    await itinerary.save();
    ApiResponse.success(res, { itinerary }, 'Day plan removed');
  } catch (error) { next(error); }
};