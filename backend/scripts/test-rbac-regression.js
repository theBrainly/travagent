// scripts/test-rbac-regression.js
// RBAC regression suite aligned with hierarchy and critical permissions.
const crypto = require('crypto');

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:5001/api';
const SUPER_EMAIL = process.env.SUPER_ADMIN_EMAIL || 'superadmin@travelplatform.com';
const SUPER_PASSWORD = process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin@123456';

const c = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

let passCount = 0;
let failCount = 0;

function log(msg, color = c.reset) { console.log(`${color}${msg}${c.reset}`); }
function section(msg) { log(`\n━━ ${msg} ━━`, c.cyan); }
function pass(msg) { passCount++; log(`  ✅ ${msg}`, c.green); }
function fail(msg, detail) {
  failCount++;
  log(`  ❌ ${msg}`, c.red);
  if (detail) console.error('    ', JSON.stringify(detail).slice(0, 320));
}

function rand(prefix) {
  return `${prefix}.${crypto.randomBytes(4).toString('hex')}`;
}

async function req(endpoint, { method = 'GET', body = null, token = null } = {}) {
  const headers = {};
  if (body && !(body instanceof FormData)) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers,
    body: body
      ? (body instanceof FormData ? body : JSON.stringify(body))
      : null
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  return { status: res.status, data };
}

function expectStatus(actual, expected, label, payload) {
  if (actual === expected) pass(label);
  else fail(`${label} (expected ${expected}, got ${actual})`, payload);
}

async function login(email, password) {
  return req('/auth/login', { method: 'POST', body: { email, password } });
}

async function createAgent(actorToken, role, prefix) {
  const email = `${rand(prefix)}@test.com`;
  const res = await req('/auth/admin/create-agent', {
    method: 'POST',
    token: actorToken,
    body: {
      firstName: role,
      lastName: 'Regression',
      email,
      password: 'TestUser@123',
      phone: `9${Math.floor(Math.random() * 900000000 + 100000000)}`,
      role
    }
  });
  return { ...res, email };
}

async function createBookingWithPayment(superToken) {
  const custEmail = `${rand('cust.rbac') }@test.com`;
  const customer = await req('/customers', {
    method: 'POST',
    token: superToken,
    body: { firstName: 'Pay', lastName: 'Target', email: custEmail, phone: '9991112233' }
  });
  if (customer.status !== 201) return { error: customer };
  const customerId = customer.data.data.customer._id;

  const start = new Date().toISOString();
  const end = new Date(Date.now() + 86400000).toISOString();
  const booking = await req('/bookings', {
    method: 'POST',
    token: superToken,
    body: {
      customer: customerId,
      bookingType: 'flight',
      tripDetails: { title: 'RBAC Refund Trip', destination: 'Dubai', startDate: start, endDate: end },
      pricing: { basePrice: 1500, taxes: 150, totalAmount: 1650 }
    }
  });
  if (booking.status !== 201) return { error: booking };
  const bookingId = booking.data.data.booking._id;

  const payment = await req('/payments', {
    method: 'POST',
    token: superToken,
    body: { booking: bookingId, amount: 600, paymentMethod: 'upi' }
  });
  if (payment.status !== 201) return { error: payment };
  return { customerId, bookingId, paymentId: payment.data.data.payment._id };
}

