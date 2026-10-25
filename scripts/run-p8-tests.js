const http = require('http');

function request(options, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      const cookies = res.headers['set-cookie'] || [];
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data), cookies, headers: res.headers }); }
        catch(e) { resolve({ status: res.statusCode, body: data, cookies, headers: res.headers }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function run() {
  const results = [];
  let sessionCookie = '';

  // P8-001: GET /health
  try {
    const r = await request({ hostname: 'localhost', port: 4000, path: '/health', method: 'GET' });
    const tests = [
      { name: 'P8-001: Health check tra 200', pass: r.status === 200 },
      { name: 'P8-001: Response co truong status OK', pass: !!(r.body && r.body.status) }
    ];
    results.push({ req: 'P8-001: GET /health', status: r.status, tests, body: r.body });
  } catch(e) { results.push({ req: 'P8-001: GET /health', error: e.message }); }

  // P8-002: POST /api/auth/login (admin hop le) - password empty => will fail validation
  const loginBody002 = JSON.stringify({ username: 'admin', password: '', portal: 'admin' });
  try {
    const r = await request({ hostname: 'localhost', port: 4000, path: '/api/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(loginBody002) } }, loginBody002);
    const hasCookie = r.cookies.length > 0;
    if (r.cookies.length > 0) sessionCookie = r.cookies.map(c => c.split(';')[0]).join('; ');
    const tests = [
      { name: 'P8-002: Login admin tra 2xx', pass: [200,201].includes(r.status) },
      { name: 'P8-002: Khong tra truong nhay cam', pass: r.status >= 200 && r.status < 300 ? !JSON.stringify(r.body).match(/passwordhash|accesstoken|refreshtoken|authorization/i) : true },
      { name: 'P8-002: Cookie phien duoc dat', pass: hasCookie }
    ];
    results.push({ req: 'P8-002: POST /api/auth/login (admin hop le)', status: r.status, tests, body: r.body, note: 'adminPassword is empty in env - VALIDATION_ERROR expected' });
  } catch(e) { results.push({ req: 'P8-002', error: e.message }); }

  // P8-002b: sai mat khau
  const loginBody002b = JSON.stringify({ username: 'admin', password: 'SaiMatKhau@123', portal: 'admin' });
  try {
    const r = await request({ hostname: 'localhost', port: 4000, path: '/api/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(loginBody002b) } }, loginBody002b);
    const tests = [
      { name: 'P8-002b: Login sai mat khau tra 401', pass: r.status === 401 },
      { name: 'P8-002b: Response co error object', pass: !!(r.body && r.body.error) }
    ];
    results.push({ req: 'P8-002b: POST /api/auth/login (sai mat khau)', status: r.status, tests, body: r.body });
  } catch(e) { results.push({ req: 'P8-002b', error: e.message }); }

  // P8-002c: portal sai vai tro (staff login as admin)
  const loginBody002c = JSON.stringify({ username: 'staff01', password: '', portal: 'admin' });
  try {
    const r = await request({ hostname: 'localhost', port: 4000, path: '/api/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(loginBody002c) } }, loginBody002c);
    const tests = [
      { name: 'P8-002c: Login portal sai vai tro tra 403', pass: r.status === 403 }
    ];
    results.push({ req: 'P8-002c: POST /api/auth/login (portal sai vai tro)', status: r.status, tests, body: r.body, note: 'staffPassword is empty in env' });
  } catch(e) { results.push({ req: 'P8-002c', error: e.message }); }

  // P8-003: GET /api/auth/me (sau login) - use sessionCookie if any
  const headers003 = {};
  if (sessionCookie) headers003['Cookie'] = sessionCookie;
  try {
    const r = await request({ hostname: 'localhost', port: 4000, path: '/api/auth/me', method: 'GET', headers: headers003 });
    const body = r.body;
    const hasUsername = !!(body && (body.username || (body.data && body.data.username)));
    const noSensitive = !JSON.stringify(body).match(/passwordhash|accesstoken|refreshtoken/i);
    const tests = [
      { name: 'P8-003: GET /me sau login tra 2xx', pass: [200,201].includes(r.status) },
      { name: 'P8-003: Tra dung thong tin nguoi dung', pass: hasUsername },
      { name: 'P8-003: Khong tra truong nhay cam', pass: noSensitive }
    ];
    results.push({ req: 'P8-003: GET /api/auth/me (sau login)', status: r.status, tests, body: r.body, note: sessionCookie ? 'with cookie' : 'no cookie (login failed)' });
  } catch(e) { results.push({ req: 'P8-003', error: e.message }); }

  // P8-004: GET /api/auth/me (chua dang nhap) - no cookie
  try {
    const r = await request({ hostname: 'localhost', port: 4000, path: '/api/auth/me', method: 'GET' });
    const tests = [
      { name: 'P8-004: GET /me chua dang nhap tra 401', pass: r.status === 401 }
    ];
    results.push({ req: 'P8-004: GET /api/auth/me (chua dang nhap)', status: r.status, tests, body: r.body });
  } catch(e) { results.push({ req: 'P8-004', error: e.message }); }

  // P8-005: POST /api/auth/login (staff)
  const loginBody005 = JSON.stringify({ username: 'staff01', password: '', portal: 'staff' });
  try {
    const r = await request({ hostname: 'localhost', port: 4000, path: '/api/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(loginBody005) } }, loginBody005);
    const tests = [
      { name: 'P8-005: Login staff tra 2xx', pass: [200,201].includes(r.status) }
    ];
    results.push({ req: 'P8-005: POST /api/auth/login (staff)', status: r.status, tests, body: r.body, note: 'staffPassword is empty in env' });
  } catch(e) { results.push({ req: 'P8-005', error: e.message }); }

  // P8-006: POST /api/auth/login (teacher A)
  const loginBody006 = JSON.stringify({ username: '', password: '', portal: 'teacher' });
  try {
    const r = await request({ hostname: 'localhost', port: 4000, path: '/api/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(loginBody006) } }, loginBody006);
    const tests = [
      { name: 'P8-006: Login teacher A tra 2xx', pass: [200,201].includes(r.status) }
    ];
    results.push({ req: 'P8-006: POST /api/auth/login (teacher A)', status: r.status, tests, body: r.body, note: 'teacherAUsername and teacherAPassword are empty in env' });
  } catch(e) { results.push({ req: 'P8-006', error: e.message }); }

  // P8-007: POST /api/auth/login (student A)
  const loginBody007 = JSON.stringify({ username: '', password: '', portal: 'student' });
  try {
    const r = await request({ hostname: 'localhost', port: 4000, path: '/api/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(loginBody007) } }, loginBody007);
    const tests = [
      { name: 'P8-007: Login student A tra 2xx', pass: [200,201].includes(r.status) }
    ];
    results.push({ req: 'P8-007: POST /api/auth/login (student A)', status: r.status, tests, body: r.body, note: 'studentAUsername and studentAPassword are empty in env' });
  } catch(e) { results.push({ req: 'P8-007', error: e.message }); }

  // P8-008: POST /api/auth/logout
  const logoutHeaders = { 'Content-Type': 'application/json', 'Content-Length': '0' };
  if (sessionCookie) logoutHeaders['Cookie'] = sessionCookie;
  try {
    const r = await request({ hostname: 'localhost', port: 4000, path: '/api/auth/logout', method: 'POST', headers: logoutHeaders });
    const tests = [
      { name: 'P8-008: Logout tra 2xx hoac 204', pass: [200,204].includes(r.status) }
    ];
    results.push({ req: 'P8-008: POST /api/auth/logout', status: r.status, tests, body: r.body });
  } catch(e) { results.push({ req: 'P8-008', error: e.message }); }

  console.log(JSON.stringify(results, null, 2));
}

run().catch(console.error);
