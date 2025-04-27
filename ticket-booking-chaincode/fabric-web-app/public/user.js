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
let userBookings = []; // Raw bookings
let enrichedBookings = []; // Enriched with schedule, transport, provider info

function resetSeatPicker() {
    document.getElementById('seatPickerSection').style.display = 'none';
    document.getElementById('availableSeatsGrid').innerHTML = '';
    document.getElementById('selectedSeatLabel').textContent = 'None';
    window.multiBookingState = null;
    window.bookingInProgress = false;
}

const token = localStorage.getItem('token');

document.addEventListener('DOMContentLoaded', () => {

(async () => {
  try {
    const res = await fetch('/api/validate-session', {
      credentials: 'include'  // ✅ important to send session cookie
    });

    const data = await res.json();
    console.log(data);

    if (data.success && data.role === 'user') {
      document.getElementById('updateUserId').value = data.userId;
      document.getElementById('deleteUserId').value = data.userId;
      document.getElementById('bookingUserId').value = data.userId;
      document.getElementById('userBookingsId').value = data.userId;
      // document.getElementById('userEmail').value = data.email;
    } else {
      console.log("🔒 Invalid or expired session");
      window.location.href = '/index.html'; // Optionally redirect
    }
  } catch (err) {
    console.error("❌ Error checking session:", err);
    window.location.href = '/index.html'; // In case fetch fails
  }
})();

  const bookingIdField = document.getElementById('bookingId');
  bookingIdField.value = generateFixedId("book_");



  const modifyNewBookingIdField = document.getElementById('modifyNewBookingId');
  modifyNewBookingIdField.value = generateFixedId("book_");

  document.getElementById('deleteUserForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
         // Show confirm popup
         // const userId = document.getElementById('deleteUserId').value.trim();  // ✅ first declare!
console.log("before");
  if (!document.getElementById('deleteUserId').value.trim()) {
    alert('Please enter a User ID');
    return;
  }
  console.log("after");
  const confirmation = confirm(`Are you sure you want to delete user ID: ${document.getElementById('deleteUserId').value.trim()}?`);

  if (!confirmation) {
    // If user clicks Cancel, do nothing
    return;
  }
        const userId = document.getElementById('deleteUserId').value;
        const response = await fetch(`/api/deleteUser/${userId}`, {
            method: 'DELETE',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        const result = await response.json();
alert(result.message);
if (result.success) {
  window.location.href = '/index.html'; // Redirect to login
}

        alert(result.message);
    } catch (err) {
        alert('Error: ' + err.message);
    }
});


  document.getElementById('getAvailableSchedulesForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    // 🧹 Reset seat picker
    resetSeatPicker();
    const frm=new FormData(document.getElementById('getAvailableSchedulesForm'))
    const source = frm.get('scheduleSource').trim();
    const destination = frm.get('scheduleDestination').trim();


    try {
        const response = await fetch(`/api/getAvailableSchedules?source=${source}&destination=${destination}`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
        }
    });
        const result = await response.json();

        if (!result.success) throw new Error(result.message);

        window.rawSchedules = result.data;
        window.providers = {};
        window.transports = {};

        for (const sched of result.data) {
            const tResp = await fetch(`/api/getTransport/${sched.transportId}`, {
              method: 'GET',
              credentials: 'include',
              headers: {
                'Content-Type': 'application/json'
            }
        });
            const transport = (await tResp.json()).data;
            window.transports[sched.transportId] = transport;

            const pResp = await fetch(`/api/getProvider/${transport.providerId}`, {
              method: 'GET',
              credentials: 'include',
              headers: {
                'Content-Type': 'application/json'
            }
        });
            const provider = (await pResp.json()).data;
            window.providers[transport.providerId] = provider;
        }

        renderFilteredSchedules(); // 🎯 This triggers rendering with search/sort/filter applied

    } catch (error) {
        alert("❌ Failed to fetch schedules: " + error.message);
    }
});

  ['scheduleSearchInput', 'sortField', 'sortDirection', 'onlyAvailable', 'filterType', 'maxPriceFilter']
  .forEach(id => {
      document.getElementById(id).addEventListener('input', renderFilteredSchedules);
  });



    // Booking Management
  document.getElementById('bookTicketForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        const response = await fetch('/api/bookTicket', {
            method: 'POST',
            credentials: 'include',
            headers: {  'Content-Type': 'application/json'  },
            body: JSON.stringify({
                bookingId: document.getElementById('bookingId').value,
                userId: document.getElementById('bookingUserId').value,
                scheduleId: document.getElementById('bookingScheduleId').value,
                seatNumber: document.getElementById('bookingSeatNumber').value
            })
        });
        const result = await response.json();
        if(result.success)
        {
            document.getElementById('bookingId').value= generateFixedId("book_");
            document.getElementById('seatPickerSection').style.display = 'none';
            document.getElementById('availableSeatsGrid').innerHTML = '';
            document.getElementById('selectedSeatLabel').textContent = 'None';
            window.multiBookingState = null;
            document.getElementById('getAvailableSchedulesForm').dispatchEvent(new Event('submit'));



        }
        alert(result.message);
    } catch (error) {
        alert('Error: ' + error.message);
    }
});



  document.getElementById('cancelTicketForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        const bookingId = document.getElementById('cancelBookingId').value;
        const response = await fetch('/api/cancelTicket', {
            method: 'POST',
            credentials: 'include',
            headers: {  'Content-Type': 'application/json'  },
            body: JSON.stringify({ bookingId })
        });
        const result = await response.json();
        alert(result.message);
    } catch (error) {
        alert('Error: ' + error.message);
    }
});

  document.getElementById('modifyTicketForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        const response = await fetch('/api/modifyTicket', {
            method: 'POST',
            credentials: 'include',
            headers: {  'Content-Type': 'application/json'  },
            body: JSON.stringify({
                oldBookingId: document.getElementById('modifyOldBookingId').value,
                newBookingId: document.getElementById('modifyNewBookingId').value,
                newScheduleId: document.getElementById('newScheduleId').value,
                newSeatNumber: document.getElementById('newSeatNumber').value,
                userId:document.getElementById('userBookingsId').value 
            })
        });
        const result = await response.json();
        alert(result.message);
        if(result.success)
        {
            document.getElementById('modifyOldBookingId').value = '';
            document.getElementById('newScheduleId').value = '';
            document.getElementById('newSeatNumber').value = '';
            document.getElementById('modifyNewBookingId').value = generateFixedId("book_");
            document.getElementById('bookTicketForm').style.display = 'block';
            document.getElementById('multiBookBtn').style.display = 'block';
            document.getElementById('cancelModifyBtn').style.display = 'none';

        }
    } catch (error) {
        alert('Error: ' + error.message);
    }
});

  document.getElementById('updateUserForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const userId = document.getElementById('updateUserId').value.trim();
    const name = document.getElementById('updateName').value.trim();
    // const email = document.getElementById('updateEmail').value.trim();
    const phone = document.getElementById('updatePhone').value.trim();
    const isAnonymous = document.getElementById('updateIsAnonymous').checked;
    console.log(userId);
    // ✅ Basic validations
    if (!userId) {
        alert("❌ User ID is required.");
        return;
    }

    if (!name) {
        alert("❌ Name is required.");
        return;
    }

    // ✅ Phone: 10 digits only
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(phone)) {
        alert("❌ Phone number must be exactly 10 digits.");
        return;
    }

    try {
        const response = await fetch('/api/updateUser', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json'},
            // body: JSON.stringify({ userId, name, email, phone, isAnonymous })
            body: JSON.stringify({ userId, name, phone, isAnonymous })
        });

        const result = await response.json();
        if (result.success) {
            alert("✅ User updated successfully!");
        } else {
            alert("❌ " + result.message);
        }
    } catch (error) {
        alert("❌ Error while updating user: " + error.message);
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
    const resp = await fetch(`/api/getBookingsByUser/${userId}`, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' }
    });

    const { data } = await resp.json();
    userBookings = data;
    enrichedBookings = [];

    for (const booking of userBookings) {
      let source = "Deleted";
      let destination = "Deleted";
      let departure = "-";
      let transportType = "Unknown";
      let providerName = "Deleted Provider";
      let rating = "-";

      try {
        const schedResp = await fetch(`/api/getSchedule/${booking.scheduleId}`, { credentials: 'include' });
        if (schedResp.ok) {
          const schedule = (await schedResp.json()).data;
          source = schedule.source;
          destination = schedule.destination;
          departure = schedule.departure;

          try {
            const transportResp = await fetch(`/api/getTransport/${schedule.transportId}`, { credentials: 'include' });
            if (transportResp.ok) {
              const transport = (await transportResp.json()).data;
              transportType = transport.type;

              try {
                const providerResp = await fetch(`/api/getProvider/${transport.providerId}`, { credentials: 'include' });
                if (providerResp.ok) {
                  const provider = (await providerResp.json()).data;
                  providerName = provider.name;
                  rating = provider.rating;
                }
              } catch (err) {
                console.warn(`⚠️ Provider not found for transport ${schedule.transportId}`);
              }
            }
          } catch (err) {
            console.warn(`⚠️ Transport not found for schedule ${booking.scheduleId}`);
          }
        }
      } catch (err) {
        console.warn(`⚠️ Schedule not found for booking ${booking.id}`);
      }

      enrichedBookings.push({
        ...booking,
        source,
        destination,
        departure,
        transportType,
        providerName,
        rating
      });
    }

    container.style.display = 'block';
    renderBookingsTable();

  } catch (error) {
    alert("❌ Failed to fetch bookings: " + error.message);
  }
});


    ['bookingSearchInput', 'bookingSortField', 'bookingSortDirection', 'statusFilter', 'maxBookingPriceFilter', 'fromBookingDateFilter', 'toBookingDateFilter']
    .forEach(id => document.getElementById(id)?.addEventListener('input', renderBookingsTable));






  document.getElementById('logoutBtn').addEventListener('click', async () => {
  
    await fetch('/api/logout', {
      method: 'POST',
      credentials: 'include'
    });


  window.location.href = '/index.html'; // or wherever your login page is
});

  document.getElementById('cancelModifyBtn').addEventListener('click', () => {
    // Reset all modify fields
    document.getElementById('modifyOldBookingId').value = '';
    document.getElementById('newScheduleId').value = '';
    document.getElementById('newSeatNumber').value = '';
    document.getElementById('modifyNewBookingId').value = generateFixedId("book_");

    // Show booking form again
    document.getElementById('bookTicketForm').style.display = 'block';
    document.getElementById('cancelModifyBtn').style.display = 'none';

    alert("🧹 Modify mode cancelled. You can now book normally.");
});


  document.getElementById('multiBookBtn').addEventListener('click', async () => {
    console.log("📩 Book Multiple Button Clicked");

    const userId = document.getElementById('bookingUserId').value.trim();
    const state = window.multiBookingState || {};
    const scheduleId = state.scheduleId;
    const seats = [...(state.selectedSeats || [])].map(seat => seat.toString());


    console.log({ userId, scheduleId, seats });

    if (!userId) return alert("❌ Please enter a User ID before booking.");
    if (!scheduleId || seats.length === 0) {
        return alert("❌ No seats selected.");
    }

    const bookingIds = seats.map(() => generateFixedId("book_"));
    console.log("Generated booking IDs:", bookingIds);

    try {
        const response = await fetch('/api/bookMultipleTickets', {
            method: 'POST',
            credentials: 'include',
            headers: {  'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId,
                scheduleId,
                seatNumbers: seats,
                bookingIds,
            })
        });

        const result = await response.json();
        alert(result.message || "Booking done");

        if (result.success) {
            window.multiBookingState = null;
            document.getElementById('availableSeatsGrid').innerHTML = '';
            document.getElementById('selectedSeatLabel').textContent = 'None';
            document.getElementById('bookingSeatNumber').value = '';
            document.getElementById('bookingScheduleId').value = '';
            document.getElementById('seatPickerSection').style.display = 'none';
            document.getElementById('availableSeatsGrid').innerHTML = '';
            window.multiBookingState = null;
            document.getElementById('getAvailableSchedulesForm').dispatchEvent(new Event('submit'));


        }

    } catch (error) {
        alert("❌ Booking failed: " + error.message);
    }
});


  function renderFilteredSchedules() {
      const all = window.rawSchedules || [];
      const tbody = document.querySelector('#scheduleTable tbody');
      tbody.innerHTML = '';

      const search = document.getElementById('scheduleSearchInput').value.trim().toLowerCase();
      const onlyAvailable = document.getElementById('onlyAvailable').checked;
      const filterType = document.getElementById('filterType').value;
      const maxPrice = parseInt(document.getElementById('maxPriceFilter').value);
      const sortField = document.getElementById('sortField').value;
      const sortDirection = document.getElementById('sortDirection').value;
      const fromDateValue = document.getElementById('fromDateFilter').value;
      const toDateValue = document.getElementById('toDateFilter').value;

      const fromDate = fromDateValue ? new Date(fromDateValue) : null;
      const toDate = toDateValue ? new Date(toDateValue) : null;
      console.log(fromDate+" "+toDate);
      const filtered = all.filter(schedule => {
        const depDate = new Date(schedule.departure);
        const weekday = depDate.toLocaleDateString('en-IN', { weekday: 'long' }).toLowerCase();

        const transport = window.transports?.[schedule.transportId] || {};
        const provider = window.providers?.[transport.providerId] || {};

        const type = transport.type?.toLowerCase() || '';
        const providerName = provider.name?.toLowerCase() || '';

        const matchesSearch = !search || (
          type.includes(search) ||
          providerName.includes(search) ||
          weekday.startsWith(search)
          );

        const matchesType = filterType === 'all' || type === filterType;
        const matchesPrice = isNaN(maxPrice) || schedule.currentPrice <= maxPrice;
        const hasAvailable = !onlyAvailable || schedule.vacantCount > 0;

        const matchesDateRange = (!fromDate || new Date(schedule.departure) >= fromDate) &&
                          (!toDate || new Date(schedule.departure) <= toDate);

        return matchesSearch && matchesType && matchesPrice && hasAvailable && matchesDateRange;

        // return matchesSearch && matchesType && matchesPrice && hasAvailable;
    });

      const sorted = [...filtered].sort((a, b) => {
        const getValue = (schedule) => {
          const transport = window.transports?.[schedule.transportId] || {};
          const provider = window.providers?.[transport.providerId] || {};

          switch (sortField) {
          case 'departure': return new Date(schedule.departure).getTime();
          case 'currentPrice': return schedule.currentPrice;
          case 'vacantCount': return schedule.vacantCount;
          case 'bookedCount': return Object.keys(schedule.bookedSeats || {}).length;
          case 'providerRating': return provider.rating || 0;
          case 'transportType': return transport.type?.charCodeAt(0) || 0;
          default: return 0;
          }
      };

      const v1 = getValue(a);
      const v2 = getValue(b);
      return sortDirection === 'asc' ? v1 - v2 : v2 - v1;
  });

      sorted.forEach(schedule => {
        const row = document.createElement('tr');

        const dep = new Date(schedule.departure);
        const formatted = dep.toLocaleString('en-IN', {
          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', weekday: 'short'
      });

        const bookedSeats = Object.keys(schedule.bookedSeats || {}).length;
        const transport = window.transports?.[schedule.transportId] || {};
        const provider = window.providers?.[transport.providerId] || {};
        const transportInfo = `${transport.type || '?'} – ${provider.name || 'Unknown'} (${provider.rating || '?'}⭐)`;

        const bookButton = schedule.vacantCount > 0
        ? `<button onclick='handleBookClick(${JSON.stringify(schedule)})'>Book Ticket</button>`
        : `<button disabled>Sold Out</button>`;

        row.innerHTML = `
      <td>${schedule.source}</td>
      <td>${schedule.destination}</td>
      <td>${formatted}</td>
      <td>${schedule.vacantCount}</td>
      <td>${bookedSeats}</td>
      <td>₹${schedule.currentPrice}</td>
      <td>${transportInfo}</td>
      <td>${bookButton}</td>
        `;
        tbody.appendChild(row);
    });
  }


















































































