// scripts/test-comprehensive.js — Tests for untested endpoints
const crypto = require('crypto');

const BASE_URL = 'http://localhost:5001/api';
const EMAIL = 'superadmin@travelplatform.com';
const PASSWORD = 'SuperAdmin@123456';
let authToken = '';
let totalPass = 0;
let totalFail = 0;

const colors = {
    reset: '\x1b[0m', red: '\x1b[31m', green: '\x1b[32m',
    yellow: '\x1b[33m', blue: '\x1b[34m', cyan: '\x1b[36m'
};
const log = (msg, c = colors.reset) => console.log(`${c}${msg}${colors.reset}`);
const pass = (msg) => { log(`  ✅ ${msg}`, colors.green); totalPass++; };
const fail = (msg, detail) => { log(`  ❌ ${msg}`, colors.red); if (detail) console.error('    ', JSON.stringify(detail).slice(0, 300)); totalFail++; };
const section = (msg) => log(`\n━━ ${msg} ━━`, colors.cyan);

async function req(endpoint, method = 'GET', body = null, token = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    try {
        const res = await fetch(`${BASE_URL}${endpoint}`, {
            method, headers, body: body ? JSON.stringify(body) : null
        });
        const text = await res.text();
        let data;
        try { data = JSON.parse(text); } catch { data = { raw: text }; }
        return { status: res.status, data };
    } catch (err) {
        return { status: 500, error: err.message };
    }
}

