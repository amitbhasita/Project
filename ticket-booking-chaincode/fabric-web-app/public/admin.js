 function generateFixedId(prefix = '') {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const targetLength = 64;
    const remainingLength = targetLength - prefix.length;

    if (remainingLength <= 0) {
        throw new Error(`Prefix too long! Must be less than 64 characters.`);
    }

    let id = prefix;
    for (let i = 0; i < remainingLength; i++) {
        id += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return id;
}

async function withButtonProcessing(buttonId, actionFn) {
  const btn = document.getElementById(buttonId);
  const originalText = btn.textContent;

  btn.disabled = true;
  btn.textContent = 'Processing...';

  try {
    await actionFn();
  } catch (err) {
    console.error('❌ Error during action:', err);
    alert('❌ Something went wrong.');
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
}


function renderJsonAsTable(obj, containerId) {
  const container = document.getElementById(containerId);
  const table = document.createElement('table');
  table.style.borderCollapse = 'collapse';
  table.style.width = '100%';
  table.style.marginTop = '10px';

  for (const [key, value] of Object.entries(obj)) {
    const row = table.insertRow();
    const cell1 = row.insertCell();
    const cell2 = row.insertCell();

    cell1.textContent = key;
    cell2.textContent = typeof value === 'object' ? JSON.stringify(value) : value;

    // Style
    cell1.style.padding = '8px';
    cell2.style.padding = '8px';
    cell1.style.fontWeight = 'bold';
    row.style.borderBottom = '1px solid #ccc';
  }

  container.innerHTML = ''; // Clear previous
  container.appendChild(table);
}


function renderUserTable() {
  const tbody = document.querySelector('#allUsersTable tbody');
  const search = document.getElementById('userSearch').value.trim().toLowerCase();
  tbody.innerHTML = '';

  const filtered = (window.allUsers || []).filter(user => {
    return !search ||
      user.name.toLowerCase().includes(search) ||
      user.email.toLowerCase().includes(search);
  });

  filtered.sort((a, b) => a.name.localeCompare(b.name)); // Sort by name

  for (const user of filtered) {
    const row = document.createElement('tr');
    row.style.cursor = "pointer";
    row.addEventListener('click', () => {
      const adjustField = document.getElementById('adjustUserId');
      const getField = document.getElementById('getUserId');

      if (adjustField) {
        adjustField.value = user.id;
      }
      if (getField) {
        getField.value = user.id;
      }

      showToast(`💡 Selected ${user.name} for wallet adjustment and user info.`);
    });

    row.innerHTML = `
      <td>${user.name}</td>
      <td>${user.email}</td>
    `;
    tbody.appendChild(row);
  }
}
function renderProviderTable() {
  const search = document.getElementById('providerSearch').value.trim().toLowerCase();
  const tbody = document.querySelector('#allProvidersTable tbody');
  tbody.innerHTML = "";

  const filtered = (window.allProviders || []).filter(p => {
    return !search ||
      p.name.toLowerCase().includes(search) ||
      p.transportTypes.toLowerCase().includes(search);
  });

  filtered.sort((a, b) => a.name.localeCompare(b.name));

  for (const p of filtered) {
    const row = document.createElement('tr');
    row.style.cursor = "pointer";
    row.addEventListener('click', () => {
      const getField = document.getElementById('getProviderId');
      if (getField) {
        getField.value = p.id;
        showToast(`💡 Selected ${p.name} for provider lookup.`);
      }
    });

    row.innerHTML = `
      <td>${p.name}</td>
      <td>${p.rating}</td>
      <td>${p.transportTypes || '-'}</td>
    `;
    tbody.appendChild(row);
  }
}

function showToast(message, isError = false) {
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.style.position = 'fixed';
  toast.style.bottom = '20px';
  toast.style.right = '20px';
  toast.style.backgroundColor = isError ? '#e74c3c' : '#2ecc71';
  toast.style.color = 'white';
  toast.style.padding = '10px 20px';
  toast.style.borderRadius = '5px';
  toast.style.boxShadow = '0 2px 6px rgba(0,0,0,0.2)';
  toast.style.zIndex = 1000;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}


function confirmBookingsNow() {
  fetch('/api/confirmPendingBookings', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json'
  }
})
  .then(res => res.json())
  .then(data => {
      if (data.success) {
        showToast(`✅ Confirmed: ${data.confirmed.length} bookings`);
        console.log(`✅ Confirmed: ${data.confirmed.length} bookings`);
    } else {
        showToast("❌ " + (data.message || "Confirmation failed"));
        console.log("❌ " + (data.message || "Confirmation failed"));

    }
})
  .catch(err => showToast("❌ Failed to confirm: " + err.message));
}

