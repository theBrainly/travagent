const crypto = require('crypto');

const BASE_URL = 'http://localhost:5001/api';
let authToken = '';
// Super Admin Credentials
const EMAIL = 'superadmin@travelplatform.com';
const PASSWORD = 'SuperAdmin@123456';

let customerId = '';
let itineraryId = '';
let bookingId = '';
let leadId = '';

const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

const log = (msg, color = colors.reset) => console.log(`${color}${msg}${colors.reset}`);
const success = (msg) => log(`✓ ${msg}`, colors.green);
const fail = (msg, err) => {
    log(`✗ ${msg}`, colors.red);
    if (err) console.error(JSON.stringify(err, null, 2));
};
const info = (msg) => log(`ℹ ${msg}`, colors.blue);

async function request(endpoint, method = 'GET', body = null, token = null) {
    const headers = {
        'Content-Type': 'application/json',
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
        const res = await fetch(`${BASE_URL}${endpoint}`, {
            method,
            headers,
            body: body ? JSON.stringify(body) : null
        });

        const data = await res.json();
        return { status: res.status, data };
    } catch (err) {
        return { status: 500, error: err.message };
    }
}

async function runTests() {
    log('Starting API Verification (As Super Admin)...', colors.cyan);

    // 1. Health Check
    info('Testing Health Check...');
    const health = await request('/health');
    if (health.status === 200 && health.data.success) {
        success('Health Check Passed');
    } else {
        fail('Health Check Failed', health);
    }

    // 2. Auth - Login
    info('Testing Super Admin Login...');
    const login = await request('/auth/login', 'POST', { email: EMAIL, password: PASSWORD });
    if (login.status === 200 && login.data.success) {
        authToken = login.data.data.token;
        success('Login Passed');
    } else {
        fail('Login Failed', login);
        return;
    }

    // 3. Auth - Get Me
    info('Testing Get Me...');
    const me = await request('/auth/me', 'GET', null, authToken);
    if (me.status === 200 && me.data.success) success('Get Me Passed');
    else fail('Get Me Failed', me);

    // 4. Create Customer
    info('Testing Create Customer...');
    const customerData = {
        firstName: 'John',
        lastName: 'Doe',
        email: `customer.${crypto.randomBytes(4).toString('hex')}@example.com`,
        phone: '9876543210'
    };
    const createCustomer = await request('/customers', 'POST', customerData, authToken);
    if (createCustomer.status === 201 && createCustomer.data.success) {
        customerId = createCustomer.data.data.customer._id;
        success('Create Customer Passed');

        // Test Get Customers
        const getCustomers = await request('/customers', 'GET', null, authToken);
        if (getCustomers.status === 200) success('Get Customers Passed');
        else fail('Get Customers Failed', getCustomers);

    } else {
        fail('Create Customer Failed', createCustomer);
    }

    // 5. Create Itinerary
    info('Testing Create Itinerary...');
    // Correct enum: ['domestic', 'international', 'honeymoon', 'family', 'adventure', 'business', 'group', 'solo', 'pilgrimage']
    const itineraryData = {
        title: 'Summer Vacation',
        tripType: 'family',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 86400000 * 7).toISOString(),
        destinations: [{ city: 'Paris', country: 'France', arrivalDate: new Date().toISOString(), departureDate: new Date(Date.now() + 86400000 * 3).toISOString() }],
        budget: 5000,
        travelers: 2,
        duration: { days: 8, nights: 7 } // Explicitly required by schema
    };
    const createItinerary = await request('/itineraries', 'POST', itineraryData, authToken);
    if (createItinerary.status === 201 && createItinerary.data.success) {
        itineraryId = createItinerary.data.data.itinerary._id;
        success('Create Itinerary Passed');

        // 6. Get Itinerary
        info(`Testing Get Itinerary ${itineraryId}...`);
        const getItinerary = await request(`/itineraries/${itineraryId}`, 'GET', null, authToken);
        if (getItinerary.status === 200 && getItinerary.data.success) success('Get Itinerary Passed');
        else fail('Get Itinerary Failed', getItinerary);
    } else {
        fail('Create Itinerary Failed', createItinerary);
    }

    // 7. Create Booking
    let paymentBookingId = '';
    if (customerId) {
        info('Testing Create Booking...');
        const bookingData = {
            customer: customerId,
            bookingType: 'flight',
            tripDetails: {
                title: 'Flight to Paris',
                destination: 'Paris',
                startDate: new Date().toISOString(),
                endDate: new Date(Date.now() + 86400000).toISOString()
            },
            pricing: {
                basePrice: 500,
                taxes: 50,
                totalAmount: 550,
                currency: 'USD'
            },
            status: 'confirmed'
        };
        const createBooking = await request('/bookings', 'POST', bookingData, authToken);
        if (createBooking.status === 201 && createBooking.data.success) {
            success('Create Booking Passed');
            bookingId = createBooking.data.data.booking._id;
            paymentBookingId = bookingId;

            // Test Get Bookings
            const getBookings = await request('/bookings', 'GET', null, authToken);
            if (getBookings.status === 200) success('Get Bookings Passed');
            else fail('Get Bookings Failed', getBookings);

        } else {
            fail('Create Booking Failed', createBooking);
        }
    }

    // 8. Create Lead
    info('Testing Create Lead...');
    const leadData = {
        contactInfo: {
            firstName: 'Jane', lastName: 'Lead',
            email: `lead.${crypto.randomBytes(4).toString('hex')}@example.com`,
            phone: '1122334455'
        },
        source: 'website'
    };
    const createLead = await request('/leads', 'POST', leadData, authToken);
    if (createLead.status === 201 && createLead.data.success) {
        leadId = createLead.data.data.lead._id;
        success('Create Lead Passed');
        // Test Get Leads
        const getLeads = await request('/leads', 'GET', null, authToken);
        if (getLeads.status === 200) success('Get Leads Passed');
        else fail('Get Leads Failed', getLeads);
    } else {
        fail('Create Lead Failed', createLead);
    }

    // 9. Payment
    if (paymentBookingId && customerId) {
        info('Testing Process Payment...');
        const paymentData = {
            booking: paymentBookingId,
            amount: 550,
            paymentMethod: 'credit_card',
            paymentType: 'full',
            customer: customerId // Payment model requires customer? Yes.
        };
        // Note: paymentController.processPayment logic: req.body.agentRole = req.agent.role...
        const makePayment = await request('/payments', 'POST', paymentData, authToken);
        if (makePayment.status === 201 && makePayment.data.success) {
            success('Process Payment Passed');
            // Test Get Payments
            const getPayments = await request('/payments', 'GET', null, authToken);
            if (getPayments.status === 200) success('Get Payments Passed');
            else fail('Get Payments Failed', getPayments);
        } else {
            fail('Process Payment Failed', makePayment);
        }
    }

    log('\nTests Completed.', colors.cyan);
}

runTests();
