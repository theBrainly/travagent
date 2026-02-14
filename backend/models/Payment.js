// models/Payment.js
const mongoose = require('mongoose');
const { generateRefNumber } = require('../utils/helpers');

const paymentSchema = new mongoose.Schema({
  transactionId: { type: String, unique: true, index: true },
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
  agent: { type: mongoose.Schema.Types.ObjectId, ref: 'Agent', required: true, index: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  amount: { type: Number, required: true, min: [1, 'Amount must be at least 1'] },
  currency: { type: String, default: 'INR' },
  paymentMethod: {
    type: String,
    enum: ['credit_card', 'debit_card', 'bank_transfer', 'upi', 'wallet', 'cash', 'cheque'],
    required: true
  },
  paymentType: { type: String, enum: ['full', 'partial', 'advance', 'balance', 'refund'], default: 'full' },
  status: { type: String, enum: ['pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'], default: 'pending' },
  gatewayResponse: {
    gatewayTransactionId: String, gatewayName: { type: String, default: 'SimulatedGateway' },
    responseCode: String, responseMessage: String, processedAt: Date
  },
  refundDetails: { refundAmount: Number, refundReason: String, refundedAt: Date, originalTransactionId: String },
  cardDetails: { lastFourDigits: String, cardType: String, cardHolderName: String },
  bankDetails: { bankName: String, accountLast4: String, ifscCode: String },
  receipt: { receiptNumber: String, generatedAt: Date, sentToCustomer: { type: Boolean, default: false } },
  notes: String,
  processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Agent' }
}, { timestamps: true });

paymentSchema.pre('save', function (next) {
  if (!this.transactionId) this.transactionId = generateRefNumber('TXN');
  if (!this.receipt.receiptNumber && this.status === 'completed') {
    this.receipt.receiptNumber = generateRefNumber('RCP');
    this.receipt.generatedAt = new Date();
  }
  next();
});

// Compound index for duplicate payment detection
paymentSchema.index(
  { booking: 1, amount: 1, status: 1, createdAt: -1 },
  { name: 'payment_dedup_check' }
);

module.exports = mongoose.model('Payment', paymentSchema);