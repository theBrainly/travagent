// scripts/test-rbac.js — RBAC enforcement verification
const crypto = require('crypto');

const BASE_URL = 'http://localhost:5001/api';
const SUPER_ADMIN_EMAIL = 'superadmin@travelplatform.com';
const SUPER_ADMIN_PASSWORD = 'SuperAdmin@123456';

const colors = {
    reset: '\x1b[0m', red: '\x1b[31m', green: '\x1b[32m',
    yellow: '\x1b[33m', blue: '\x1b[34m', cyan: '\x1b[36m'
};
const log = (msg, c = colors.reset) => console.log(`${c}${msg}${colors.reset}`);
const pass = (msg) => log(`  ✅ ${msg}`, colors.green);
const fail = (msg, detail) => { log(`  ❌ ${msg}`, colors.red); if (detail) console.error('    ', JSON.stringify(detail).slice(0, 200)); };
const section = (msg) => log(`\n━━ ${msg} ━━`, colors.cyan);

let superAdminToken = '';
let agentToken = '';
let juniorAgentToken = '';
let agentId = '';
let juniorAgentId = '';
let superAdminId = '';

// -- Test resources created by superadmin for cross-agent testing
let customerId = '';
let bookingId = '';
let leadId = '';
let paymentId = '';
let commissionId = '';

async function req(endpoint, method = 'GET', body = null, token = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    try {
        const res = await fetch(`${BASE_URL}${endpoint}`, {
            method, headers, body: body ? JSON.stringify(body) : null
        });
        return { status: res.status, data: await res.json() };
    } catch (err) {
        return { status: 500, error: err.message };
    }
}

async function setup() {
    section('SETUP: Login as Super Admin & Create Test Agents');

    // Login super admin
    const login = await req('/auth/login', 'POST', { email: SUPER_ADMIN_EMAIL, password: SUPER_ADMIN_PASSWORD });
    if (login.status !== 200) { fail('Super admin login failed', login); process.exit(1); }
    superAdminToken = login.data.data.token;
    superAdminId = login.data.data.agent._id;
    pass('Super admin logged in');

    // Create an AGENT
    const agentEmail = `agent.rbac.${crypto.randomBytes(4).toString('hex')}@test.com`;
    const createAgent = await req('/auth/admin/create-agent', 'POST', {
        firstName: 'Test', lastName: 'Agent', email: agentEmail,
        password: 'TestAgent@123', phone: '9876500001', role: 'agent'
    }, superAdminToken);
    if (createAgent.status !== 201) { fail('Create agent failed', createAgent); process.exit(1); }
    agentId = createAgent.data.data.agent._id;
    pass(`Agent created: ${agentEmail}`);

    // Login as agent
    const agentLogin = await req('/auth/login', 'POST', { email: agentEmail, password: 'TestAgent@123' });
    if (agentLogin.status !== 200) { fail('Agent login failed', agentLogin); process.exit(1); }
    agentToken = agentLogin.data.data.token;
    pass('Agent logged in');

    // Create a JUNIOR_AGENT
    const juniorEmail = `junior.rbac.${crypto.randomBytes(4).toString('hex')}@test.com`;
    const createJunior = await req('/auth/admin/create-agent', 'POST', {
        firstName: 'Test', lastName: 'Junior', email: juniorEmail,
        password: 'TestJunior@123', phone: '9876500002', role: 'junior_agent'
    }, superAdminToken);
    if (createJunior.status !== 201) { fail('Create junior agent failed', createJunior); process.exit(1); }
    juniorAgentId = createJunior.data.data.agent._id;
    pass(`Junior agent created: ${juniorEmail}`);

    // Login as junior agent
    const juniorLogin = await req('/auth/login', 'POST', { email: juniorEmail, password: 'TestJunior@123' });
    if (juniorLogin.status !== 200) { fail('Junior agent login failed', juniorLogin); process.exit(1); }
    juniorAgentToken = juniorLogin.data.data.token;
    pass('Junior agent logged in');

    // Create test data as super admin
    // Customer
    const cust = await req('/customers', 'POST', {
        firstName: 'RBAC', lastName: 'Customer',
        email: `cust.rbac.${crypto.randomBytes(4).toString('hex')}@test.com`,
        phone: '1234567890'
    }, superAdminToken);
    if (cust.status === 201) { customerId = cust.data.data.customer._id; pass('Test customer created'); }
    else { fail('Customer creation failed', cust); }

    // Lead  
    const lead = await req('/leads', 'POST', {
        contactInfo: { firstName: 'RBAC', lastName: 'Lead', email: `lead.rbac.${crypto.randomBytes(4).toString('hex')}@test.com`, phone: '1111111111' },
        source: 'website'
    }, superAdminToken);
    if (lead.status === 201) { leadId = lead.data.data.lead._id; pass('Test lead created'); }
    else { fail('Lead creation failed', lead); }

    // Booking
    if (customerId) {
        const booking = await req('/bookings', 'POST', {
            customer: customerId, bookingType: 'flight',
            tripDetails: { title: 'RBAC Test Flight', destination: 'London', startDate: new Date().toISOString(), endDate: new Date(Date.now() + 86400000).toISOString() },
            pricing: { basePrice: 1000, taxes: 100, totalAmount: 1100 }
        }, superAdminToken);
        if (booking.status === 201) { bookingId = booking.data.data.booking._id; pass('Test booking created'); }
        else { fail('Booking creation failed', booking); }
    }

    // Payment (on super admin's booking)
    if (bookingId) {
        const payment = await req('/payments', 'POST', {
            booking: bookingId, amount: 500, paymentMethod: 'credit_card'
        }, superAdminToken);
        if (payment.status === 201) { paymentId = payment.data.data.payment._id; pass('Test payment created'); }
        else { fail('Payment creation failed', payment); }
    }

    // Commission — get one if it exists
    const comms = await req('/commissions', 'GET', null, superAdminToken);
    if (comms.status === 200 && comms.data.data?.length > 0) {
        commissionId = comms.data.data[0]._id;
        pass(`Found commission: ${commissionId}`);
    } else {
        log('  ⚠️  No commissions found — skipping commission ownership test', colors.yellow);
    }
}

