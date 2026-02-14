// models/Booking.js
const mongoose = require('mongoose');
const { generateRefNumber } = require('../utils/helpers');

const bookingSchema = new mongoose.Schema({
  bookingReference: { type: String, unique: true, index: true },
  agent: { type: mongoose.Schema.Types.ObjectId, ref: 'Agent', required: true, index: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
  itinerary: { type: mongoose.Schema.Types.ObjectId, ref: 'Itinerary' },
  lead: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },
  bookingType: {
    type: String,
    enum: ['flight', 'hotel', 'package', 'transfer', 'activity', 'visa', 'insurance', 'custom'],
    required: true
  },
  tripDetails: {
    title: { type: String, required: true },
    description: String,
    tripType: { type: String, enum: ['domestic', 'international', 'honeymoon', 'family', 'adventure', 'business', 'group', 'solo', 'pilgrimage'] },
    origin: String,
    destination: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    numberOfNights: Number
  },
  travelers: {
    adults: { type: Number, default: 1, min: 1 },
    children: { type: Number, default: 0 },
    infants: { type: Number, default: 0 },
    travelerDetails: [{ name: String, age: Number, gender: String, passportNumber: String }]
  },
  pricing: {
    basePrice: { type: Number, required: true, min: 0 },
    taxes: { type: Number, default: 0 },
    serviceCharge: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    discountReason: String,
    totalAmount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR' }
  },
  status: {
    type: String,
    enum: ['draft', 'pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'refunded'],
    default: 'pending', index: true
  },
  statusHistory: [{
    status: String, changedAt: { type: Date, default: Date.now },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Agent' },
    reason: String, notes: String
  }],
  paymentStatus: {
    type: String, enum: ['unpaid', 'partially_paid', 'paid', 'refunded'], default: 'unpaid'
  },
  amountPaid: { type: Number, default: 0 },
  amountDue: { type: Number, default: 0 },
  specialRequests: String,
  internalNotes: String,
  cancellation: {
    cancelledAt: Date,
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Agent' },
    reason: String, refundAmount: { type: Number, default: 0 }
  },
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  attachments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Document' }],
  tags: [String]
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

bookingSchema.pre('save', function (next) {
  if (!this.bookingReference) this.bookingReference = generateRefNumber('BK');
  this.amountDue = this.pricing.totalAmount - this.amountPaid;
  if (this.tripDetails.startDate && this.tripDetails.endDate) {
    this.tripDetails.numberOfNights = Math.ceil(Math.abs(new Date(this.tripDetails.endDate) - new Date(this.tripDetails.startDate)) / (1000 * 60 * 60 * 24));
  }
  if (this.isModified('status')) {
    this.statusHistory.push({ status: this.status, changedAt: new Date() });
  }
  next();
});

bookingSchema.virtual('payments', { ref: 'Payment', localField: '_id', foreignField: 'booking' });

// Compound indexes for conflict detection and search
bookingSchema.index(
  { customer: 1, 'tripDetails.destination': 1, 'tripDetails.startDate': 1, 'tripDetails.endDate': 1 },
  { name: 'booking_conflict_check' }
);
bookingSchema.index(
  { 'tripDetails.title': 'text', 'tripDetails.destination': 'text', bookingReference: 'text' },
  { name: 'booking_text_search' }
);

module.exports = mongoose.model('Booking', bookingSchema);