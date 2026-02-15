// scripts/test-frontend-smoke.js
// API smoke checks for frontend critical paths:
// login, permissions bootstrap, upload contract, booking filters, lead filters.
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

function expect(status, target, label, payload) {
  if (status === target) pass(label);
  else fail(`${label} (expected ${target}, got ${status})`, payload);
}

async function run() {
  section('LOGIN CONTRACT');
  const login = await req('/auth/login', {
    method: 'POST',
    body: { email: SUPER_EMAIL, password: SUPER_PASSWORD }
  });
  expect(login.status, 200, 'Login endpoint responds 200', login.data);
  if (login.status !== 200) process.exit(1);

  const token = login.data?.data?.token;
  const agent = login.data?.data?.agent;
  if (token && agent?._id) pass('Login response contains data.token and data.agent');
  else fail('Login response missing data.token/data.agent', login.data);

  section('PERMISSIONS BOOTSTRAP');
  const mePerms = await req('/permissions/me', { token });
  expect(mePerms.status, 200, 'GET /permissions/me responds 200 for authenticated user', mePerms.data);
  if (mePerms.data?.data?.permissions) pass('Permissions endpoint returns data.permissions');
  else fail('Permissions endpoint missing data.permissions', mePerms.data);

  section('UPLOAD CONTRACT');
  const customer = await req('/customers', {
    method: 'POST',
    token,
    body: {
      firstName: 'Upload',
      lastName: 'Contract',
      email: `${rand('upload.customer')}@test.com`,
      phone: '7111222333'
    }
  });
  expect(customer.status, 201, 'Create customer for upload test', customer.data);
  const customerId = customer.data?.data?.customer?._id;
  if (!customerId) {
    fail('Create customer did not return customer id', customer.data);
    section('SUMMARY');
    const total = passCount + failCount;
    const color = failCount > 0 ? c.yellow : c.green;
    log(`  Total: ${total} | ✅ Passed: ${passCount} | ❌ Failed: ${failCount}`, color);
    process.exit(1);
  }

  const form = new FormData();
  const pngBytes = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7Z4XQAAAAASUVORK5CYII=',
    'base64'
  );
  form.append('file', new Blob([pngBytes], { type: 'image/png' }), 'contract.png');
  form.append('category', 'passport');
  form.append('linkedModel', 'Customer');
  form.append('linkedId', customerId);

  const upload = await req('/uploads/single', {
    method: 'POST',
    token,
    body: form
  });
  expect(upload.status, 201, 'Upload with linkedModel/linkedId succeeds', upload.data);
  if (upload.data?.data?.document?._id) pass('Upload response contains data.document');
  else fail('Upload response missing data.document', upload.data);

  section('BOOKINGS FILTER CONTRACT');
  const booking = await req('/bookings', {
    method: 'POST',
    token,
    body: {
      customer: customerId,
      bookingType: 'package',
      tripDetails: {
        title: 'Frontend Filter Smoke',
        destination: 'Paris',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 86400000).toISOString()
      },
      pricing: { basePrice: 1000, taxes: 100, totalAmount: 1100 }
    }
  });
  expect(booking.status, 201, 'Create booking for filter test', booking.data);
  if (booking.status !== 201) {
    section('SUMMARY');
    const total = passCount + failCount;
    const color = failCount > 0 ? c.yellow : c.green;
    log(`  Total: ${total} | ✅ Passed: ${passCount} | ❌ Failed: ${failCount}`, color);
    process.exit(1);
  }

  const from = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const to = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const bookingsFiltered = await req(`/bookings?startDateFrom=${encodeURIComponent(from)}&startDateTo=${encodeURIComponent(to)}`, {
    token
  });
  expect(bookingsFiltered.status, 200, 'Bookings supports startDateFrom/startDateTo params', bookingsFiltered.data);
  if (Array.isArray(bookingsFiltered.data?.data) && bookingsFiltered.data?.pagination) {
    pass('Bookings response follows paginated envelope (data + pagination)');
  } else {
    fail('Bookings response does not follow expected paginated envelope', bookingsFiltered.data);
  }

  section('LEADS FILTER CONTRACT');
  const lead = await req('/leads', {
    method: 'POST',
    token,
    body: {
      contactInfo: {
        firstName: 'Lead',
        lastName: 'Filter',
        email: `${rand('lead.filter')}@test.com`,
        phone: '7222333444'
      },
      source: 'website'
    }
  });
  expect(lead.status, 201, 'Create lead for filter test', lead.data);
  if (lead.status !== 201) {
    section('SUMMARY');
    const total = passCount + failCount;
    const color = failCount > 0 ? c.yellow : c.green;
    log(`  Total: ${total} | ✅ Passed: ${passCount} | ❌ Failed: ${failCount}`, color);
    process.exit(1);
  }

  const leadsFiltered = await req(`/leads?createdFrom=${encodeURIComponent(from)}&createdTo=${encodeURIComponent(to)}`, {
    token
  });
  expect(leadsFiltered.status, 200, 'Leads supports createdFrom/createdTo params', leadsFiltered.data);
  if (Array.isArray(leadsFiltered.data?.data) && leadsFiltered.data?.pagination) {
    pass('Leads response follows paginated envelope (data + pagination)');
  } else {
    fail('Leads response does not follow expected paginated envelope', leadsFiltered.data);
  }

  section('SUMMARY');
  const total = passCount + failCount;
  const color = failCount > 0 ? c.yellow : c.green;
  log(`  Total: ${total} | ✅ Passed: ${passCount} | ❌ Failed: ${failCount}`, color);
  process.exit(failCount > 0 ? 1 : 0);
}

run().catch((err) => {
  fail('Frontend smoke suite crashed', { message: err.message, stack: err.stack });
  process.exit(1);
});
