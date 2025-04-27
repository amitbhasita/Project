const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

async function seedProvidersAndSchedules() {
  console.log('🔑 Logging in as Admin...');

  const loginResp = await fetch(`${BASE_URL}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@blockchain.com',
      password: 'admin123'
    }),
  });

  const cookies = loginResp.headers.raw()['set-cookie'];
  if (!cookies) {
    console.error('❌ Admin login failed');
    return;
  }

  console.log('✅ Admin login success. Seeding providers, transports, schedules...');

  const transportTypes = ['bus', 'train', 'plane'];

  // 1️⃣ Register 5 Providers
  for (let p = 1; p <= 5; p++) {
    const providerId = `prov_${p}`;
    const providerEmail = `prov${p}@test.com`;
    const providerPassword = 'provider123';

    // Create Provider
    const provRes = await fetch(`${BASE_URL}/api/registerProvider`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies.join(';')
      },
      body: JSON.stringify({
        id: providerId,
        name: `Provider ${p}`,
        ownerName: `Owner ${p}`,
        email: providerEmail,
        phone: `8000000${p}`,
        rating: 5,
        isPublic: true,
        password: providerPassword
      }),
    });

    const provData = await provRes.json();
    if (!provData.success) {
      console.error(`❌ Failed to register Provider ${providerId}:`, provData.message);
      continue;
    }
    console.log(`✅ Provider registered: ${providerId}`);

    // 2️⃣ For each Provider, add 3 Transports (bus, train, plane)
    for (const type of transportTypes) {
      const transportId = `trans_${providerId}_${type}`;

      const transRes = await fetch(`${BASE_URL}/api/addTransport`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookies.join(';')
        },
        body: JSON.stringify({
          id: transportId,
          providerId: providerId,
          type: type
        }),
      });

      const transData = await transRes.json();
      if (!transData.success) {
        console.error(`❌ Failed to add Transport ${transportId}:`, transData.message);
        continue;
      }
      console.log(`✅ Transport added: ${transportId}`);

      // 3️⃣ For each Transport, add 10 Schedules
      for (let s = 1; s <= 10; s++) {
        const scheduleId = `sch_${providerId}_${type}_${s}`;
        const departureDate = new Date();
        departureDate.setDate(departureDate.getDate() + s);
        const departure = departureDate.toISOString();

        const schedRes = await fetch(`${BASE_URL}/api/createSchedule`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': cookies.join(';')
          },
          body: JSON.stringify({
            id: scheduleId,
            transportId: transportId,
            departure: departure,
            source: 'Kanpur',
            destination: 'Lucknow',
            totalSeats: 40,
            basePrice: 10 // 🔥 Low price
          }),
        });

        const schedData = await schedRes.json();
        if (!schedData.success) {
          console.error(`❌ Failed to create Schedule ${scheduleId}:`, schedData.message);
        } else {
          console.log(`✅ Schedule created: ${scheduleId}`);
        }
      }
    }
  }

  console.log('🎉 Providers, Transports and Schedules seeding complete!');
}

seedProvidersAndSchedules().catch(err => {
  console.error('❌ Seeding error:', err);
});
