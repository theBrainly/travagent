// seeders/createSuperAdmin.js
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Agent = require('../models/Agent');

dotenv.config();

const createSuperAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connected');

    const existing = await Agent.findOne({ role: 'super_admin' });
    if (existing) {
      console.log(`⚠️  Super Admin already exists: ${existing.email}`);
      process.exit(0);
    }

    await Agent.create({
      firstName: 'Super', lastName: 'Admin',
      email: 'superadmin@travelplatform.com',
      password: 'SuperAdmin@123456',
      phone: '+91-9999999999',
      role: 'super_admin',
      agencyName: 'TravelPlatform HQ',
      isActive: true, isVerified: true,
      commissionRate: 0,
      address: { city: 'Mumbai', state: 'Maharashtra', country: 'India' }
    });

    console.log('\n✅ SUPER ADMIN CREATED');
    console.log('Email: superadmin@travelplatform.com');
    console.log('Password: SuperAdmin@123456');
    console.log('⚠️  CHANGE PASSWORD AFTER FIRST LOGIN!\n');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
};

createSuperAdmin();