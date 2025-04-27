const fetch = require('node-fetch');
const fs = require('fs');

const BASE_URL = 'http://localhost:3000'; // Your server base URL

async function seedUsers() {
  console.log('🔑 Logging in as Admin...');

  // Step 1: Login as Admin
  const loginResp = await fetch(`${BASE_URL}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@blockchain.com',
      password: 'admin123'
    }),
  });

  const cookies = loginResp.headers.raw()['set-cookie']; // Get session cookies
  if (!cookies) {
    console.error('❌ Admin login failed');
    return;
  }

  console.log('✅ Admin login success. Seeding users...');

  // Step 2: Register users
  for (let i = 1; i <= 1200; i++) {
    const userId = `user_${i}`;
    const email = `user${i}@test.com`;
    const name = `Test User ${i}`;
    const phone = `9000000${String(i).padStart(3, "0")}`;
    const password = 'password123';

    const res = await fetch(`${BASE_URL}/api/registerUser`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies.join(';')
      },
      body: JSON.stringify({
        userId,
        name,
        email,
        phone,
        isAnonymous: false,
        password,
        role: 'user'
      }),
    });

    const data = await res.json();
    if (!data.success) {
      console.error(`❌ Failed to register ${userId}:`, data.message);
    } else {
      console.log(`✅ Registered ${userId}`);
    }
}


  console.log('🎉 All users registered successfully!');
}

seedUsers().catch(err => {
  console.error('❌ Seeding error:', err);
});
