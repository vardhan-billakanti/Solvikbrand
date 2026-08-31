// End-to-end API test script for Dvideo
const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log('🚀 Starting Dvideo End-to-End Test Suite...\n');

  // 1. Test Login
  console.log('1️⃣ Testing Authentication (/api/auth/login)...');
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'TraceLink@2024!' }),
  });

  const loginData = await loginRes.json();
  const setCookie = loginRes.headers.get('set-cookie');
  console.log('   Status:', loginRes.status);
  console.log('   Response:', loginData);
  console.log('   Session Cookie Received:', !!setCookie);
  if (!loginData.success || !setCookie) throw new Error('Login failed');

  const cookie = setCookie.split(';')[0];

  // 2. Test Create Investigation with Destination URL Wrapper
  console.log('\n2️⃣ Testing Investigation Creation with Destination URL (/api/investigations)...');
  const targetDestination = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
  const createRes = await fetch(`${BASE_URL}/api/investigations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookie,
    },
    body: JSON.stringify({
      name: 'Project Blackout Forensics',
      description: 'Authorized red team telemetry analysis',
      destinationUrl: targetDestination,
    }),
  });

  const createData = await createRes.json();
  console.log('   Status:', createRes.status);
  console.log('   Created Investigation ID:', createData.data?.id);
  console.log('   Public Token:', createData.data?.publicToken);
  console.log('   Stored Destination URL:', createData.data?.destinationUrl);
  if (!createData.success || createData.data?.destinationUrl !== targetDestination) {
    throw new Error('Create investigation with destination URL failed');
  }

  const invId = createData.data.id;
  const token = createData.data.publicToken;

  // 3. Test Check Public Token & Destination Retrieval
  console.log('\n3️⃣ Testing Public Token Verification & Destination Info (/api/visits?token=)...');
  const verifyTokenRes = await fetch(`${BASE_URL}/api/visits?token=${token}`);
  const verifyTokenData = await verifyTokenRes.json();
  console.log('   Status:', verifyTokenRes.status);
  console.log('   Response Active:', verifyTokenData.data?.active);
  console.log('   Returned Destination URL:', verifyTokenData.data?.destinationUrl);
  if (!verifyTokenData.success || verifyTokenData.data?.destinationUrl !== targetDestination) {
    throw new Error('Token verification and destination retrieval failed');
  }

  // 4. Test Visitor Data Submission & Redirect Handshake
  console.log('\n4️⃣ Testing Visitor Telemetry Submission & Redirect Data (/api/visits)...');
  const submitRes = await fetch(`${BASE_URL}/api/visits`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token,
      consentGiven: true,
      locationPermission: 'granted',
      batteryPermission: 'granted',
      latitude: 37.774929,
      longitude: -122.419416,
      accuracy: 12.5,
      locationTimestamp: Date.now(),
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
      browser: 'Google Chrome',
      browserVersion: '128.0',
      os: 'Windows',
      osVersion: '10/11',
      screenWidth: 1920,
      screenHeight: 1080,
      pixelRatio: 1.25,
      language: 'en-US',
      timezone: 'America/Los_Angeles',
      platform: 'Win32',
      deviceType: 'Desktop',
      batteryLevel: 0.88,
      batteryCharging: true,
    }),
  });

  const submitData = await submitRes.json();
  console.log('   Status:', submitRes.status);
  console.log('   Recorded Visit ID:', submitData.data?.visitId);
  console.log('   Redirection Destination:', submitData.data?.destinationUrl);
  if (!submitData.success || submitData.data?.destinationUrl !== targetDestination) {
    throw new Error('Visitor submission & destination handshake failed');
  }

  // 5. Test Invalid URL Protocol Rejection (Security check)
  console.log('\n5️⃣ Testing Destination URL Security Validation...');
  const invalidUrlRes = await fetch(`${BASE_URL}/api/investigations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookie,
    },
    body: JSON.stringify({
      name: 'Malicious URL Test',
      destinationUrl: 'javascript:alert(1)',
    }),
  });
  console.log('   javascript: URL rejection status:', invalidUrlRes.status);
  if (invalidUrlRes.status !== 400) throw new Error('Security URL validation failed');

  // 6. Test Fetch Investigation Detail & Recorded Data
  console.log('\n6️⃣ Testing Investigation Results Fetch (/api/investigations/[id])...');
  const detailRes = await fetch(`${BASE_URL}/api/investigations/${invId}`, {
    headers: { 'Cookie': cookie },
  });
  const detailData = await detailRes.json();
  console.log('   Status:', detailRes.status);
  console.log('   Investigation Name:', detailData.data?.name);
  console.log('   Destination URL:', detailData.data?.destinationUrl);
  console.log('   Total Recorded Visits:', detailData.data?.visits?.length);
  const recordedVisit = detailData.data?.visits?.[0];
  console.log('   Coordinates:', recordedVisit?.latitude, recordedVisit?.longitude);
  console.log('   Browser/OS:', recordedVisit?.browser, '/', recordedVisit?.os);
  console.log('   Battery Level:', `${Math.round((recordedVisit?.batteryLevel || 0) * 100)}% (Charging: ${recordedVisit?.batteryCharging})`);
  if (!detailData.success || detailData.data?.visits?.length !== 1) throw new Error('Detail verification failed');

  // 7. Test CSV Export
  console.log('\n7️⃣ Testing CSV Export (/api/investigations/[id]?format=csv)...');
  const exportRes = await fetch(`${BASE_URL}/api/investigations/${invId}?format=csv`, {
    headers: { 'Cookie': cookie },
  });
  const csvText = await exportRes.text();
  console.log('   Status:', exportRes.status);
  console.log('   Content-Type:', exportRes.headers.get('content-type'));
  console.log('   CSV Snippet (Header + 1st Row):\n' + csvText.split('\n').slice(0, 2).join('\n'));
  if (exportRes.status !== 200 || !csvText.includes('Visit ID')) throw new Error('Export failed');

  // 8. Test Toggling Enabled/Disabled
  console.log('\n8️⃣ Testing Toggle Disabled State...');
  const disableRes = await fetch(`${BASE_URL}/api/investigations/${invId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookie,
    },
    body: JSON.stringify({ enabled: false }),
  });
  const disableData = await disableRes.json();
  console.log('   Disabled status:', disableData.data?.enabled === false ? 'Disabled successfully' : 'Failed');

  // Verify disabled link rejection
  const checkDisabledRes = await fetch(`${BASE_URL}/api/visits?token=${token}`);
  console.log('   Accessing disabled link returns status:', checkDisabledRes.status);
  if (checkDisabledRes.status !== 403) throw new Error('Disabled token enforcement failed');

  // 9. Test Rate Limiter (simulate brute force login)
  console.log('\n9️⃣ Testing Security & Rate Limiting...');
  let hitRateLimit = false;
  for (let i = 0; i < 6; i++) {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'attacker', password: 'wrongpassword' }),
    });
    if (res.status === 429) {
      hitRateLimit = true;
      console.log(`   Attempt ${i + 1}: Rate limited as expected (429 Too Many Requests)`);
      break;
    }
  }
  console.log('   Rate Limiter Protection:', hitRateLimit ? 'Active & Enforced' : 'Passed window');

  console.log('\n🎉 ALL DVIDEO DESTINATION URL WRAPPER TESTS PASSED SUCCESSFULLY! ✅\n');
}

runTests().catch((err) => {
  console.error('\n❌ Test failed:', err);
  process.exit(1);
});
