// seeders/seed.js
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Agent = require('../models/Agent');
const Customer = require('../models/Customer');
const Lead = require('../models/Lead');

dotenv.config();

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connected');

    await Agent.deleteMany();
    await Customer.deleteMany();
    await Lead.deleteMany();

    const agents = await Agent.create([
      {
        firstName: 'Super', lastName: 'Admin', email: 'superadmin@travelplatform.com',
        password: 'SuperAdmin@123456', phone: '+91-9999999999', role: 'super_admin',
        agencyName: 'TravelPlatform HQ', isActive: true, isVerified: true, commissionRate: 0,
        address: { city: 'Mumbai', state: 'Maharashtra', country: 'India' }
      },
      {
        firstName: 'Admin', lastName: 'User', email: 'admin@travelplatform.com',
        password: 'Admin@123456', phone: '+91-9876543210', role: 'admin',
        agencyName: 'TravelPlatform', isActive: true, isVerified: true, commissionRate: 15,
        address: { city: 'Mumbai', state: 'Maharashtra', country: 'India' }
      },
      {
        firstName: 'Rahul', lastName: 'Sharma', email: 'rahul@travelagency.com',
        password: 'Agent@123456', phone: '+91-9876543211', role: 'senior_agent',
        agencyName: 'Sharma Travels', isActive: true, isVerified: true, commissionRate: 12,
        address: { city: 'Delhi', state: 'Delhi', country: 'India' }
      },
      {
        firstName: 'Priya', lastName: 'Patel', email: 'priya@travelagency.com',
        password: 'Agent@123456', phone: '+91-9876543212', role: 'agent',
        agencyName: 'Patel Tours', isActive: true, isVerified: true, commissionRate: 10,
        address: { city: 'Ahmedabad', state: 'Gujarat', country: 'India' }
      }
    ]);

    const customers = await Customer.create([
      {
        agent: agents[2]._id, firstName: 'Amit', lastName: 'Kumar',
        email: 'amit@example.com', phone: '+91-8765432100', gender: 'male',
        address: { city: 'Delhi', country: 'India' },
        preferences: { tripType: ['family', 'domestic'], budgetRange: { min: 50000, max: 200000 }, preferredDestinations: ['Goa', 'Kerala'] }
      },
      {
        agent: agents[2]._id, firstName: 'Sneha', lastName: 'Reddy',
        email: 'sneha@example.com', phone: '+91-8765432101', gender: 'female',
        address: { city: 'Hyderabad', country: 'India' },
        preferences: { tripType: ['honeymoon', 'international'], budgetRange: { min: 200000, max: 500000 }, preferredDestinations: ['Maldives', 'Bali'] }
      }
    ]);

    await Lead.create([
      {
        agent: agents[2]._id,
        contactInfo: { firstName: 'Vikram', lastName: 'Singh', email: 'vikram@example.com', phone: '+91-7654321000', city: 'Jaipur' },
        enquiryDetails: { destination: ['Thailand', 'Vietnam'], tripType: 'adventure', numberOfTravelers: { adults: 4 }, budgetRange: { min: 100000, max: 300000 } },
        source: 'website', priority: 'high'
      },
      {
        agent: agents[3]._id,
        contactInfo: { firstName: 'Meera', lastName: 'Joshi', email: 'meera@example.com', phone: '+91-7654321001', city: 'Pune' },
        enquiryDetails: { destination: ['Goa'], tripType: 'family', numberOfTravelers: { adults: 2, children: 2 }, budgetRange: { min: 30000, max: 80000 } },
        source: 'referral', priority: 'medium'
      }
    ]);

    console.log('\n✅ SEED COMPLETE');
    console.log('Super Admin: superadmin@travelplatform.com / SuperAdmin@123456');
    console.log('Admin: admin@travelplatform.com / Admin@123456');
    console.log('Senior Agent: rahul@travelagency.com / Agent@123456');
    console.log('Agent: priya@travelagency.com / Agent@123456\n');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
};

seedData();