async function createCompletedBooking(superToken) {
  const custEmail = `${rand('cust.commission')}@test.com`;
  const customer = await req('/customers', {
    method: 'POST',
    token: superToken,
    body: { firstName: 'Com', lastName: 'Target', email: custEmail, phone: '8882223344' }
  });
  if (customer.status !== 201) return { error: customer };
  const customerId = customer.data.data.customer._id;

  const start = new Date().toISOString();
  const end = new Date(Date.now() + 86400000).toISOString();
  const booking = await req('/bookings', {
    method: 'POST',
    token: superToken,
    body: {
      customer: customerId,
      bookingType: 'hotel',
      tripDetails: { title: 'RBAC Commission Trip', destination: 'Bali', startDate: start, endDate: end },
      pricing: { basePrice: 3000, taxes: 300, totalAmount: 3300 }
    }
  });
  if (booking.status !== 201) return { error: booking };
  const bookingId = booking.data.data.booking._id;

  const s1 = await req(`/bookings/${bookingId}/status`, { method: 'PATCH', token: superToken, body: { status: 'confirmed' } });
  const s2 = await req(`/bookings/${bookingId}/status`, { method: 'PATCH', token: superToken, body: { status: 'in_progress' } });
  const s3 = await req(`/bookings/${bookingId}/status`, { method: 'PATCH', token: superToken, body: { status: 'completed' } });
  if (s1.status !== 200 || s2.status !== 200 || s3.status !== 200) return { error: { s1, s2, s3 } };

  const comms = await req('/commissions', { token: superToken });
  if (comms.status !== 200 || !Array.isArray(comms.data.data)) return { error: comms };
  const commission = comms.data.data.find((c) => {
    const booking = c.booking && typeof c.booking === 'object' ? c.booking._id : c.booking;
    return booking === bookingId;
  });
  if (!commission) return { error: { message: 'Commission not found for completed booking', bookingId } };
  return { bookingId, commissionId: commission._id };
}

