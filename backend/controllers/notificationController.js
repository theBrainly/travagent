// controllers/notificationController.js
const NotificationService = require('../services/notificationService');
const ApiResponse = require('../utils/apiResponse');

// @desc    Get my notifications (paginated)
// @route   GET /api/notifications
// @access  Private
exports.getNotifications = async (req, res, next) => {
    try {
        const { notifications, pagination } = await NotificationService.getNotifications(
            req.agent._id, req.query
        );
        ApiResponse.paginated(res, notifications, pagination);
    } catch (error) { next(error); }
};

// @desc    Get unread notification count
// @route   GET /api/notifications/unread-count
// @access  Private
exports.getUnreadCount = async (req, res, next) => {
    try {
        const count = await NotificationService.getUnreadCount(req.agent._id);
        ApiResponse.success(res, { unreadCount: count });
    } catch (error) { next(error); }
};

// @desc    Mark a notification as read
// @route   PATCH /api/notifications/:id/read
// @access  Private
exports.markAsRead = async (req, res, next) => {
    try {
        const notification = await NotificationService.markAsRead(req.params.id, req.agent._id);
        if (!notification) return ApiResponse.error(res, 'Notification not found', 404);
        ApiResponse.success(res, { notification }, 'Marked as read');
    } catch (error) { next(error); }
};

// @desc    Mark all notifications as read
// @route   PATCH /api/notifications/read-all
// @access  Private
exports.markAllAsRead = async (req, res, next) => {
    try {
        const result = await NotificationService.markAllAsRead(req.agent._id);
        ApiResponse.success(res, { modifiedCount: result.modifiedCount }, 'All marked as read');
    } catch (error) { next(error); }
};

// @desc    Delete a notification
// @route   DELETE /api/notifications/:id
// @access  Private
exports.deleteNotification = async (req, res, next) => {
    try {
        const result = await NotificationService.deleteNotification(req.params.id, req.agent._id);
        if (!result) return ApiResponse.error(res, 'Notification not found', 404);
        ApiResponse.success(res, null, 'Deleted');
    } catch (error) { next(error); }
};