async function testFix2_PaymentMinLevel() {
    section('FIX-2: JUNIOR_AGENT cannot process payments (requireMinLevel(2))');

    const res = await req('/payments', 'POST', {
        booking: bookingId || '000000000000000000000000', amount: 100, paymentMethod: 'credit_card'
    }, juniorAgentToken);

    if (res.status === 403) pass('JUNIOR_AGENT blocked from processing payment (403)');
    else fail(`Expected 403, got ${res.status}`, res.data);
}

async function testFix3_LeadOwnership() {
    section('FIX-3: Agent cannot view another agent\'s lead by ID');

    if (!leadId) { log('  ⚠️  No lead to test — skipping', colors.yellow); return; }

    const res = await req(`/leads/${leadId}`, 'GET', null, agentToken);
    if (res.status === 403) pass('Agent blocked from viewing super admin\'s lead (403)');
    else fail(`Expected 403, got ${res.status}`, res.data);
}

async function testFix4_PaymentOwnership() {
    section('FIX-4: Agent cannot view another agent\'s payment by ID');

    if (!paymentId) { log('  ⚠️  No payment to test — skipping', colors.yellow); return; }

    const res = await req(`/payments/${paymentId}`, 'GET', null, agentToken);
    if (res.status === 403) pass('Agent blocked from viewing super admin\'s payment (403)');
    else fail(`Expected 403, got ${res.status}`, res.data);
}

async function testFix5_CommissionOwnership() {
    section('FIX-5: Agent cannot view another agent\'s commission by ID');

    if (!commissionId) { log('  ⚠️  No commission to test — skipping', colors.yellow); return; }

    const res = await req(`/commissions/${commissionId}`, 'GET', null, agentToken);
    if (res.status === 403) pass('Agent blocked from viewing super admin\'s commission (403)');
    else fail(`Expected 403, got ${res.status}`, res.data);
}

async function testFix7_SelfAssignableRoles() {
    section('FIX-7: Self-registration with junior_agent role gets overridden to agent');

    const email = `selfassign.${crypto.randomBytes(4).toString('hex')}@test.com`;
    const res = await req('/auth/register', 'POST', {
        firstName: 'Self', lastName: 'Assign', email,
        password: 'SelfAssign@123', phone: '9999988888', role: 'junior_agent'
    });

    if (res.status === 201 || res.status === 200) {
        const assignedRole = res.data.data?.agent?.role;
        if (assignedRole === 'agent') pass(`Role overridden to 'agent' (was 'junior_agent')`);
        else fail(`Expected role 'agent', got '${assignedRole}'`, res.data);
    } else {
        fail(`Registration failed with status ${res.status}`, res.data);
    }
}

async function testFix8_ActivateAgentLevelCheck() {
    section('FIX-8: Admin cannot activate super_admin');

    // Create an admin to test with
    const adminEmail = `admin.rbac.${crypto.randomBytes(4).toString('hex')}@test.com`;
    const createAdmin = await req('/auth/admin/create-agent', 'POST', {
        firstName: 'Test', lastName: 'Admin', email: adminEmail,
        password: 'TestAdmin@123', phone: '9876500003', role: 'admin'
    }, superAdminToken);

    if (createAdmin.status !== 201) {
        fail('Could not create test admin', createAdmin);
        return;
    }

    const adminId = createAdmin.data.data.agent._id;
    const adminLogin = await req('/auth/login', 'POST', { email: adminEmail, password: 'TestAdmin@123' });
    if (adminLogin.status !== 200) { fail('Admin login failed', adminLogin); return; }
    const adminToken = adminLogin.data.data.token;
    pass('Admin created and logged in');

    // Admin tries to activate super admin
    const res = await req(`/agents/${superAdminId}/activate`, 'PATCH', {}, adminToken);
    if (res.status === 403) pass('Admin blocked from activating super admin (403)');
    else fail(`Expected 403, got ${res.status}`, res.data);
}

async function testFix9_FollowUpOwnership() {
    section('FIX-9: Agent cannot add follow-up to another agent\'s lead');

    if (!leadId) { log('  ⚠️  No lead to test — skipping', colors.yellow); return; }

    const res = await req(`/leads/${leadId}/follow-ups`, 'POST', {
        type: 'call', notes: 'Unauthorized follow-up test'
    }, agentToken);

    if (res.status === 403) pass('Agent blocked from adding follow-up to super admin\'s lead (403)');
    else fail(`Expected 403, got ${res.status}`, res.data);
}

async function run() {
    log('\n🔒 RBAC COMPLIANCE TEST SUITE\n', colors.cyan);

    await setup();

    await testFix2_PaymentMinLevel();
    await testFix3_LeadOwnership();
    await testFix4_PaymentOwnership();
    await testFix5_CommissionOwnership();
    await testFix7_SelfAssignableRoles();
    await testFix8_ActivateAgentLevelCheck();
    await testFix9_FollowUpOwnership();

    log('\n━━ RBAC TEST SUITE COMPLETE ━━\n', colors.cyan);
}

run().catch(err => { console.error('Fatal:', err); process.exit(1); });
