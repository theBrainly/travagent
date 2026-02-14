// services/authService.js
const Agent = require('../models/Agent');
const keys = require('../config/keys');
const jwt = require('jsonwebtoken');
const { SELF_ASSIGNABLE_ROLES, canAssignRole, hasPermission } = require('../config/role');
const AuditService = require('./auditService');

class AuthService {
  static async registerAgent(agentData) {
    // SECURITY: Force safe role regardless of what user sends
    if (agentData.role && !SELF_ASSIGNABLE_ROLES.includes(agentData.role)) {
      console.warn(`⚠️ SECURITY: ${agentData.email} tried to self-assign role: ${agentData.role}`);
      agentData.role = 'agent';
    } else if (!agentData.role) {
      agentData.role = 'agent';
    }

    // New accounts need admin approval
    agentData.isActive = false;
    agentData.isVerified = false;

    const existingAgent = await Agent.findOne({ email: agentData.email });
    if (existingAgent) throw { statusCode: 400, message: 'Agent with this email already exists' };

    const agent = await Agent.create(agentData);
    const token = agent.generateAuthToken();
    const refreshToken = agent.generateRefreshToken();

    agent.refreshToken = refreshToken;
    await agent.save({ validateBeforeSave: false });

    agent.password = undefined;
    agent.refreshToken = undefined;

    return { agent, token, refreshToken, message: 'Registration successful. Pending admin approval.' };
  }

  static async adminCreateAgent(agentData, creatorAgent) {
    const requestedRole = agentData.role || 'agent';

    if (!canAssignRole(creatorAgent.role, requestedRole)) {
      throw { statusCode: 403, message: `Role '${creatorAgent.role}' cannot create '${requestedRole}' agents` };
    }

    const existingAgent = await Agent.findOne({ email: agentData.email });
    if (existingAgent) throw { statusCode: 400, message: 'Agent with this email already exists' };

    agentData.isActive = true;
    agentData.isVerified = true;
    agentData.role = requestedRole;

    const agent = await Agent.create(agentData);

    await AuditService.log({
      action: 'ADMIN_CREATE_AGENT',
      performedBy: creatorAgent._id,
      performedByRole: creatorAgent.role,
      targetModel: 'Agent',
      targetId: agent._id,
      description: `Admin created agent ${agent.email} with role ${requestedRole}`
    });

    agent.password = undefined;
    return { agent };
  }

  static async loginAgent(email, password) {
    const agent = await Agent.findOne({ email }).select('+password');
    if (!agent) throw { statusCode: 401, message: 'Invalid email or password' };

    const isMatch = await agent.comparePassword(password);
    if (!isMatch) throw { statusCode: 401, message: 'Invalid email or password' };

    const token = agent.generateAuthToken();
    const refreshToken = agent.generateRefreshToken();

    agent.lastLogin = new Date();
    agent.refreshToken = refreshToken;
    await agent.save({ validateBeforeSave: false });

    agent.password = undefined;
    agent.refreshToken = undefined;

    // Include approval status so frontend can route accordingly
    const approvalStatus = agent.isActive ? 'approved' : (agent.isVerified === false ? 'pending' : 'rejected');
    return { agent, token, refreshToken, approvalStatus };
  }

  static async refreshToken(refreshToken) {
    if (!refreshToken) throw { statusCode: 401, message: 'Refresh token required' };
    const decoded = jwt.verify(refreshToken, keys.jwtRefreshSecret);
    const agent = await Agent.findById(decoded.id).select('+refreshToken');
    if (!agent || agent.refreshToken !== refreshToken) throw { statusCode: 401, message: 'Invalid refresh token' };

    const newToken = agent.generateAuthToken();
    const newRefreshToken = agent.generateRefreshToken();
    agent.refreshToken = newRefreshToken;
    await agent.save({ validateBeforeSave: false });
    return { token: newToken, refreshToken: newRefreshToken };
  }

  static async changePassword(agentId, currentPassword, newPassword) {
    const agent = await Agent.findById(agentId).select('+password');
    if (!agent) throw { statusCode: 404, message: 'Agent not found' };
    const isMatch = await agent.comparePassword(currentPassword);
    if (!isMatch) throw { statusCode: 400, message: 'Current password is incorrect' };
    agent.password = newPassword;
    await agent.save();
    return { message: 'Password changed successfully' };
  }

  static async logoutAgent(agentId) {
    await Agent.findByIdAndUpdate(agentId, { refreshToken: null });
    return { message: 'Logged out successfully' };
  }

  static async checkApprovalStatus(agentId) {
    const agent = await Agent.findById(agentId).select('isActive isVerified firstName lastName email role');
    if (!agent) throw { statusCode: 404, message: 'Agent not found' };
    const approvalStatus = agent.isActive ? 'approved' : (agent.isVerified === false ? 'pending' : 'rejected');
    return { approvalStatus, agent };
  }
}

module.exports = AuthService;