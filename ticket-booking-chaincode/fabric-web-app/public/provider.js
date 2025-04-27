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


document.addEventListener('DOMContentLoaded', () => {
    (async () => {
      try {
        const res = await fetch('/api/validate-session', {
          method: 'GET',
      credentials: 'include'  // ✅ Important: session cookie must be sent
  });

        const data = await res.json();
        console.log(data);

        if (data.success && data.role === 'provider') {
          document.getElementById('deleteProviderId').value = data.userId;
          document.getElementById('updateProviderId').value = data.userId;
          document.getElementById('providerTransportId').value = data.userId;
          document.getElementById('scheduleProviderId').value = data.userId;
          document.getElementById('transportProviderId').value = data.userId;
      } else {
          console.log("🔒 Invalid or expired session");
      window.location.href = '/index.html';  // Optional: redirect to login if wrong role
  }
} catch (err) {
    console.error("❌ Error checking session:", err);
    window.location.href = '/index.html'; // Redirect on error
}
})();

const scheduleIdField = document.getElementById('scheduleId');
scheduleIdField.value = generateFixedId("sch_");

// Auto-generate transport ID
const transportIdField = document.getElementById('transportId');
transportIdField.value = generateFixedId("trans_");


document.getElementById('addTransportForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = transportIdField.value.trim();
    const providerId = document.getElementById('transportProviderId').value.trim();
    const type = document.getElementById('transportType').value.trim();

    // ✅ Validation
    if (!providerId) {
        alert("❌ Provider ID is required.");
        return;
    }

    if (!type) {
        alert("❌ Please select a transport type.");
        return;
    }

    try {
        const response = await fetch('/api/addTransport', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json'},
            body: JSON.stringify({ id, providerId, type })
        });

        const result = await response.json();
        if (result.success) {
            alert("✅ Transport added successfully!");
            // Reset form
            transportIdField.value = generateFixedId("trans_");
            document.getElementById('transportProviderId').value = '';
            document.getElementById('transportType').value = '';
        } else {
            alert("❌ " + result.message);
        }
    } catch (error) {
        alert("❌ Error while adding transport: " + error.message);
    }
});

document.getElementById('getTransportForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        const transportId = document.getElementById('getTransportId').value;
        const response = await fetch(`/api/getTransport/${transportId}`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
        }
    });
        const result = await response.json();
        document.getElementById('transportData').textContent = JSON.stringify(result.data, null, 2);
    } catch (error) {
        document.getElementById('transportData').textContent = 'Error: ' + error.message;
    }
});


document.getElementById('modifyScheduleForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const scheduleId = document.getElementById('modifyScheduleId').value.trim();
    const newDeparture = document.getElementById('modifyScheduleDate').value.trim();
    const newBasePrice = parseInt(document.getElementById('modifySchedulePrice').value.trim());
    const additionalSeats = parseInt(document.getElementById('modifyScheduleSeats').value.trim());

    // ✅ Required field check
    if (!scheduleId || !newDeparture) {
        alert("❌ Schedule ID and departure time are required.");
        return;
    }

    // ✅ Future date validation
    const selectedDate = new Date(newDeparture);
    const now = new Date();
    if (selectedDate <= now) {
        alert("❌ Departure must be a future date and time.");
        return;
    }

    // ✅ Validate positive seats
    if (isNaN(additionalSeats) || additionalSeats < 0) {
        alert("❌ Additional seats must be a positive number (or 0).");
        return;
    }

    // ✅ Validate positive fare
    if (isNaN(newBasePrice) || newBasePrice <= 0) {
        alert("❌ New fare must be a positive number.");
        return;
    }

    try {
        const response = await fetch('/api/modifySchedule', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json'},
            body: JSON.stringify({
                scheduleId,
                newDeparture,
                newBasePrice,
                additionalSeats
            })
        });

        const result = await response.json();
        if (result.success) {
            alert("✅ Schedule updated successfully!");
            // Optionally reset form
            document.getElementById('modifyScheduleId').value = '';
            document.getElementById('modifyScheduleDate').value = '';
            document.getElementById('modifySchedulePrice').value = '';
            document.getElementById('modifyScheduleSeats').value = '';
        } else {
            alert("❌ " + result.message);
        }
    } catch (error) {
        alert("❌ Error while updating schedule: " + error.message);
    }
});