document.addEventListener('DOMContentLoaded', () => {

    const userIdField = document.getElementById('userId');
    userIdField.value = generateFixedId("user_");


    const providerIdField = document.getElementById('providerId');
    providerIdField.value = generateFixedId("prov_");


    async function loadAllUsers() {
      try {
        const response = await fetch('/api/getAllUsers', {
          credentials: 'include'
    });

        const result = await response.json();
        if (!result.success) throw new Error(result.message);

        window.allUsers = result.data;
        renderUserTable();
    } catch (err) {
        showToast("❌ Failed to load users: " + err.message);
    }
}

document.getElementById('forceConfirmBookingButton').addEventListener('click', async (e) => {
  withButtonProcessing('forceConfirmBookingButton', async () => {
  e.preventDefault();
  confirmBookingsNow();
});

});

document.getElementById('registerUserForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const userId = userIdField.value.trim();
  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  const phone = document.getElementById('phone').value.trim();
  const isAnonymous = document.getElementById('isAnonymous').checked;
  const password = document.getElementById('userPassword').value.trim();
  const role = 'user';

  // ✅ Validations
  const phoneRegex = /^[0-9]{10}$/;
  if (!phoneRegex.test(phone)) {
    showToast("❌ Phone number must be exactly 10 digits.");
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    showToast("❌ Please enter a valid email address.");
    return;
  }

  if (!name) {
    showToast("❌ Name is required.");
    return;
  }

  try {
    const response = await fetch('/api/registerUser', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ userId, name, email, phone, isAnonymous, role, password })
    });

    const result = await response.json();

    if (result.success) {
      showToast("✅ User registered successfully!");
      userIdField.value = generateFixedId("user_");
      document.getElementById('name').value = '';
      document.getElementById('email').value = '';
      document.getElementById('phone').value = '';
      document.getElementById('userPassword').value = 'default123';
      document.getElementById('isAnonymous').checked = false;
    } else {
      showToast("❌ " + result.message);
    }
  } catch (error) {
    showToast("❌ Error while registering: " + error.message);
  }
});

document.getElementById('getUserForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const userId = document.getElementById('getUserId').value;
    const response = await fetch(`/api/getUser/${userId}`, {
      credentials: 'include'
    });
    const result = await response.json();
    // document.getElementById('userData').textContent = JSON.stringify(result.data, null, 2);
    renderJsonAsTable(result.data, 'userData');  // reusing the renderJsonAsTable() function from earlier

  } catch (error) {
    document.getElementById('userData').textContent = 'Error: ' + error.message;
  }
});



