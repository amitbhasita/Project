const fetch = require('node-fetch');
const fs = require('fs');

const BASE_URL = 'http://localhost:3000'; // Your server base URL
const BATCH_SIZE = 20; // Number of users to process in each batch
const TOTAL_USERS = 1200;

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

  // Process users in batches
  for (let batchStart = 1; batchStart <= TOTAL_USERS; batchStart += BATCH_SIZE) {
    const batchEnd = Math.min(batchStart + BATCH_SIZE - 1, TOTAL_USERS);
    console.log(`🔄 Processing batch ${batchStart} to ${batchEnd}...`);

    // Create an array of promises for the current batch
    const batchPromises = [];
    for (let i = batchStart; i <= batchEnd; i++) {
      batchPromises.push(registerUser(i, cookies));
    }

    // Wait for the entire batch to complete
    const batchResults = await Promise.allSettled(batchPromises);

    // Log results for the batch
    batchResults.forEach((result, index) => {
      const userNum = batchStart + index;
      if (result.status === 'fulfilled' && result.value.success) {
        console.log(`✅ Registered user_${userNum}`);
      } else {
        const error = result.status === 'rejected' ? result.reason : result.value.message;
        console.error(`❌ Failed to register user_${userNum}:`, error);
      }
    });

    console.log(`✅ Batch ${batchStart}-${batchEnd} completed`);
  }

  console.log('🎉 All users registered successfully!');
}

async function registerUser(i, cookies) {
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

  return await res.json();
}

seedUsers().catch(err => {
  console.error('❌ Seeding error:', err);
});