async function run() {
    log('\n🔍 COMPREHENSIVE ENDPOINT TEST SUITE\n', colors.cyan);

    // ── Login ───────────────────────────────────────────────────
    section('LOGIN');
    const login = await req('/auth/login', 'POST', { email: EMAIL, password: PASSWORD });
    if (login.status !== 200) { fail('Login failed — cannot continue', login); process.exit(1); }
    authToken = login.data.data.token;
    pass('Super Admin logged in');

    // ── Dashboard ────────────────────────────────────────────────
    section('DASHBOARD');
    const stats = await req('/dashboard/stats', 'GET', null, authToken);
    if (stats.status === 200 && stats.data.success) pass(`Dashboard stats OK — ${JSON.stringify(stats.data.data).slice(0, 100)}`);
    else fail('Dashboard stats failed', stats);

    const recent = await req('/dashboard/recent-bookings', 'GET', null, authToken);
    if (recent.status === 200 && recent.data.success) pass(`Recent bookings OK — count: ${recent.data.data?.length || 0}`);
    else fail('Recent bookings failed', recent);

    // ── Agents ───────────────────────────────────────────────────
    section('AGENTS');
    const agents = await req('/agents', 'GET', null, authToken);
    if (agents.status === 200 && agents.data.success) pass(`Get agents OK — count: ${agents.data.data?.length || 0}`);
    else fail('Get agents failed', agents);

    const me = await req('/auth/me', 'GET', null, authToken);
    const myId = me.data?.data?.agent?._id;
    if (myId) {
        const agentById = await req(`/agents/${myId}`, 'GET', null, authToken);
        if (agentById.status === 200 && agentById.data.success) pass('Get agent by ID OK');
        else fail('Get agent by ID failed', agentById);
    }

    // ── Audit Logs ───────────────────────────────────────────────
    section('AUDIT LOGS');
    const auditLogs = await req('/audit-logs', 'GET', null, authToken);
    if (auditLogs.status === 200) pass(`Get audit logs OK — count: ${auditLogs.data.data?.length || 'N/A'}`);
    else fail('Get audit logs failed', auditLogs);

    const auditStats = await req('/audit-logs/stats', 'GET', null, authToken);
    if (auditStats.status === 200) pass(`Audit stats OK`);
    else fail('Audit stats failed', auditStats);

    // ── Notifications ────────────────────────────────────────────
    section('NOTIFICATIONS');
    const notifications = await req('/notifications', 'GET', null, authToken);
    if (notifications.status === 200) pass(`Get notifications OK`);
    else fail('Get notifications failed', notifications);

    const unreadCount = await req('/notifications/unread-count', 'GET', null, authToken);
    if (unreadCount.status === 200) pass(`Unread count OK — ${JSON.stringify(unreadCount.data.data || unreadCount.data).slice(0, 100)}`);
    else fail('Unread count failed', unreadCount);

    const markAll = await req('/notifications/read-all', 'PATCH', {}, authToken);
    if (markAll.status === 200) pass('Mark all read OK');
    else fail('Mark all read failed', markAll);

    // ── Cache ────────────────────────────────────────────────────
    section('CACHE');
    const cacheStatus = await req('/cache/status', 'GET', null, authToken);
    if (cacheStatus.status === 200 && cacheStatus.data.success) pass(`Cache status OK — connected: ${cacheStatus.data.data?.connected}`);
    else fail('Cache status failed', cacheStatus);

    // ── Commissions (list) ───────────────────────────────────────
    section('COMMISSIONS (LIST)');
    const commissions = await req('/commissions', 'GET', null, authToken);
    if (commissions.status === 200 && commissions.data.success) pass(`Get commissions OK — count: ${commissions.data.data?.length || 0}`);
    else fail('Get commissions failed', commissions);

    // ── Auth Register (new agent) ────────────────────────────────
    section('AUTH — REGISTER');
    const uniqueEmail = `tester.${crypto.randomBytes(4).toString('hex')}@test.com`;
    const register = await req('/auth/register', 'POST', {
        firstName: 'Test', lastName: 'User', email: uniqueEmail,
        password: 'TestUser@123456', phone: '9876500099'
    });
    if (register.status === 201 && register.data.success) pass(`Register new agent OK — ${uniqueEmail}`);
    else fail('Register failed', register);

    // ── Auth — Admin Create Agent ────────────────────────────────
    section('AUTH — ADMIN CREATE AGENT');
    const adminEmail = `admin.comp.${crypto.randomBytes(4).toString('hex')}@test.com`;
    const adminCreate = await req('/auth/admin/create-agent', 'POST', {
        firstName: 'Comp', lastName: 'Agent', email: adminEmail,
        password: 'CompAgent@123', phone: '9998887777', role: 'agent'
    }, authToken);
    if (adminCreate.status === 201 && adminCreate.data.success) pass(`Admin create-agent OK — ${adminEmail}`);
    else fail('Admin create-agent failed', adminCreate);

    // ── Customer Update ──────────────────────────────────────────
    section('CUSTOMER UPDATE & DELETE');
    const custEmail = `cust.comp.${crypto.randomBytes(4).toString('hex')}@test.com`;
    const newCust = await req('/customers', 'POST', {
        firstName: 'Comp', lastName: 'Cust', email: custEmail, phone: '1111122222'
    }, authToken);
    if (newCust.status === 201) {
        const cId = newCust.data.data.customer._id;
        pass('Create customer for update test OK');

        const update = await req(`/customers/${cId}`, 'PUT', { firstName: 'Updated' }, authToken);
        if (update.status === 200 && update.data.success) pass('Update customer OK');
        else fail('Update customer failed', update);

        const del = await req(`/customers/${cId}`, 'DELETE', null, authToken);
        if (del.status === 200 && del.data.success) pass('Delete customer OK');
        else fail('Delete customer failed', del);
    } else {
        fail('Create customer for update test failed', newCust);
    }

    // ── Booking Update Status ────────────────────────────────────
    section('BOOKING STATUS UPDATE');
    const custForBooking = await req('/customers', 'POST', {
        firstName: 'Book', lastName: 'Test', email: `book.${crypto.randomBytes(4).toString('hex')}@test.com`, phone: '3334445555'
    }, authToken);
    if (custForBooking.status === 201) {
        const cid = custForBooking.data.data.customer._id;
        const newBooking = await req('/bookings', 'POST', {
            customer: cid, bookingType: 'hotel',
            tripDetails: { title: 'Status Test', destination: 'London', startDate: new Date().toISOString(), endDate: new Date(Date.now() + 86400000).toISOString() },
            pricing: { basePrice: 200, taxes: 20, totalAmount: 220 }
        }, authToken);
        if (newBooking.status === 201) {
            const bId = newBooking.data.data.booking._id;
            pass('Create booking for status test OK');
            const statusUpdate = await req(`/bookings/${bId}/status`, 'PATCH', { status: 'confirmed' }, authToken);
            if (statusUpdate.status === 200 && statusUpdate.data.success) pass('Update booking status OK');
            else fail('Update booking status failed', statusUpdate);
        } else {
            fail('Create booking for status test failed', newBooking);
        }
    }

    // ── Lead Follow-ups ──────────────────────────────────────────
    section('LEAD FOLLOW-UPS');
    const newLead = await req('/leads', 'POST', {
        contactInfo: { firstName: 'FollowUp', lastName: 'Test', email: `fu.${crypto.randomBytes(4).toString('hex')}@test.com`, phone: '5556667777' },
        source: 'referral'
    }, authToken);
    if (newLead.status === 201) {
        const lId = newLead.data.data.lead._id;
        pass('Create lead for follow-up test OK');
        const addFollowUp = await req(`/leads/${lId}/follow-ups`, 'POST', {
            type: 'call', notes: 'Test follow-up call'
        }, authToken);
        if (addFollowUp.status === 200 || addFollowUp.status === 201) pass('Add follow-up to own lead OK');
        else fail('Add follow-up failed', addFollowUp);

        // Convert lead
        const convert = await req(`/leads/${lId}/convert`, 'POST', null, authToken);
        if (convert.status === 200 || convert.status === 201) pass('Convert lead OK');
        else fail('Convert lead failed', convert);
    } else {
        fail('Create lead for follow-up test failed', newLead);
    }

    // ── Itinerary Update & Delete ────────────────────────────────
    section('ITINERARY UPDATE & DELETE');
    const newItin = await req('/itineraries', 'POST', {
        title: 'CompTest Itinerary', tripType: 'adventure',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 86400000 * 5).toISOString(),
        destinations: [{ city: 'Tokyo', country: 'Japan', arrivalDate: new Date().toISOString(), departureDate: new Date(Date.now() + 86400000 * 3).toISOString() }],
        budget: 3000, travelers: 1, duration: { days: 6, nights: 5 }
    }, authToken);
    if (newItin.status === 201) {
        const iId = newItin.data.data.itinerary._id;
        pass('Create itinerary for update test OK');

        const update = await req(`/itineraries/${iId}`, 'PUT', { title: 'Updated Itinerary' }, authToken);
        if (update.status === 200 && update.data.success) pass('Update itinerary OK');
        else fail('Update itinerary failed', update);

        const del = await req(`/itineraries/${iId}`, 'DELETE', null, authToken);
        if (del.status === 200 && del.data.success) pass('Delete itinerary OK');
        else fail('Delete itinerary failed', del);
    } else {
        fail('Create itinerary for update test failed', newItin);
    }

    // ── Summary ──────────────────────────────────────────────────
    section('SUMMARY');
    log(`  Total: ${totalPass + totalFail}  |  ✅ Passed: ${totalPass}  |  ❌ Failed: ${totalFail}`, totalFail > 0 ? colors.yellow : colors.green);
    log('\n🔍 COMPREHENSIVE TEST COMPLETE\n', colors.cyan);

    process.exit(totalFail > 0 ? 1 : 0);
}

run().catch(err => { console.error('Fatal:', err); process.exit(1); });
