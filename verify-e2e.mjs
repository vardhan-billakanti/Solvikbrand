import dotenv from 'dotenv';
dotenv.config();

// End-to-end API test script for SolvikBrand
const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log('🚀 Starting SolvikBrand End-to-End Test Suite...\n');

  const username = process.env.OWNER_USERNAME || 'admin';
  const password = process.env.OWNER_PASSWORD;

  if (!password) {
    throw new Error('OWNER_PASSWORD environment variable required for test run');
  }

  // 1. Test Authentication
  console.log('1️⃣ Testing Authentication (/api/auth/login)...');
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
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
  console.log('   Investigation ID:', createData.data?.id);
  console.log('   Public Token:', createData.data?.publicToken);
  console.log('   Destination URL:', createData.data?.destinationUrl);
  console.log('   Public URL:', createData.data?.publicUrl);
  if (!createData.success || !createData.data?.publicToken) throw new Error('Create failed');
  if (createData.data?.destinationUrl !== targetDestination) throw new Error('Destination URL mismatch');

  const token = createData.data.publicToken;
  const invId = createData.data.id;

  // 3. Test Public Token Resolution (/api/visits)
  console.log('\n3️⃣ Testing Public Token Verification & Metadata Retrieval (/api/visits)...');
  const checkRes = await fetch(`${BASE_URL}/api/visits?token=${encodeURIComponent(token)}`);
  const checkData = await checkRes.json();
  console.log('   Status:', checkRes.status);
  console.log('   Investigation Name:', checkData.data?.name);
  console.log('   Returned Destination URL:', checkData.data?.destinationUrl);
  if (!checkData.success || checkData.data?.destinationUrl !== targetDestination) {
    throw new Error('Token verification / destination URL retrieval failed');
  }

  // 4. Test Telemetry Submission
  console.log('\n4️⃣ Testing Zero-Prompt Telemetry Submission (/api/visits)...');
  const visitPayload = {
    token,
    consentGiven: true,
    locationPermission: 'not_prompted',
    batteryPermission: 'granted',
    batteryLevel: 0.88,
    batteryCharging: true,
    deviceInfo: {
      browser: 'Chrome',
      browserVersion: '122.0.0.0',
      os: 'Windows',
      osVersion: '11',
      deviceType: 'desktop',
      platform: 'Win32',
      screenWidth: 1920,
      screenHeight: 1080,
      pixelRatio: 1.25,
      language: 'en-US',
      timezone: 'America/New_York',
    },
  };

  const submitRes = await fetch(`${BASE_URL}/api/visits`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(visitPayload),
  });

  const submitData = await submitRes.json();
  console.log('   Status:', submitRes.status);
  console.log('   Submission Response:', submitData);
  console.log('   Returned Destination URL for Client Redirect:', submitData.data?.destinationUrl);
  if (!submitData.success || submitData.data?.destinationUrl !== targetDestination) {
    throw new Error('Telemetry submission failed');
  }

  // 5. Test Owner Dashboard Data & Verify Telemetry Recorded
  console.log('\n5️⃣ Testing Owner Investigation Detail Query (/api/investigations/[id])...');
  const detailRes = await fetch(`${BASE_URL}/api/investigations/${invId}`, {
    headers: { 'Cookie': cookie },
  });
  const detailData = await detailRes.json();
  console.log('   Status:', detailRes.status);
  console.log('   Total Visits Recorded:', detailData.data?._count?.visits);
  console.log('   Latest Visit OS:', detailData.data?.visits?.[0]?.os);
  console.log('   Latest Visit Browser:', detailData.data?.visits?.[0]?.browser);
  console.log('   Latest Visit Battery Level:', detailData.data?.visits?.[0]?.batteryLevel);
  console.log('   Public URL on Investigation:', detailData.data?.publicUrl);
  if (detailData.data?._count?.visits < 1) throw new Error('Telemetry not stored in DB');

  // 6. Test CSV Export Header
  console.log('\n6️⃣ Testing CSV Forensic Export Header (/api/investigations/[id]?format=csv)...');
  const exportRes = await fetch(`${BASE_URL}/api/investigations/${invId}?format=csv`, {
    headers: { 'Cookie': cookie },
  });
  const contentDisp = exportRes.headers.get('content-disposition');
  console.log('   Status:', exportRes.status);
  console.log('   Content-Disposition:', contentDisp);
  if (!contentDisp || !contentDisp.includes('solvikbrand-')) throw new Error('CSV Export Header failed');

  console.log('\n🎉 ALL SOLVIKBRAND TESTS PASSED SUCCESSFULLY! ✅\n');
}

runTests().catch((err) => {
  console.error('\n❌ Test failed:', err);
  process.exit(1);
});
