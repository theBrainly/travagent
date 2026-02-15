// routes/agentRoutes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { authorize, checkPermission, validateRoleChange, authorizeOwnerOrHigher } = require('../middleware/roleCheck');
const ctrl = require('../controllers/agentController');

router.use(protect);
router.get('/dashboard/stats', ctrl.getDashboardStats);
router.get('/', authorize('super_admin', 'admin'), checkPermission('canViewAllAgents'), ctrl.getAllAgents);
router.get('/pending', authorize('super_admin', 'admin'), checkPermission('canApproveAgents'), ctrl.getPendingAgents);
router.patch('/:id/approve', authorize('super_admin', 'admin'), checkPermission('canApproveAgents'), ctrl.approveAgent);
router.patch('/:id/reject', authorize('super_admin', 'admin'), checkPermission('canApproveAgents'), ctrl.rejectAgent);
router.patch('/:id/role', authorize('super_admin', 'admin', 'senior_agent'), checkPermission('canManageTeam'), validateRoleChange(), ctrl.updateAgentRole);
router.patch('/:id/deactivate', authorize('super_admin', 'admin'), ctrl.deactivateAgent);
router.patch('/:id/activate', authorize('super_admin', 'admin'), ctrl.activateAgent);
router.route('/:id').get(authorizeOwnerOrHigher(), ctrl.getAgent).put(authorizeOwnerOrHigher(), ctrl.updateAgent);

// Team management (senior_agent+)
router.get('/team/members', checkPermission('canManageTeam'), ctrl.getTeamMembers);
router.patch('/:id/team/assign', checkPermission('canManageTeam'), ctrl.assignToTeam);
router.patch('/:id/team/remove', checkPermission('canManageTeam'), ctrl.removeFromTeam);

module.exports = router;