document.getElementById('createScheduleForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = scheduleIdField.value.trim();
    const transportId = document.getElementById('scheduleTransportId').value.trim();
    const departure = document.getElementById('scheduleDeparture').value.trim();
    const source = document.getElementById('scheduleSource').value.trim();
    const destination = document.getElementById('scheduleDestination').value.trim();
    const totalSeats = parseInt(document.getElementById('scheduleSeats').value.trim());
    const basePrice = parseInt(document.getElementById('schedulePrice').value.trim());

    // ✅ Validate required fields
    if (!transportId || !departure || !source || !destination) {
        alert("❌ All fields are required.");
        return;
    }

    // ✅ Validate future date
    const selectedDate = new Date(departure);
    const now = new Date();
    if (selectedDate <= now) {
        alert("❌ Departure must be a future date and time.");
        return;
    }

    // ✅ Seats and price must be positive
    if (isNaN(totalSeats) || totalSeats <= 0) {
        alert("❌ Total seats must be a positive number.");
        return;
    }

    if (isNaN(basePrice) || basePrice <= 0) {
        alert("❌ Base price must be a positive number.");
        return;
    }

    try {
        const response = await fetch('/api/createSchedule', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id, transportId, departure,
                source, destination,
                totalSeats, basePrice
            })
        });

        const result = await response.json();
        if (result.success) {
            alert("✅ Schedule created successfully!");
            // Reset form
            scheduleIdField.value = generateFixedId("sch_");
            document.getElementById('scheduleTransportId').value = '';
            document.getElementById('scheduleDeparture').value = '';
            document.getElementById('scheduleSource').value = '';
            document.getElementById('scheduleDestination').value = '';
            document.getElementById('scheduleSeats').value = '';
            document.getElementById('schedulePrice').value = '';
        } else {
            alert("❌ " + result.message);
        }
    } catch (error) {
        alert("❌ Error while creating schedule: " + error.message);
    }
});
document.getElementById('getTransportsByProviderForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const providerId = document.getElementById('providerTransportId').value.trim();
  const tableBody = document.querySelector('#providerTransportTable tbody');
  tableBody.innerHTML = "";

  try {
    if (!providerId) throw new Error("Please enter a provider ID");

    const transportResp = await fetch(`/api/getTransportsByProvider/${providerId}`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
    }
});
    const result = await transportResp.json();
    if (!result.success) throw new Error(result.message);

    const transports = result.data;

    if (transports.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="2">No transports found under this provider.</td></tr>`;
      return;
  }

  for (const t of transports) {
      const row = document.createElement('tr');
      row.innerHTML = `
  <td>${t.type}</td>
  <td>
    <button onclick="deleteTransport('${t.id}')">❌ Delete</button>
    <button onclick="prefillSchedule('${t.id}')">➕ Add Schedule</button>
  </td>
      `;

      tableBody.appendChild(row);
  }

} catch (err) {
    alert("❌ Error: " + err.message);
}
});


document.getElementById('verifyTicketForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        const id = document.getElementById('verifyBookingId').value;
        const response = await fetch(`/api/verifyTicket/${id}`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
        }
    });
        const result = await response.json();
        if (result.success) {
            document.getElementById('verifyTicketData').textContent = JSON.stringify(result.data, null, 2);
        } else {
            document.getElementById('verifyTicketData').textContent = 'Error: ' + result.message;
        }
    } catch (error) {
        document.getElementById('verifyTicketData').textContent = 'Error: ' + error.message;
    }
});


document.getElementById('getScheduleForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        const scheduleId = document.getElementById('getScheduleId').value;
        const response = await fetch(`/api/getSchedule/${scheduleId}`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
        }
    });
        const result = await response.json();
        document.getElementById('scheduleData').textContent = JSON.stringify(result.data, null, 2);
    } catch (error) {
        document.getElementById('scheduleData').textContent = 'Error: ' + error.message;
    }
});

document.getElementById('logoutBtn').addEventListener('click', async() => {
   await fetch('/api/logout', {
      method: 'POST',
      credentials: 'include'
  });
  window.location.href = '/index.html'; // or wherever your login page is
});

document.getElementById('deleteScheduleForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        const scheduleId = document.getElementById('deleteScheduleId').value;
        const response = await fetch('/api/deleteSchedule', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json'},
            body: JSON.stringify({ scheduleId })
        });
        const result = await response.json();
        alert(result.message);
    } catch (error) {
        alert('Error: ' + error.message);
    }
});

document.getElementById('deleteTransportForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        const transportId = document.getElementById('deleteTransportId').value;
        const response = await fetch('/api/deleteTransport', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transportId })
        });
        const result = await response.json();
        alert(result.message);
    } catch (error) {
        alert('Error: ' + error.message);
    }
});

document.getElementById('deleteProviderForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        console.log("before");
        if (!document.getElementById('deleteProviderId').value.trim()) {
            alert('Please enter a User ID');
            return;
        }
        console.log("after");
        const confirmation = confirm(`Are you sure you want to delete user ID: ${document.getElementById('deleteProviderId').value.trim()}?`);

        if (!confirmation) {
    // If user clicks Cancel, do nothing
            return;
        }
        const providerId = document.getElementById('deleteProviderId').value;
        const response = await fetch('/api/deleteProvider', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ providerId })
        });
        const result = await response.json();
        alert(result.message);
        if (result.success) {
  window.location.href = '/index.html'; // Redirect to login
}

alert(result.message);
} catch (error) {
    alert('Error: ' + error.message);
}
});

document.getElementById('updateProviderForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        const response = await fetch('/api/updateProvider', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: document.getElementById('updateProviderId').value,
              name: document.getElementById('updateProviderName').value,
              ownerName: document.getElementById('updateProviderOwner').value,
              phone: document.getElementById('updateProviderPhone').value,
              rating: document.getElementById('updateProviderRating').value,
              isPublic: document.getElementById('updateProviderPublic').checked
          })
        });
        const result = await response.json();
        alert(result.message);
    } catch (error) {
        alert('Error: ' + error.message);
    }
});


document.getElementById('getSchedulesByProviderForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const provId = document.getElementById('scheduleProviderId').value.trim();
  const tableBody = document.querySelector('#providerScheduleTable tbody');
  tableBody.innerHTML = "";

  try {
    const res = await fetch(`/api/getSchedulesByProvider/${provId}`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
    }
});
    const result = await res.json();
    if (!result.success) throw new Error(result.message);

    window.providerSchedules = result.data;
    renderProviderSchedules();

} catch (err) {
    alert("❌ Error fetching schedules: " + err.message);
}
});

function renderProviderSchedules() {
  const data = window.providerSchedules || [];
  const search = document.getElementById('scheduleSearch').value.toLowerCase();
  const sortField = document.getElementById('scheduleSortField').value;
  const sortDir = document.getElementById('scheduleSortDir').value;
  const tbody = document.querySelector('#providerScheduleTable tbody');
  tbody.innerHTML = "";

  const filtered = data.filter(s => {
    const weekday = new Date(s.departure).toLocaleDateString('en-IN', { weekday: 'long' }).toLowerCase();
    return !search || (
      s.source.toLowerCase().includes(search) ||
      s.destination.toLowerCase().includes(search) ||
      s.transportType.toLowerCase().includes(search) ||
      weekday.startsWith(search)
      );
});

  const sorted = filtered.sort((a, b) => {
    let v1, v2;
    switch (sortField) {
    case 'departure':
        v1 = new Date(a.departure).getTime();
        v2 = new Date(b.departure).getTime();
        break;
    case 'currentPrice':
        v1 = a.currentPrice;
        v2 = b.currentPrice;
        break;
    case 'vacant':
        v1 = a.available;
        v2 = b.available;
        break;
    case 'booked':
        v1 = Object.keys(a.bookedSeats || {}).length;
        v2 = Object.keys(b.bookedSeats || {}).length;
        break;
    case 'transportType':
        v1 = a.transportType.charCodeAt(0);
        v2 = b.transportType.charCodeAt(0);
        break;
    default:
        v1 = v2 = 0;
    }
    return sortDir === 'asc' ? v1 - v2 : v2 - v1;
});

  for (const sched of sorted) {
    const booked = Object.keys(sched.bookedSeats || {}).length;
    const dateStr = new Date(sched.departure).toLocaleString('en-IN', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', weekday: 'short'
  });

    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${sched.source}</td>
      <td>${sched.destination}</td>
      <td>${dateStr}</td>
      <td>${sched.available}</td>
      <td>${booked}</td>
      <td>₹${sched.currentPrice}</td>
      <td>${sched.transportType}</td>
      <td>
        <button onclick="prefillScheduleEdit('${sched.id}', '${sched.departure}', ${sched.basePrice}, ${sched.totalSeats - sched.available})">✏️ Edit</button>
        <button onclick="deleteSchedule('${sched.id}')">🗑️ Delete</button>
      </td>
    `;
    tbody.appendChild(row);
}
}

