// scripts/test-steps-7-10.js
const BASE_URL = 'http://localhost:5001/api';

const colors = {
    reset: '\x1b[0m', red: '\x1b[31m', green: '\x1b[32m', blue: '\x1b[34m', cyan: '\x1b[36m'
};
const ok = (msg) => console.log(`${colors.green}✓ ${msg}${colors.reset}`);
const fail = (msg) => console.log(`${colors.red}✗ ${msg}${colors.reset}`);
const info = (msg) => console.log(`${colors.blue}ℹ ${msg}${colors.reset}`);

async function request(endpoint, method = 'GET', body = null, token = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    try {
        const res = await fetch(`${BASE_URL}${endpoint}`, {
            method, headers,
            body: body ? JSON.stringify(body) : null
        });
        return { status: res.status, data: await res.json() };
    } catch (err) {
        return { status: 500, error: err.message };
    }
}

async function run() {
    console.log(`${colors.cyan}━━━ Testing Steps 7-10 Features ━━━${colors.reset}\n`);

    // Login
    const login = await request('/auth/login', 'POST', { email: 'superadmin@travelplatform.com', password: 'SuperAdmin@123456' });
    if (!login.data?.success) { fail('Login failed'); return; }
    const token = login.data.data.token;
    ok('Login');

    // ── Step 7: Health with Jobs ─────────
    info('Step 7 — Background Jobs');
    const health = await request('/health');
    if (health.data?.jobs?.isRunning) ok(`Jobs running: ${health.data.jobs.cronJobs} cron jobs`);
    else fail('Jobs not running');

    // ── Step 8: File Upload ─────────────
    info('Step 8 — File Upload');
    const noFile = await request('/uploads/single', 'POST', {}, token);
    if (noFile.status === 400) ok('Upload validation: rejects missing file (400)');
    else fail(`Upload validation: got ${noFile.status}`);

    const bookingDocs = await request('/uploads/booking/000000000000000000000000', 'GET', null, token);
    if (bookingDocs.data?.success) ok(`Get booking files: ${bookingDocs.data.data.count} docs`);
    else fail('Get booking files');

    const customerDocs = await request('/uploads/customer/000000000000000000000000', 'GET', null, token);
    if (customerDocs.data?.success) ok(`Get customer files: ${customerDocs.data.data.count} docs`);
    else fail('Get customer files');

    // ── Step 9: Permissions ─────────────
    info('Step 9 — Dynamic Permissions');
    const allPerms = await request('/permissions', 'GET', null, token);
    if (allPerms.data?.success) ok(`Get all permissions: ${allPerms.data.data.count || allPerms.data.data.permissions?.length} roles`);
    else fail(`Get all permissions: ${allPerms.data?.message}`);

    const agentPerms = await request('/permissions/agent', 'GET', null, token);
    if (agentPerms.data?.success) ok(`Get agent permissions: ${Object.keys(agentPerms.data.data.permissions || {}).length} keys`);
    else fail(`Get agent permissions: ${agentPerms.data?.message}`);

    const updatePerm = await request('/permissions/agent', 'PUT', { canExportData: true }, token);
    if (updatePerm.data?.success) ok('Update agent permission: canExportData = true');
    else fail(`Update agent permission: ${updatePerm.data?.message}`);

    // Verify update
    const verifyPerm = await request('/permissions/agent', 'GET', null, token);
    if (verifyPerm.data?.data?.permissions?.canExportData === true) ok('Verified: canExportData is now true');
    else fail('Verified: canExportData did not update');

    // Reset permissions
    const resetPerms = await request('/permissions/reset', 'POST', {}, token);
    if (resetPerms.data?.success) ok('Reset permissions to defaults');
    else fail(`Reset permissions: ${resetPerms.data?.message}`);

    // ── Step 10: Microservice Simulation ─
    info('Step 10 — Microservice Simulation');
    if (health.data?.architecture === 'microservice-simulation') ok('Architecture: microservice-simulation');
    else fail('Architecture label missing');

    const services = health.data?.services?.summary;
    if (services?.total >= 5) ok(`Services: ${services.total} registered, ${services.healthy} healthy`);
    else fail('Services not found in health');

    if (health.data?.eventBus?.subscriptions) ok(`Event bus: ${health.data.eventBus.subscriptions.length} subscriptions`);
    else fail('Event bus info missing');

    const eventsLog = await request('/events/log', 'GET', null, token);
    if (eventsLog.data?.success) ok(`Event log endpoint: ${eventsLog.data.data.subscriptions?.length} subscriptions tracked`);
    else fail(`Event log: ${eventsLog.data?.message}`);

    console.log(`\n${colors.cyan}━━━ All Tests Complete ━━━${colors.reset}`);
}

run().catch(e => console.error('Error:', e.message));
