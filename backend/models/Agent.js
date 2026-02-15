// models/Agent.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const keys = require('../config/keys');

const agentSchema = new mongoose.Schema({
  firstName: { type: String, required: [true, 'First name required'], trim: true, maxlength: 50 },
  lastName: { type: String, required: [true, 'Last name required'], trim: true, maxlength: 50 },
  email: {
    type: String, required: [true, 'Email required'], unique: true, lowercase: true, trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Invalid email']
  },
  password: { type: String, required: [true, 'Password required'], minlength: 8, select: false },
  phone: { type: String, required: [true, 'Phone required'] },
  role: {
    type: String,
    enum: ['super_admin', 'admin', 'senior_agent', 'agent', 'junior_agent'],
    default: 'agent'
  },
  agencyName: { type: String, trim: true, maxlength: 100 },
  agencyLicense: { type: String, trim: true },
  address: {
    street: String, city: String, state: String,
    country: { type: String, default: 'India' }, zipCode: String
  },
  commissionRate: { type: Number, default: 10, min: 0, max: 50 },
  totalEarnings: { type: Number, default: 0 },
  totalBookings: { type: Number, default: 0 },
  isActive: { type: Boolean, default: false },
  isVerified: { type: Boolean, default: false },
  lastLogin: Date,
  refreshToken: { type: String, select: false },
  profileImage: { type: String, default: 'default-avatar.png' },
  teamLead: { type: mongoose.Schema.Types.ObjectId, ref: 'Agent', default: null }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

agentSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

agentSchema.virtual('customers', {
  ref: 'Customer', localField: '_id', foreignField: 'agent', justOne: false
});

agentSchema.virtual('teamMembers', {
  ref: 'Agent', localField: '_id', foreignField: 'teamLead', justOne: false
});

agentSchema.index({ role: 1, isActive: 1 });
agentSchema.index({ teamLead: 1 });

agentSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

agentSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

agentSchema.methods.generateAuthToken = function () {
  return jwt.sign({ id: this._id, email: this.email, role: this.role }, keys.jwtSecret, { expiresIn: keys.jwtExpire });
};

agentSchema.methods.generateRefreshToken = function () {
  return jwt.sign({ id: this._id }, keys.jwtRefreshSecret, { expiresIn: keys.jwtRefreshExpire });
};

module.exports = mongoose.model('Agent', agentSchema);
