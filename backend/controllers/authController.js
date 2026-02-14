// controllers/authController.js
const AuthService = require('../services/authService');
const ApiResponse = require('../utils/apiResponse');
const AuditService = require('../services/auditService');

exports.register = async (req, res, next) => {
  try {
    const result = await AuthService.registerAgent(req.body);

    // Audit log (no req.agent yet for registration, use the newly created agent)
    AuditService.log({
      action: 'AUTH_REGISTER',
      performedBy: result.agent._id,
      performedByRole: result.agent.role,
      targetModel: 'Auth',
      targetId: result.agent._id,
      metadata: { ip: req.ip || 'unknown', userAgent: req.headers?.['user-agent'] || 'unknown' },
      description: `New agent registered: ${result.agent.email}`
    });

    ApiResponse.created(res, { agent: result.agent, token: result.token, refreshToken: result.refreshToken, approvalRequired: true }, result.message);
  } catch (error) {
    if (error.statusCode) return ApiResponse.error(res, error.message, error.statusCode);
    next(error);
  }
};

exports.adminCreateAgent = async (req, res, next) => {
  try {
    const result = await AuthService.adminCreateAgent(req.body, req.agent);

    AuditService.logCreate(req, 'Agent', result.agent._id, `Admin created agent: ${result.agent.email} with role ${result.agent.role}`);

    ApiResponse.created(res, { agent: result.agent }, 'Agent created by admin');
  } catch (error) {
    if (error.statusCode) return ApiResponse.error(res, error.message, error.statusCode);
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return ApiResponse.error(res, 'Email and password required', 400);
    const result = await AuthService.loginAgent(email, password);

    // Audit log login
    AuditService.log({
      action: 'AUTH_LOGIN',
      performedBy: result.agent._id,
      performedByRole: result.agent.role,
      targetModel: 'Auth',
      targetId: result.agent._id,
      metadata: { ip: req.ip || 'unknown', userAgent: req.headers?.['user-agent'] || 'unknown' },
      description: `Agent ${result.agent.email} logged in`
    });

    ApiResponse.success(res, { agent: result.agent, token: result.token, refreshToken: result.refreshToken, approvalStatus: result.approvalStatus }, 'Login successful');
  } catch (error) {
    if (error.statusCode) return ApiResponse.error(res, error.message, error.statusCode);
    next(error);
  }
};

exports.getMe = async (req, res) => {
  ApiResponse.success(res, { agent: req.agent }, 'Profile retrieved');
};

exports.checkApprovalStatus = async (req, res, next) => {
  try {
    const result = await AuthService.checkApprovalStatus(req.agent._id);
    ApiResponse.success(res, result, 'Approval status retrieved');
  } catch (error) {
    if (error.statusCode) return ApiResponse.error(res, error.message, error.statusCode);
    next(error);
  }
};

exports.refreshToken = async (req, res, next) => {
  try {
    const result = await AuthService.refreshToken(req.body.refreshToken);
    ApiResponse.success(res, result, 'Token refreshed');
  } catch (error) {
    if (error.statusCode) return ApiResponse.error(res, error.message, error.statusCode);
    next(error);
  }
};

exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return ApiResponse.error(res, 'Both passwords required', 400);
    const result = await AuthService.changePassword(req.agent._id, currentPassword, newPassword);

    // Audit log (critical)
    AuditService.logCritical(req, 'AUTH_PASSWORD_CHANGED', 'Auth', req.agent._id,
      `Agent ${req.agent.email} changed their password`);

    ApiResponse.success(res, null, result.message);
  } catch (error) {
    if (error.statusCode) return ApiResponse.error(res, error.message, error.statusCode);
    next(error);
  }
};

exports.logout = async (req, res, next) => {
  try {
    await AuthService.logoutAgent(req.agent._id);

    // Audit log
    AuditService.log({
      action: 'AUTH_LOGOUT',
      performedBy: req.agent._id,
      performedByRole: req.agent.role,
      targetModel: 'Auth',
      targetId: req.agent._id,
      metadata: AuditService.getMetadata(req),
      description: `Agent ${req.agent.email} logged out`
    });

    ApiResponse.success(res, null, 'Logged out');
  } catch (error) { next(error); }
};