document.getElementById('getUserBookingsForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const userId = document.getElementById('userBookingsId').value.trim();
  const tableBody = document.querySelector('#userBookingsTable tbody');
  const container = document.getElementById('userBookingsContainer');
  tableBody.innerHTML = '';
  container.style.display = 'none';

  try {
    const token = localStorage.getItem("token");

    const resp = await fetch(`/api/getBookingsByUser/${userId}`, {
      credentials: 'include',
      // headers: { 'Authorization': token }
    });
    const { data } = await resp.json();

    for (const booking of data) {
      let schedule = null;
      let transport = null;
      let provider = null;
      let formattedTime = '-';

      // Safe fetch for Schedule
      try {
        const schedResp = await fetch(`/api/getSchedule/${booking.scheduleId}`, {
          credentials: 'include',
          // headers: { 'Authorization': token }
        });
        const schedData = await schedResp.json();
        schedule = schedData.data;
      } catch (err) {
        schedule = null;
      }

      // Safe fetch for Transport
      if (schedule && schedule.transportId) {
        try {
          const transportResp = await fetch(`/api/getTransport/${schedule.transportId}`, {
            credentials: 'include',
            // headers: { 'Authorization': token }
          });
          const transportData = await transportResp.json();
          transport = transportData.data;
        } catch (err) {
          transport = null;
        }
      }

      // Safe fetch for Provider
      if (transport && transport.providerId) {
        try {
          const providerResp = await fetch(`/api/getProvider/${transport.providerId}`, {
            credentials: 'include',
            // headers: { 'Authorization': token }
          });
          const providerData = await providerResp.json();
          provider = providerData.data;
        } catch (err) {
          provider = null;
        }
      }

      // Format departure time safely
      if (schedule && schedule.departure) {
        const departure = new Date(schedule.departure);
        formattedTime = departure.toLocaleString('en-IN', {
          day: 'numeric', month: 'short', hour: 'numeric',
          minute: '2-digit', weekday: 'short'
        });
      }

      const now = new Date();
      const departureDate = schedule ? new Date(schedule.departure) : null;
      const isFuture = departureDate && departureDate > now;

      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${booking.id}</td>
        <td>${schedule ? schedule.source : 'Deleted'}</td>
        <td>${schedule ? schedule.destination : 'Deleted'}</td>
        <td>${formattedTime}</td>
        <td>${booking.seatNumber}</td>
        <td>₹${booking.pricePaid}</td>
        <td>${booking.status}</td>
        <td>${transport ? transport.type : 'Deleted'}</td>
        <td>${provider ? provider.name : 'Deleted'}</td>
        <td>${provider ? provider.rating + '⭐' : '-'}</td>
        <td>
          ${isFuture && booking.status === 'confirmed' ? `
              <button onclick="cancelBooking('${booking.id}')">Cancel</button>
              <button onclick="prefillModify('${booking.id}', '${schedule ? schedule.id : ''}')">Modify</button>
          ` : '—'}
        </td>
      `;
      tableBody.appendChild(row);
    }

    container.style.display = 'block';

  } catch (error) {
    showToast("❌ Failed to fetch bookings: " + error.message);
  }
});


document.getElementById('registerProviderForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const id = providerIdField.value.trim();
  const name = document.getElementById('providerName').value.trim();
  const ownerName = document.getElementById('providerOwnerName').value.trim();
  const email = document.getElementById('providerEmail').value.trim();
  const phone = document.getElementById('providerPhone').value.trim();
  const password = document.getElementById('providerPassword').value.trim();
  const rating = parseInt(document.getElementById('providerRating').value.trim());
  const isPublic = document.getElementById('providerPublic').checked;

  // ✅ Validations
  if (!name || !ownerName || !email || !phone || !password) {
    showToast("❌ All fields are required.");
    return;
  }

  if (isNaN(rating) || rating < 1 || rating > 5) {
    showToast("❌ Rating must be a number between 1 and 5.");
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    showToast("❌ Please enter a valid email address.");
    return;
  }

  const phoneRegex = /^[0-9]{10}$/;
  if (!phoneRegex.test(phone)) {
    showToast("❌ Phone number must be exactly 10 digits.");
    return;
  }

  try {
    const response = await fetch('/api/registerProvider', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        id, name, ownerName, email, phone,
        rating, isPublic, password
      })
    });

    const result = await response.json();
    if (result.success) {
      showToast("✅ Provider registered successfully!");

      // Reset form
      providerIdField.value = generateFixedId("prov_");
      document.getElementById('providerName').value = '';
      document.getElementById('providerOwnerName').value = '';
      document.getElementById('providerEmail').value = '';
      document.getElementById('providerPhone').value = '';
      document.getElementById('providerPassword').value = 'default123';
      document.getElementById('providerRating').value = '';
      document.getElementById('providerPublic').checked = false;
    } else {
      showToast("❌ " + result.message);
    }
  } catch (error) {
    showToast("❌ Error while registering provider: " + error.message);
  }
});



document.getElementById('getProviderForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const providerId = document.getElementById('getProviderId').value;
    const response = await fetch(`/api/getProvider/${providerId}`, {
      credentials: 'include'
    });
    const result = await response.json();
    // document.getElementById('providerData').textContent = JSON.stringify(result.data, null, 2);
    renderJsonAsTable(result.data, 'providerData');
  } catch (error) {
    showToast("❌ Error fetching provider info: " + error.message);
    document.getElementById('providerData').textContent = 'Error: ' + error.message;
  }
});

document.getElementById('loadalluserbutton').addEventListener('click', async (e) => {
  e.preventDefault();
  document.getElementById("alluserinfo").style.display="block";
  loadAllUsers();
});

document.getElementById('loadallproviderbutton').addEventListener('click', async (e) => {
  e.preventDefault();
  document.getElementById("allprovinfo").style.display="block";
  loadAllProviders();
});

document.getElementById('adjustWalletForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const userId = document.getElementById('adjustUserId').value;
  const amount = parseFloat(document.getElementById('adjustAmount').value);

  if (!userId || isNaN(amount)) {
    showToast("❌ Invalid input. Please enter a valid user ID and amount.");
    return;
  }

  try {
    const response = await fetch('/api/adjustWallet', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ userId, amount })
    });

    const result = await response.json();
    showToast(result.message);

  } catch (err) {
    showToast('❌ Error: ' + err.message);
  }
});






async function loadAllProviders() {
  try {
    const token = localStorage.getItem("token");

    const res = await fetch('/api/getAllProviders', {
      credentials: 'include'
      
    });

    const result = await res.json();
    if (!result.success) throw new Error(result.message);

    const transportsRes = await fetch('/api/getAllTransports', {
      credentials: 'include'
    });
    const transports = (await transportsRes.json()).data || [];

    const grouped = result.data.map(provider => {
      const providerTransports = transports.filter(t => t.providerId === provider.id);
      return {
        ...provider,
        transportTypes: [...new Set(providerTransports.map(t => t.type))].join(", ")
      };
    });

    window.allProviders = grouped;
    renderProviderTable();

  } catch (err) {
    showToast("❌ Failed to load providers: " + err.message);
  }
}




document.getElementById('providerSearch').addEventListener('input', renderProviderTable);


document.getElementById('userSearch').addEventListener('input', renderUserTable);



//=====================================================
});