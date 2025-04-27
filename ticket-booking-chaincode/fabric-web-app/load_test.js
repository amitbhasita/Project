const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

async function simulateBookings() {
  console.log('🔑 Logging in as Admin to fetch schedules...');

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

  // Get all available schedules
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

  console.log('🎯 Starting user bookings...');

  // Book tickets randomly for 1000 users
  for (let i = 1; i <= 5; i++) {
    const userEmail = `user${i}@test.com`;
    const userPassword = 'password123';

    try {
      // Login user
      const loginResp = await fetch(`${BASE_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail, password: userPassword }),
      });

      const userCookies = loginResp.headers.raw()['set-cookie'];
      if (!userCookies) {
        console.error(`❌ Login failed for user${i}`);
        continue;
      }

      // Randomly pick 2–4 bookings per user
      const bookingsToMake = Math.floor(Math.random() * 3) + 2;

      for (let b = 0; b < bookingsToMake; b++) {
        const schedule = schedules[Math.floor(Math.random() * schedules.length)];
        const randomVacantSeat = schedule.vacantSeatNumbers[Math.floor(Math.random() * schedule.vacantSeatNumbers.length)];

        if (!randomVacantSeat) {
          console.warn(`⚠️ No seat available for schedule ${schedule.id}`);
          continue;
        }

        const bookingId = `book_${userEmail}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

        await fetch(`${BASE_URL}/api/bookTicket`, {
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

        console.log(`✅ User ${userEmail} booked Seat ${randomVacantSeat} on ${schedule.id}`);
      }

    } catch (err) {
      console.error(`❌ Error booking for user${i}:`, err.message);
    }
  }

  console.log('🎉 Booking simulation completed!');
}

simulateBookings().catch(err => {
  console.error('❌ Booking simulation error:', err);
});
