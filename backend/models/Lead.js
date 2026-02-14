// models/Lead.js
const mongoose = require('mongoose');
const { generateRefNumber } = require('../utils/helpers');

const leadSchema = new mongoose.Schema({
  leadReference: { type: String, unique: true, index: true },
  agent: { type: mongoose.Schema.Types.ObjectId, ref: 'Agent', index: true },
  contactInfo: {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, required: true },
    alternatePhone: String, city: String, country: { type: String, default: 'India' }
  },
  enquiryDetails: {
    destination: [String],
    tripType: { type: String, enum: ['domestic', 'international', 'honeymoon', 'family', 'adventure', 'business', 'group', 'solo', 'pilgrimage'] },
    startDate: Date, endDate: Date,
    flexibleDates: { type: Boolean, default: false },
    numberOfTravelers: { adults: { type: Number, default: 1 }, children: { type: Number, default: 0 }, infants: { type: Number, default: 0 } },
    budgetRange: { min: Number, max: Number, currency: { type: String, default: 'INR' } },
    specialRequirements: String
  },
  source: { type: String, enum: ['website', 'referral', 'social_media', 'walk_in', 'phone', 'email', 'partner', 'other'], required: true },
  status: { type: String, enum: ['new', 'contacted', 'qualified', 'proposal_sent', 'negotiation', 'converted', 'lost'], default: 'new', index: true },
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  followUps: [{
    date: { type: Date, default: Date.now },
    type: { type: String, enum: ['call', 'email', 'meeting', 'whatsapp', 'other'] },
    notes: String, outcome: String, nextFollowUp: Date,
    conductedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Agent' }
  }],
  nextFollowUpDate: Date,
  convertedToBooking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
  convertedToCustomer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  convertedAt: Date,
  lostReason: String, lostAt: Date,
  score: { type: Number, default: 0, min: 0, max: 100 },
  tags: [String], notes: String, assignedAt: Date
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

leadSchema.virtual('fullName').get(function () {
  return `${this.contactInfo.firstName} ${this.contactInfo.lastName}`;
});

leadSchema.pre('save', function (next) {
  if (!this.leadReference) this.leadReference = generateRefNumber('LD');
  let score = 0;
  if (this.contactInfo.email) score += 10;
  if (this.contactInfo.phone) score += 10;
  if (this.enquiryDetails.destination?.length > 0) score += 15;
  if (this.enquiryDetails.startDate) score += 10;
  if (this.enquiryDetails.budgetRange?.max > 0) score += 15;
  if (this.enquiryDetails.tripType) score += 10;
  if (this.followUps?.length > 0) score += Math.min(this.followUps.length * 5, 20);
  if (this.status === 'qualified') score += 10;
  this.score = Math.min(score, 100);
  next();
});

// Text index for search
leadSchema.index(
  { 'contactInfo.firstName': 'text', 'contactInfo.lastName': 'text', 'contactInfo.email': 'text', leadReference: 'text' },
  { name: 'lead_text_search' }
);

module.exports = mongoose.model('Lead', leadSchema);