['scheduleSearch', 'scheduleSortField', 'scheduleSortDir']
.forEach(id => document.getElementById(id).addEventListener('input', renderProviderSchedules));




















































//=======================================================
});



 window.deleteTransport = async function (transportId) {
  if (!confirm(`Are you sure you want to delete ${transportId}?`)) return;

  const token = localStorage.getItem('token'); // 🔁 fixed key

  try {
    const resp = await fetch('/api/deleteTransport', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({ transportId })
});

    const result = await resp.json();
    console.log("🧾 Response:", result);
    alert(result.message);

    const form = document.getElementById('getTransportsByProviderForm');
    if (form) {
      form.dispatchEvent(new Event('submit'));
  } else {
      console.warn("⚠️ Form not found: getTransportsByProviderForm");
  }

} catch (error) {
    alert("❌ Failed to delete: " + error.message);
}
};




window.prefillSchedule = function (transportId) {
  document.getElementById('scheduleTransportId').value = transportId;

  // Optional: focus on schedule creation section
  document.getElementById('scheduleTransportId').scrollIntoView({ behavior: 'smooth', block: 'center' });

  alert("✅ Transport ID loaded into 'Create Schedule' form. Please complete the rest and submit.");
};


window.prefillScheduleEdit = function (id, departure, basePrice, bookedSeats) {
  document.getElementById('modifyScheduleId').value = id;
  document.getElementById('modifyScheduleDate').value = departure.slice(0, 16); // datetime-local format
  document.getElementById('modifySchedulePrice').value = basePrice;
  document.getElementById('modifyScheduleSeats').value = 0; // user must increase seats only

  alert("✏️ Schedule loaded. You can only modify price/date or increase seats.");
};

window.deleteSchedule = async function (scheduleId) {
  if (!confirm(`Are you sure to delete ${scheduleId}? All users will be refunded.`)) return;


  try {
    const res = await fetch('/api/deleteSchedule', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json'},
      body: JSON.stringify({ scheduleId })
  });

    const result = await res.json();
    alert(result.message);

    // Refresh
    document.getElementById('getSchedulesByProviderForm').dispatchEvent(new Event('submit'));

} catch (error) {
    alert("❌ Failed to delete: " + error.message);
}
}
