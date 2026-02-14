// models/Itinerary.js
const mongoose = require('mongoose');

const dayPlanSchema = new mongoose.Schema({
  dayNumber: { type: Number, required: true },
  date: Date,
  title: { type: String, required: true, trim: true },
  description: String,
  activities: [{
    time: String, activity: { type: String, required: true },
    location: String, duration: String, notes: String, cost: { type: Number, default: 0 }
  }],
  accommodation: {
    hotelName: String, hotelRating: Number, roomType: String,
    checkIn: String, checkOut: String, address: String,
    cost: { type: Number, default: 0 }, confirmationNumber: String
  },
  meals: {
    breakfast: { included: Boolean, venue: String, cost: { type: Number, default: 0 } },
    lunch: { included: Boolean, venue: String, cost: { type: Number, default: 0 } },
    dinner: { included: Boolean, venue: String, cost: { type: Number, default: 0 } }
  },
  transport: {
    type: { type: String }, details: String, from: String, to: String,
    departureTime: String, arrivalTime: String, cost: { type: Number, default: 0 }
  }
}, { _id: true });

const itinerarySchema = new mongoose.Schema({
  agent: { type: mongoose.Schema.Types.ObjectId, ref: 'Agent', required: true, index: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  title: { type: String, required: true, trim: true, maxlength: 200 },
  description: { type: String, maxlength: 2000 },
  tripType: {
    type: String,
    enum: ['domestic', 'international', 'honeymoon', 'family', 'adventure', 'business', 'group', 'solo', 'pilgrimage'],
    required: true
  },
  destinations: [{ city: { type: String, required: true }, country: { type: String, required: true }, arrivalDate: Date, departureDate: Date }],
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  duration: { nights: { type: Number, required: true }, days: { type: Number, required: true } },
  numberOfTravelers: { adults: { type: Number, default: 1 }, children: { type: Number, default: 0 }, infants: { type: Number, default: 0 } },
  dayPlans: [dayPlanSchema],
  inclusions: [String],
  exclusions: [String],
  pricing: {
    perPersonCost: { type: Number, default: 0 },
    totalBaseCost: { type: Number, default: 0 },
    taxes: { type: Number, default: 0 },
    serviceCharge: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    totalCost: { type: Number, default: 0 }
  },
  pdfUrl: { type: String },
  status: { type: String, enum: ['draft', 'proposed', 'approved', 'rejected', 'modified'], default: 'draft' },
  isTemplate: { type: Boolean, default: false },
  templateName: String,
  version: { type: Number, default: 1 },
  tags: [String],
  notes: String
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

itinerarySchema.pre('save', function (next) {
  if (this.startDate && this.endDate) {
    this.duration.nights = Math.ceil(Math.abs(new Date(this.endDate) - new Date(this.startDate)) / (1000 * 60 * 60 * 24));
    this.duration.days = this.duration.nights + 1;
  }
  if (this.pricing) {
    this.pricing.totalCost = this.pricing.totalBaseCost + this.pricing.taxes + this.pricing.serviceCharge - this.pricing.discount;
  }
  next();
});

module.exports = mongoose.model('Itinerary', itinerarySchema);