async function run() {
  section('LOGIN');
  const superLogin = await login(SUPER_EMAIL, SUPER_PASSWORD);
  if (superLogin.status !== 200) {
    fail('Super admin login failed, cannot continue', superLogin);
    process.exit(1);
  }
  const superToken = superLogin.data.data.token;
  pass('Super admin login successful');

  section('SETUP ROLES');
  const adminCreate = await createAgent(superToken, 'admin', 'admin.rbac');
  expectStatus(adminCreate.status, 201, 'Super admin can create admin', adminCreate.data);
  const seniorCreate = await createAgent(superToken, 'senior_agent', 'senior.rbac');
  expectStatus(seniorCreate.status, 201, 'Super admin can create senior agent', seniorCreate.data);
  const agentCreate = await createAgent(superToken, 'agent', 'agent.rbac');
  expectStatus(agentCreate.status, 201, 'Super admin can create agent', agentCreate.data);
  const juniorCreate = await createAgent(superToken, 'junior_agent', 'junior.rbac');
  expectStatus(juniorCreate.status, 201, 'Super admin can create junior agent', juniorCreate.data);

  const adminLogin = await login(adminCreate.email, 'TestUser@123');
  const seniorLogin = await login(seniorCreate.email, 'TestUser@123');
  const agentLogin = await login(agentCreate.email, 'TestUser@123');
  const juniorLogin = await login(juniorCreate.email, 'TestUser@123');

  if ([adminLogin, seniorLogin, agentLogin, juniorLogin].some((x) => x.status !== 200)) {
    fail('Failed to login one or more role test users', { adminLogin, seniorLogin, agentLogin, juniorLogin });
    process.exit(1);
  }

  const adminToken = adminLogin.data.data.token;
  const seniorToken = seniorLogin.data.data.token;
  const agentToken = agentLogin.data.data.token;
  const juniorToken = juniorLogin.data.data.token;
  const agentId = agentLogin.data.data.agent._id;

  section('CREATE MATRIX');
  const adminCreateSenior = await createAgent(adminToken, 'senior_agent', 'admin.create.senior');
  expectStatus(adminCreateSenior.status, 201, 'Admin can create senior agent', adminCreateSenior.data);

  const adminCreateAdmin = await createAgent(adminToken, 'admin', 'admin.create.admin');
  expectStatus(adminCreateAdmin.status, 403, 'Admin cannot create admin', adminCreateAdmin.data);

  const seniorCreateAgent = await createAgent(seniorToken, 'agent', 'senior.create.agent');
  expectStatus(seniorCreateAgent.status, 201, 'Senior agent can create agent', seniorCreateAgent.data);

  const seniorCreateJunior = await createAgent(seniorToken, 'junior_agent', 'senior.create.junior');
  expectStatus(seniorCreateJunior.status, 201, 'Senior agent can create junior agent', seniorCreateJunior.data);

  const agentCreateJunior = await createAgent(agentToken, 'junior_agent', 'agent.create.junior');
  expectStatus(agentCreateJunior.status, 403, 'Agent cannot create junior agent', agentCreateJunior.data);

  const juniorCreateAgent = await createAgent(juniorToken, 'agent', 'junior.create.agent');
  expectStatus(juniorCreateAgent.status, 403, 'Junior agent cannot create agent', juniorCreateAgent.data);

  section('PROMOTION MATRIX');
  const promoTargetAgent = await createAgent(superToken, 'agent', 'promo.target.agent');
  const promoTargetJunior = await createAgent(superToken, 'junior_agent', 'promo.target.junior');
  const promoTargetSenior = await createAgent(superToken, 'senior_agent', 'promo.target.senior');
  if ([promoTargetAgent, promoTargetJunior, promoTargetSenior].some((x) => x.status !== 201)) {
    fail('Failed to create promotion targets', { promoTargetAgent, promoTargetJunior, promoTargetSenior });
  } else {
    const agentTargetId = promoTargetAgent.data.data.agent._id;
    const juniorTargetId = promoTargetJunior.data.data.agent._id;
    const seniorTargetId = promoTargetSenior.data.data.agent._id;

    const adminPromoteAgent = await req(`/agents/${agentTargetId}/role`, {
      method: 'PATCH',
      token: adminToken,
      body: { role: 'senior_agent' }
    });
    expectStatus(adminPromoteAgent.status, 200, 'Admin can promote agent to senior_agent', adminPromoteAgent.data);

    const seniorPromoteJunior = await req(`/agents/${juniorTargetId}/role`, {
      method: 'PATCH',
      token: seniorToken,
      body: { role: 'agent' }
    });
    expectStatus(seniorPromoteJunior.status, 200, 'Senior agent can promote junior_agent to agent', seniorPromoteJunior.data);

    const adminPromoteToAdmin = await req(`/agents/${seniorTargetId}/role`, {
      method: 'PATCH',
      token: adminToken,
      body: { role: 'admin' }
    });
    expectStatus(adminPromoteToAdmin.status, 403, 'Admin cannot promote someone to admin', adminPromoteToAdmin.data);
  }

  const agentSelfPromote = await req(`/agents/${agentId}/role`, {
    method: 'PATCH',
    token: agentToken,
    body: { role: 'senior_agent' }
  });
  expectStatus(agentSelfPromote.status, 403, 'Agent cannot self-promote', agentSelfPromote.data);

  section('APPROVAL FLOW');
  const pendingEmailA = `${rand('pending.a')}@test.com`;
  const pendingA = await req('/auth/register', {
    method: 'POST',
    body: { firstName: 'Pending', lastName: 'A', email: pendingEmailA, password: 'Pending@123', phone: '7770001111' }
  });
  if (pendingA.status !== 201) fail('Could not register pending user A', pendingA.data);
  const pendingAId = pendingA.data?.data?.agent?._id;

  if (pendingAId) {
    const adminApprove = await req(`/agents/${pendingAId}/approve`, { method: 'PATCH', token: adminToken });
    expectStatus(adminApprove.status, 200, 'Admin can approve pending agent', adminApprove.data);
  }

  const pendingEmailB = `${rand('pending.b')}@test.com`;
  const pendingB = await req('/auth/register', {
    method: 'POST',
    body: { firstName: 'Pending', lastName: 'B', email: pendingEmailB, password: 'Pending@123', phone: '7770002222' }
  });
  const pendingBId = pendingB.data?.data?.agent?._id;
  if (pendingBId) {
    const seniorApprove = await req(`/agents/${pendingBId}/approve`, { method: 'PATCH', token: seniorToken });
    expectStatus(seniorApprove.status, 403, 'Senior agent cannot approve pending agent', seniorApprove.data);
  }

  section('REFUNDS');
  const paymentFixture = await createBookingWithPayment(superToken);
  if (paymentFixture.error) {
    fail('Could not create booking/payment fixture', paymentFixture.error);
  } else {
    const seniorRefund = await req(`/payments/${paymentFixture.paymentId}/refund`, {
      method: 'POST',
      token: seniorToken,
      body: { reason: 'Policy test refund', amount: 100 }
    });
    expectStatus(seniorRefund.status, 201, 'Senior agent can process refunds', seniorRefund.data);

    const agentRefund = await req(`/payments/${paymentFixture.paymentId}/refund`, {
      method: 'POST',
      token: agentToken,
      body: { reason: 'Unauthorized refund attempt', amount: 50 }
    });
    expectStatus(agentRefund.status, 403, 'Agent cannot process refunds', agentRefund.data);
  }

  section('COMMISSION ACTIONS');
  const commissionFixture = await createCompletedBooking(superToken);
  if (commissionFixture.error) {
    fail('Could not create commission fixture', commissionFixture.error);
  } else {
    const adminApproveCommission = await req(`/commissions/${commissionFixture.commissionId}/approve`, {
      method: 'PATCH',
      token: adminToken
    });
    expectStatus(adminApproveCommission.status, 200, 'Admin can approve commission', adminApproveCommission.data);

    const adminMarkPaid = await req(`/commissions/${commissionFixture.commissionId}/pay`, {
      method: 'PATCH',
      token: adminToken,
      body: { paymentMethod: 'bank_transfer', transactionReference: rand('txn') }
    });
    expectStatus(adminMarkPaid.status, 200, 'Admin can mark commission paid', adminMarkPaid.data);
  }

  const commissionFixture2 = await createCompletedBooking(superToken);
  if (!commissionFixture2.error) {
    const seniorApproveCommission = await req(`/commissions/${commissionFixture2.commissionId}/approve`, {
      method: 'PATCH',
      token: seniorToken
    });
    expectStatus(seniorApproveCommission.status, 403, 'Senior agent cannot approve commissions', seniorApproveCommission.data);
  }

  section('SETTINGS ACCESS');
  const superSettings = await req('/cache/status', { token: superToken });
  expectStatus(superSettings.status, 200, 'Super admin can access settings endpoints', superSettings.data);

  const adminSettings = await req('/cache/status', { token: adminToken });
  expectStatus(adminSettings.status, 403, 'Admin cannot access super-admin-only settings endpoint', adminSettings.data);

  const juniorSettings = await req('/cache/status', { token: juniorToken });
  expectStatus(juniorSettings.status, 403, 'Junior agent cannot access settings endpoint', juniorSettings.data);

  section('JUNIOR CANNOT DELETE');
  const deleteTarget = await req('/customers', {
    method: 'POST',
    token: superToken,
    body: { firstName: 'Delete', lastName: 'Target', email: `${rand('delete.target')}@test.com`, phone: '7001002003' }
  });
  if (deleteTarget.status !== 201) {
    fail('Could not create customer for delete test', deleteTarget.data);
  } else {
    const customerId = deleteTarget.data.data.customer._id;
    const juniorDelete = await req(`/customers/${customerId}`, {
      method: 'DELETE',
      token: juniorToken
    });
    expectStatus(juniorDelete.status, 403, 'Junior agent cannot delete customer', juniorDelete.data);
  }

  section('SUMMARY');
  const total = passCount + failCount;
  const color = failCount > 0 ? c.yellow : c.green;
  log(`  Total: ${total} | ✅ Passed: ${passCount} | ❌ Failed: ${failCount}`, color);
  process.exit(failCount > 0 ? 1 : 0);
}

run().catch((err) => {
  fail('RBAC regression suite crashed', { message: err.message, stack: err.stack });
  process.exit(1);
});
