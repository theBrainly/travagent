// models/Commission.js
const mongoose = require('mongoose');
const { generateRefNumber } = require('../utils/helpers');

const commissionSchema = new mongoose.Schema({
  commissionReference: { type: String, unique: true, index: true },
  agent: { type: mongoose.Schema.Types.ObjectId, ref: 'Agent', required: true, index: true },
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
  bookingAmount: { type: Number, required: true },
  commissionRate: { type: Number, required: true, min: 0, max: 50 },
  commissionAmount: { type: Number, required: true },
  tier: { type: String, enum: ['junior', 'standard', 'senior', 'premium'], default: 'standard' },
  bonusAmount: { type: Number, default: 0 },
  totalEarning: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'approved', 'paid', 'rejected', 'on_hold'], default: 'pending' },
  paymentDetails: {
    paidAt: Date, paymentMethod: String, transactionReference: String,
    paidBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Agent' }
  },
  rejectionReason: String,
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Agent' },
  approvedAt: Date,
  month: { type: Number, required: true },
  year: { type: Number, required: true },
  notes: String
}, { timestamps: true });

commissionSchema.pre('save', function (next) {
  if (!this.commissionReference) this.commissionReference = generateRefNumber('COM');
  this.totalEarning = this.commissionAmount + this.bonusAmount;
  if (!this.month || !this.year) { const now = new Date(); this.month = now.getMonth() + 1; this.year = now.getFullYear(); }
  next();
});

module.exports = mongoose.model('Commission', commissionSchema);