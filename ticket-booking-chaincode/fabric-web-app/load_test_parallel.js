const fetch = require('node-fetch');
const BASE_URL = 'http://localhost:3000';

// Configuration
const TOTAL_USERS = 1200;
const BATCH_SIZE = 2; // Process 50 users at a time
const DELAY_BETWEEN_BATCHES_MS = 1000; // 5 seconds between batches
const MAX_BOOKINGS_PER_USER = 4;
const MIN_BOOKINGS_PER_USER = 2;

async function simulateBookings() {
  console.log('🔑 Logging in as Admin to fetch schedules...');

  // Admin login to fetch schedules
  const loginAdminResp = await fetch(`${BASE_URL}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@blockchain.com',
      password: 'admin123'
    }),
  });

  const adminCookies = loginAdminResp.headers.raw()['set-cookie'];
  if (!adminCookies) {
    console.error('❌ Admin login failed');
    return;
  }

  // Fetch available schedules
  const scheduleResp = await fetch(`${BASE_URL}/api/getAvailableSchedules?source=kanpur&destination=lucknow`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': adminCookies.join(';')
    },
  });

  const scheduleData = await scheduleResp.json();
  if (!scheduleData.success) {
    console.error('❌ Failed to fetch schedules:', scheduleData.message);
    return;
  }

  const schedules = scheduleData.data;
  console.log(`✅ Fetched ${schedules.length} schedules`);

  console.log('🎯 Starting batched user bookings...');

  // Helper to login and book tickets for one user
  async function loginAndBookUser(i) {
    const userEmail = `user${i}@test.com`;
    const userPassword = 'password123';

    try {
      const loginResp = await fetch(`${BASE_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail, password: userPassword }),
      });

      const userCookies = loginResp.headers.raw()['set-cookie'];
      if (!userCookies) {
        console.error(`❌ Login failed for user${i}`);
        return;
      }

      // Random number of bookings per user
      const bookingsToMake = Math.floor(Math.random() * (MAX_BOOKINGS_PER_USER - MIN_BOOKINGS_PER_USER + 1)) + MIN_BOOKINGS_PER_USER;
      const successfulBookings = [];

      for (let b = 0; b < bookingsToMake; b++) {
        const schedule = schedules[Math.floor(Math.random() * schedules.length)];
        const vacantSeats = schedule.vacantSeatNumbers || [];

        const randomVacantSeat = vacantSeats[Math.floor(Math.random() * vacantSeats.length)];
        if (!randomVacantSeat) {
          console.warn(`⚠️ No seat available for schedule ${schedule.id}`);
          continue;
        }

        const bookingId = `book_${userEmail}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

        const bookingResp = await fetch(`${BASE_URL}/api/bookTicket`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': userCookies.join(';')
          },
          body: JSON.stringify({
            bookingId,
            userId: `user_${i}`,
            scheduleId: schedule.id,
            seatNumber: randomVacantSeat
          }),
        });

        const bookingResult = await bookingResp.json();
        if (bookingResult.success) {
          successfulBookings.push({ seat: randomVacantSeat, schedule: schedule.id });
        } else {
          console.error(`❌ Booking failed for user${i}:`, bookingResult.message);
        }
      }

      if (successfulBookings.length > 0) {
        console.log(`✅ User ${userEmail} made ${successfulBookings.length} bookings:`);
        successfulBookings.forEach(booking => {
          console.log(`   - Seat ${booking.seat} on ${booking.schedule}`);
        });
      }

    } catch (err) {
      console.error(`❌ Error booking for user${i}:`, err.message);
    }
  }

  // Process users in batches
  for (let batchStart = 1; batchStart <= TOTAL_USERS; batchStart += BATCH_SIZE) {
    const batchEnd = Math.min(batchStart + BATCH_SIZE - 1, TOTAL_USERS);
    console.log(`\n🚀 Processing batch ${batchStart} to ${batchEnd}...`);

    const batchPromises = [];
    for (let i = batchStart; i <= batchEnd; i++) {
      batchPromises.push(loginAndBookUser(i));
    }

    await Promise.all(batchPromises);
    
    if (batchEnd < TOTAL_USERS) {
      console.log(`⏳ Waiting ${DELAY_BETWEEN_BATCHES_MS/1000} seconds before next batch...`);
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES_MS));
    }
  }

  console.log('\n🎉 All batches completed! Booking simulation finished.');
}

simulateBookings().catch(err => {
  console.error('❌ Booking simulation error:', err);
});