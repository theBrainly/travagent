// models/Customer.js
const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  agent: { type: mongoose.Schema.Types.ObjectId, ref: 'Agent', required: true, index: true },
  firstName: { type: String, required: true, trim: true, maxlength: 50 },
  lastName: { type: String, required: true, trim: true, maxlength: 50 },
  email: { type: String, required: true, lowercase: true, trim: true },
  phone: { type: String, required: true },
  alternatePhone: String,
  dateOfBirth: Date,
  gender: { type: String, enum: ['male', 'female', 'other'] },
  address: {
    street: String, city: String, state: String,
    country: { type: String, default: 'India' }, zipCode: String
  },
  passportDetails: {
    passportNumber: String, issuedCountry: String, issueDate: Date, expiryDate: Date
  },
  preferences: {
    tripType: [String],
    budgetRange: { min: { type: Number, default: 0 }, max: { type: Number, default: 0 } },
    preferredDestinations: [String],
    specialRequirements: String
  },
  emergencyContact: { name: String, phone: String, relation: String },
  documents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Document' }],
  tags: [String],
  notes: String,
  totalTrips: { type: Number, default: 0 },
  totalSpent: { type: Number, default: 0 },
  loyaltyPoints: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

customerSchema.virtual('fullName').get(function () { return `${this.firstName} ${this.lastName}`; });
customerSchema.virtual('bookings', { ref: 'Booking', localField: '_id', foreignField: 'customer' });
customerSchema.index({ email: 1, agent: 1 }, { unique: true });

// Text index for search
customerSchema.index(
  { firstName: 'text', lastName: 'text', email: 'text', phone: 'text' },
  { name: 'customer_text_search' }
);

module.exports = mongoose.model('Customer', customerSchema);