document.getElementById('fromDateFilter').addEventListener('change', renderFilteredSchedules);
document.getElementById('toDateFilter').addEventListener('change', renderFilteredSchedules);




//=================================================
});

function renderBookingsTable() {
  const searchQuery = document.getElementById('bookingSearchInput')?.value.toLowerCase() || '';
  const sortField = document.getElementById('bookingSortField')?.value || 'departure';
  const sortDirection = document.getElementById('bookingSortDirection')?.value || 'asc';
  const statusFilter = document.getElementById('statusFilter')?.value || 'all';
  const maxPrice = parseFloat(document.getElementById('maxBookingPriceFilter')?.value) || Infinity;
  const fromDate = document.getElementById('fromBookingDateFilter')?.value;
  const toDate = document.getElementById('toBookingDateFilter')?.value;

  let filtered = enrichedBookings.filter(b => {
    const matchesSearch =
      (b.source?.toLowerCase().includes(searchQuery)) ||
      (b.destination?.toLowerCase().includes(searchQuery)) ||
      (b.providerName?.toLowerCase().includes(searchQuery)) ||
      (b.transportType?.toLowerCase().includes(searchQuery)) ||
      (b.id && b.id.toLowerCase().includes(searchQuery)) ||
      (b.scheduleId && b.scheduleId.toLowerCase().includes(searchQuery));

    const matchesStatus = statusFilter === 'all' || (b.status && b.status.toLowerCase() === statusFilter.toLowerCase());
    const matchesPrice = b.pricePaid <= maxPrice;

    const departureDate = new Date(b.departure);
    const fromCondition = !fromDate || departureDate >= new Date(fromDate);
    const toCondition = !toDate || departureDate <= new Date(toDate);

    return matchesSearch && matchesStatus && matchesPrice && fromCondition && toCondition;
  });

  filtered.sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];

    if (sortField === 'departure') {
      valA = new Date(valA);
      valB = new Date(valB);
    }
    if (typeof valA === 'string') valA = valA.toLowerCase();
    if (typeof valB === 'string') valB = valB.toLowerCase();

    if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
    if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const tbody = document.querySelector('#userBookingsTable tbody');
  tbody.innerHTML = '';

  if (filtered.length === 0) {
    const row = tbody.insertRow();
    const cell = row.insertCell();
    cell.colSpan = 11;
    cell.textContent = 'No matching bookings found.';
    return;
  }

  for (const b of filtered) {
    const row = tbody.insertRow();
    const departure = new Date(b.departure).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', weekday: 'short' });
    const now = new Date();
    const isFuture = new Date(b.departure) > now;

    row.innerHTML = `
      <td>${b.id}</td>
      <td>${b.source}</td>
      <td>${b.destination}</td>
      <td>${departure}</td>
      <td>${b.seatNumber}</td>
      <td>₹${b.pricePaid}</td>
      <td>${b.status}</td>
      <td>${b.transportType}</td>
      <td>${b.providerName}</td>
      <td>${b.rating}⭐</td>
      <td>
        ${isFuture && b.status === 'confirmed' ? `
          <button onclick="cancelBooking('${b.id}')">Cancel</button>
          <button onclick="prefillModify('${b.id}', '${b.scheduleId}')">Modify</button>
        ` : '—'}
      </td>
    `;
  }
}


 window.handleBookClick = async function (schedule) {
    const grid = document.getElementById('availableSeatsGrid');
    const label = document.getElementById('selectedSeatLabel');
    const picker = document.getElementById('seatPickerSection');

    picker.style.display = 'block';
    label.textContent = "None";
    grid.innerHTML = "";

    const selectedSeats = new Set();

    schedule.vacantSeatNumbers.forEach(seat => {
        const btn = document.createElement('button');
        btn.textContent = seat;
        btn.className = 'seat-btn';
        btn.dataset.seat = seat;

        btn.addEventListener('click', () => {
            if (selectedSeats.has(seat)) {
                selectedSeats.delete(seat);
                btn.style.backgroundColor = "#e0f7fa";
            } else {
                selectedSeats.add(seat);
                btn.style.backgroundColor = "#4CAF50";
            }

            label.textContent = [...selectedSeats].join(', ') || "None";

            const isModify = document.getElementById('modifyOldBookingId').value.trim();

            if (!isModify) {
                document.getElementById('bookingScheduleId').value = schedule.id;

                if (selectedSeats.size === 1) {
                    document.getElementById('bookingSeatNumber').value = [...selectedSeats][0];
                } else {
                    document.getElementById('bookingSeatNumber').value = '';
                }
            } else {
                // In modify mode
                if (selectedSeats.size === 1) {
                    document.getElementById('newScheduleId').value = schedule.id;
                    document.getElementById('newSeatNumber').value = [...selectedSeats][0];
                } else {
                    document.getElementById('newSeatNumber').value = '';
                }
            }

            // Save state globally for multi-book
            window.multiBookingState = {
                scheduleId: schedule.id,
                selectedSeats,
            };
        });

        grid.appendChild(btn);
    });
};




window.cancelBooking = async function (bookingId) {
    if (!confirm("Are you sure you want to cancel this booking?")) return;

    try {
        const resp = await fetch('/api/cancelTicket', {
            method: 'POST',
            credentials: 'include',
            headers: {  'Content-Type': 'application/json' },
            body: JSON.stringify({ bookingId })
        });
        const result = await resp.json();
        alert(result.message);
    } catch (err) {
        alert("❌ Cancel failed: " + err.message);
    }
};

window.prefillModify = function (bookingId, oldScheduleId) {
    document.getElementById('modifyOldBookingId').value = bookingId;

    // Optional: Clear previously selected schedule and seat
    document.getElementById('newScheduleId').value = '';
    document.getElementById('newSeatNumber').value = '';
    document.getElementById('modifyNewBookingId').value = generateFixedId('book_');

    alert("✅ Modify mode activated! Now search for a new schedule and select a seat.");
    document.getElementById('bookTicketForm').style.display = 'none';

    document.getElementById('cancelModifyBtn').style.display = 'inline-block';
    document.getElementById('bookTicketForm').style.display = 'none';
    document.getElementById('multiBookBtn').style.display = 'none';

    


};
