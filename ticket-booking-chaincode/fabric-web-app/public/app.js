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


// setInterval(() => {
//   fetch('/api/confirmPendingBookings', { method: 'POST' })
//     .then(async res => {
//       const raw = await res.text();
//       try {
//         const data = JSON.parse(raw);
//         if (data.success && data.confirmed.length > 0) {
//           console.log("✅ Auto-confirmed bookings:", data.confirmed);
//         }
//       } catch (err) {
//         console.error("❌ Confirm response parsing failed:", raw);
//       }
//     })
//     .catch(err => {
//       console.error("❌ Confirm request failed:", err);
//     });
// }, 10000);


// function confirmBookingsNow() {
//   fetch('/api/confirmPendingBookings', { method: 'POST' })
//     .then(res => res.json())
//     .then(data => alert(`✅ Confirmed: ${data.confirmed.length} bookings`))
//     .catch(err => alert("❌ Failed to confirm"));
// }

// function resetSeatPicker() {
//     document.getElementById('seatPickerSection').style.display = 'none';
//     document.getElementById('availableSeatsGrid').innerHTML = '';
//     document.getElementById('selectedSeatLabel').textContent = 'None';
//     window.multiBookingState = null;
//     window.bookingInProgress = false;
// }



document.addEventListener('DOMContentLoaded', () => {
    // Auto-generate random user ID on page load
    const userIdField = document.getElementById('userId');
    userIdField.value = generateFixedId("user_");


    const providerIdField = document.getElementById('providerId');
    providerIdField.value = generateFixedId("prov_");

    const scheduleIdField = document.getElementById('scheduleId');
    scheduleIdField.value = generateFixedId("sch_");

// Auto-generate transport ID
    const transportIdField = document.getElementById('transportId');
    transportIdField.value = generateFixedId("trans_");

    const bookingIdField = document.getElementById('bookingId');
    bookingIdField.value = generateFixedId("book_");



    const modifyNewBookingIdField = document.getElementById('modifyNewBookingId');
    modifyNewBookingIdField.value = generateFixedId("book_");




//     async function loadAllUsers() {
//       try {
//         const response = await fetch('/api/getAllUsers');
//         const result = await response.json();
//         if (!result.success) throw new Error(result.message);

//         window.allUsers = result.data;
//         renderUserTable();
//     } catch (err) {
//         alert("❌ Failed to load users: " + err.message);
//     }
// }

// document.getElementById('registerUserForm').addEventListener('submit', async (e) => {
//     e.preventDefault();

//     const userId = userIdField.value.trim();
//     const name = document.getElementById('name').value.trim();
//     const email = document.getElementById('email').value.trim();
//     const phone = document.getElementById('phone').value.trim();
//     const isAnonymous = document.getElementById('isAnonymous').checked;

//         // ✅ Phone validation: Must be 10 digits
//     const phoneRegex = /^[0-9]{10}$/;
//     if (!phoneRegex.test(phone)) {
//         alert("❌ Phone number must be exactly 10 digits.");
//         return;
//     }

//         // ✅ Email validation
//     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//     if (!emailRegex.test(email)) {
//         alert("❌ Please enter a valid email address.");
//         return;
//     }

//         // ✅ Name validation
//     if (!name) {
//         alert("❌ Name is required.");
//         return;
//     }

//     try {
//         const response = await fetch('/api/registerUser', {
//             method: 'POST',
//             headers: { 'Content-Type': 'application/json' },
//             body: JSON.stringify({ userId, name, email, phone, isAnonymous })
//         });

//         const result = await response.json();

//         if (result.success) {
//             alert("✅ User registered successfully!");
//                 // Optionally regenerate a new user ID
//             userIdField.value = generateFixedId("user_");
//             document.getElementById('name').value = '';
//             document.getElementById('email').value = '';
//             document.getElementById('phone').value = '';
//             document.getElementById('isAnonymous').checked = false;
//         } else {
//             alert("❌ " + result.message);
//         }
//     } catch (error) {
//         alert("❌ Error while registering: " + error.message);
//     }
// });
// document.getElementById('getUserForm').addEventListener('submit', async (e) => {
//     e.preventDefault();
//     try {
//         const userId = document.getElementById('getUserId').value;
//         const response = await fetch(`/api/getUser/${userId}`);
//         const result = await response.json();
//         document.getElementById('userData').textContent = JSON.stringify(result.data, null, 2);
//     } catch (error) {
//         document.getElementById('userData').textContent = 'Error: ' + error.message;
//     }
// });

//     // Provider Management
// document.getElementById('registerProviderForm').addEventListener('submit', async (e) => {
//     e.preventDefault();

//     const id = providerIdField.value.trim();
//     const name = document.getElementById('providerName').value.trim();
//     const rating = parseInt(document.getElementById('providerRating').value.trim());
//     const isPublic = document.getElementById('providerPublic').checked;

//     // ✅ Validations
//     if (!name) {
//         alert("❌ Name is required.");
//         return;
//     }

//     if (isNaN(rating) || rating < 1 || rating > 5) {
//         alert("❌ Rating must be a number between 1 and 5.");
//         return;
//     }

//     try {
//         const response = await fetch('/api/registerProvider', {
//             method: 'POST',
//             headers: { 'Content-Type': 'application/json' },
//             body: JSON.stringify({ id, name, rating, isPublic })
//         });

//         const result = await response.json();
//         if (result.success) {
//             alert("✅ Provider registered successfully!");
//             // Reset form
//             providerIdField.value = generateFixedId("prov_");
//             document.getElementById('providerName').value = '';
//             document.getElementById('providerRating').value = '';
//             document.getElementById('providerPublic').checked = false;
//         } else {
//             alert("❌ " + result.message);
//         }
//     } catch (error) {
//         alert("❌ Error while registering provider: " + error.message);
//     }
// });

// document.getElementById('deleteUserForm').addEventListener('submit', async (e) => {
//     e.preventDefault();
//     try {
//         const userId = document.getElementById('deleteUserId').value;
//         const response = await fetch(`/api/deleteUser/${userId}`, {
//             method: 'DELETE'
//         });
//         const result = await response.json();
//         alert(result.message);
//     } catch (err) {
//         alert('Error: ' + err.message);
//     }
// });

// document.getElementById('getProviderForm').addEventListener('submit', async (e) => {
//     e.preventDefault();
//     try {
//         const providerId = document.getElementById('getProviderId').value;
//         const response = await fetch(`/api/getProvider/${providerId}`);
//         const result = await response.json();
//         document.getElementById('providerData').textContent = JSON.stringify(result.data, null, 2);
//     } catch (error) {
//         document.getElementById('providerData').textContent = 'Error: ' + error.message;
//     }
// });

    // Transport Management
// document.getElementById('addTransportForm').addEventListener('submit', async (e) => {
//     e.preventDefault();

//     const id = transportIdField.value.trim();
//     const providerId = document.getElementById('transportProviderId').value.trim();
//     const type = document.getElementById('transportType').value.trim();

//     // ✅ Validation
//     if (!providerId) {
//         alert("❌ Provider ID is required.");
//         return;
//     }

//     if (!type) {
//         alert("❌ Please select a transport type.");
//         return;
//     }

//     try {
//         const response = await fetch('/api/addTransport', {
//             method: 'POST',
//             headers: { 'Content-Type': 'application/json' },
//             body: JSON.stringify({ id, providerId, type })
//         });

//         const result = await response.json();
//         if (result.success) {
//             alert("✅ Transport added successfully!");
//             // Reset form
//             transportIdField.value = generateFixedId("trans_");
//             document.getElementById('transportProviderId').value = '';
//             document.getElementById('transportType').value = '';
//         } else {
//             alert("❌ " + result.message);
//         }
//     } catch (error) {
//         alert("❌ Error while adding transport: " + error.message);
//     }
// });

// document.getElementById('getTransportForm').addEventListener('submit', async (e) => {
//     e.preventDefault();
//     try {
//         const transportId = document.getElementById('getTransportId').value;
//         const response = await fetch(`/api/getTransport/${transportId}`);
//         const result = await response.json();
//         document.getElementById('transportData').textContent = JSON.stringify(result.data, null, 2);
//     } catch (error) {
//         document.getElementById('transportData').textContent = 'Error: ' + error.message;
//     }
// });


// document.getElementById('modifyScheduleForm').addEventListener('submit', async (e) => {
//     e.preventDefault();

//     const scheduleId = document.getElementById('modifyScheduleId').value.trim();
//     const newDeparture = document.getElementById('modifyScheduleDate').value.trim();
//     const newBasePrice = parseInt(document.getElementById('modifySchedulePrice').value.trim());
//     const additionalSeats = parseInt(document.getElementById('modifyScheduleSeats').value.trim());

//     // ✅ Required field check
//     if (!scheduleId || !newDeparture) {
//         alert("❌ Schedule ID and departure time are required.");
//         return;
//     }

//     // ✅ Future date validation
//     const selectedDate = new Date(newDeparture);
//     const now = new Date();
//     if (selectedDate <= now) {
//         alert("❌ Departure must be a future date and time.");
//         return;
//     }

//     // ✅ Validate positive seats
//     if (isNaN(additionalSeats) || additionalSeats < 0) {
//         alert("❌ Additional seats must be a positive number (or 0).");
//         return;
//     }

//     // ✅ Validate positive fare
//     if (isNaN(newBasePrice) || newBasePrice <= 0) {
//         alert("❌ New fare must be a positive number.");
//         return;
//     }

//     try {
//         const response = await fetch('/api/modifySchedule', {
//             method: 'POST',
//             headers: { 'Content-Type': 'application/json' },
//             body: JSON.stringify({
//                 scheduleId,
//                 newDeparture,
//                 newBasePrice,
//                 additionalSeats
//             })
//         });

//         const result = await response.json();
//         if (result.success) {
//             alert("✅ Schedule updated successfully!");
//             // Optionally reset form
//             document.getElementById('modifyScheduleId').value = '';
//             document.getElementById('modifyScheduleDate').value = '';
//             document.getElementById('modifySchedulePrice').value = '';
//             document.getElementById('modifyScheduleSeats').value = '';
//         } else {
//             alert("❌ " + result.message);
//         }
//     } catch (error) {
//         alert("❌ Error while updating schedule: " + error.message);
//     }
// });





// document.getElementById('createScheduleForm').addEventListener('submit', async (e) => {
//     e.preventDefault();

//     const id = scheduleIdField.value.trim();
//     const transportId = document.getElementById('scheduleTransportId').value.trim();
//     const departure = document.getElementById('scheduleDeparture').value.trim();
//     const source = document.getElementById('scheduleSource').value.trim();
//     const destination = document.getElementById('scheduleDestination').value.trim();
//     const totalSeats = parseInt(document.getElementById('scheduleSeats').value.trim());
//     const basePrice = parseInt(document.getElementById('schedulePrice').value.trim());

//     // ✅ Validate required fields
//     if (!transportId || !departure || !source || !destination) {
//         alert("❌ All fields are required.");
//         return;
//     }

//     // ✅ Validate future date
//     const selectedDate = new Date(departure);
//     const now = new Date();
//     if (selectedDate <= now) {
//         alert("❌ Departure must be a future date and time.");
//         return;
//     }

//     // ✅ Seats and price must be positive
//     if (isNaN(totalSeats) || totalSeats <= 0) {
//         alert("❌ Total seats must be a positive number.");
//         return;
//     }

//     if (isNaN(basePrice) || basePrice <= 0) {
//         alert("❌ Base price must be a positive number.");
//         return;
//     }

//     try {
//         const response = await fetch('/api/createSchedule', {
//             method: 'POST',
//             headers: { 'Content-Type': 'application/json' },
//             body: JSON.stringify({
//                 id, transportId, departure,
//                 source, destination,
//                 totalSeats, basePrice
//             })
//         });

//         const result = await response.json();
//         if (result.success) {
//             alert("✅ Schedule created successfully!");
//             // Reset form
//             scheduleIdField.value = generateFixedId("sch_");
//             document.getElementById('scheduleTransportId').value = '';
//             document.getElementById('scheduleDeparture').value = '';
//             document.getElementById('scheduleSource').value = '';
//             document.getElementById('scheduleDestination').value = '';
//             document.getElementById('scheduleSeats').value = '';
//             document.getElementById('schedulePrice').value = '';
//         } else {
//             alert("❌ " + result.message);
//         }
//     } catch (error) {
//         alert("❌ Error while creating schedule: " + error.message);
//     }
// });


// function renderFilteredSchedules() {
//   const all = window.rawSchedules || [];
//   const tbody = document.querySelector('#scheduleTable tbody');
//   tbody.innerHTML = '';

//   const search = document.getElementById('scheduleSearchInput').value.trim().toLowerCase();
//   const onlyAvailable = document.getElementById('onlyAvailable').checked;
//   const filterType = document.getElementById('filterType').value;
//   const maxPrice = parseInt(document.getElementById('maxPriceFilter').value);
//   const sortField = document.getElementById('sortField').value;
//   const sortDirection = document.getElementById('sortDirection').value;

//   const filtered = all.filter(schedule => {
//     const depDate = new Date(schedule.departure);
//     const weekday = depDate.toLocaleDateString('en-IN', { weekday: 'long' }).toLowerCase();

//     const transport = window.transports?.[schedule.transportId] || {};
//     const provider = window.providers?.[transport.providerId] || {};

//     const type = transport.type?.toLowerCase() || '';
//     const providerName = provider.name?.toLowerCase() || '';

//     const matchesSearch = !search || (
//       type.includes(search) ||
//       providerName.includes(search) ||
//       weekday.startsWith(search)
//       );

//     const matchesType = filterType === 'all' || type === filterType;
//     const matchesPrice = isNaN(maxPrice) || schedule.currentPrice <= maxPrice;
//     const hasAvailable = !onlyAvailable || schedule.vacantCount > 0;

//     return matchesSearch && matchesType && matchesPrice && hasAvailable;
// });

//   const sorted = [...filtered].sort((a, b) => {
//     const getValue = (schedule) => {
//       const transport = window.transports?.[schedule.transportId] || {};
//       const provider = window.providers?.[transport.providerId] || {};

//       switch (sortField) {
//       case 'departure': return new Date(schedule.departure).getTime();
//       case 'currentPrice': return schedule.currentPrice;
//       case 'vacantCount': return schedule.vacantCount;
//       case 'bookedCount': return Object.keys(schedule.bookedSeats || {}).length;
//       case 'providerRating': return provider.rating || 0;
//       case 'transportType': return transport.type?.charCodeAt(0) || 0;
//       default: return 0;
//       }
//   };

//   const v1 = getValue(a);
//   const v2 = getValue(b);
//   return sortDirection === 'asc' ? v1 - v2 : v2 - v1;
// });

//   sorted.forEach(schedule => {
//     const row = document.createElement('tr');

//     const dep = new Date(schedule.departure);
//     const formatted = dep.toLocaleString('en-IN', {
//       day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', weekday: 'short'
//   });

//     const bookedSeats = Object.keys(schedule.bookedSeats || {}).length;
//     const transport = window.transports?.[schedule.transportId] || {};
//     const provider = window.providers?.[transport.providerId] || {};
//     const transportInfo = `${transport.type || '?'} – ${provider.name || 'Unknown'} (${provider.rating || '?'}⭐)`;

//     const bookButton = schedule.vacantCount > 0
//     ? `<button onclick='handleBookClick(${JSON.stringify(schedule)})'>Book Ticket</button>`
//     : `<button disabled>Sold Out</button>`;

//     row.innerHTML = `
//       <td>${schedule.source}</td>
//       <td>${schedule.destination}</td>
//       <td>${formatted}</td>
//       <td>${schedule.vacantCount}</td>
//       <td>${bookedSeats}</td>
//       <td>₹${schedule.currentPrice}</td>
//       <td>${transportInfo}</td>
//       <td>${bookButton}</td>
//     `;
//     tbody.appendChild(row);
// });
// }

// document.getElementById('getTransportsByProviderForm').addEventListener('submit', async (e) => {
//   e.preventDefault();

//   const providerId = document.getElementById('providerTransportId').value.trim();
//   const tableBody = document.querySelector('#providerTransportTable tbody');
//   tableBody.innerHTML = "";

//   try {
//     if (!providerId) throw new Error("Please enter a provider ID");

//     const transportResp = await fetch(`/api/getTransportsByProvider/${providerId}`);
//     const result = await transportResp.json();
//     if (!result.success) throw new Error(result.message);

//     const transports = result.data;

//     if (transports.length === 0) {
//       tableBody.innerHTML = `<tr><td colspan="2">No transports found under this provider.</td></tr>`;
//       return;
//   }

//   for (const t of transports) {
//       const row = document.createElement('tr');
//       row.innerHTML = `
//   <td>${t.type}</td>
//   <td>
//     <button onclick="deleteTransport('${t.id}')">❌ Delete</button>
//     <button onclick="prefillSchedule('${t.id}')">➕ Add Schedule</button>
//   </td>
//       `;

//       tableBody.appendChild(row);
//   }

// } catch (err) {
//     alert("❌ Error: " + err.message);
// }
// });




// document.getElementById('adjustWalletForm').addEventListener('submit', async (e) => {
//     e.preventDefault();
//     try {
//         const response = await fetch('/api/adjustWallet', {
//             method: 'POST',
//             headers: { 'Content-Type': 'application/json' },
//             body: JSON.stringify({
//                 userId: document.getElementById('adjustUserId').value,
//                 amount: parseInt(document.getElementById('adjustAmount').value)
//             })
//         });
//         const result = await response.json();
//         alert(result.message);
//     } catch (err) {
//         alert('Error: ' + err.message);
//     }
// });




document.getElementById('verifyTicketForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        const id = document.getElementById('verifyBookingId').value;
        const response = await fetch(`/api/verifyTicket/${id}`);
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
        const response = await fetch(`/api/getSchedule/${scheduleId}`);
        const result = await response.json();
        document.getElementById('scheduleData').textContent = JSON.stringify(result.data, null, 2);
    } catch (error) {
        document.getElementById('scheduleData').textContent = 'Error: ' + error.message;
    }
});

// document.getElementById('getAvailableSchedulesForm').addEventListener('submit', async (e) => {
//     e.preventDefault();

//     // 🧹 Reset seat picker
//     resetSeatPicker();
//     const frm=new FormData(document.getElementById('getAvailableSchedulesForm'))
//     const source = frm.get('scheduleSource').trim();
//     const destination = frm.get('scheduleDestination').trim();

//     try {
//         const response = await fetch(`/api/getAvailableSchedules?source=${source}&destination=${destination}`);
//         const result = await response.json();

//         if (!result.success) throw new Error(result.message);

//         window.rawSchedules = result.data;
//         window.providers = {};
//         window.transports = {};

//         for (const sched of result.data) {
//             const tResp = await fetch(`/api/getTransport/${sched.transportId}`);
//             const transport = (await tResp.json()).data;
//             window.transports[sched.transportId] = transport;

//             const pResp = await fetch(`/api/getProvider/${transport.providerId}`);
//             const provider = (await pResp.json()).data;
//             window.providers[transport.providerId] = provider;
//         }

//         renderFilteredSchedules(); // 🎯 This triggers rendering with search/sort/filter applied

//     } catch (error) {
//         alert("❌ Failed to fetch schedules: " + error.message);
//     }
// });

// ['scheduleSearchInput', 'sortField', 'sortDirection', 'onlyAvailable', 'filterType', 'maxPriceFilter']
// .forEach(id => {
//   document.getElementById(id).addEventListener('input', renderFilteredSchedules);
// });



//     // Booking Management
// document.getElementById('bookTicketForm').addEventListener('submit', async (e) => {
//     e.preventDefault();
//     try {
//         const response = await fetch('/api/bookTicket', {
//             method: 'POST',
//             headers: { 'Content-Type': 'application/json' },
//             body: JSON.stringify({
//                 bookingId: document.getElementById('bookingId').value,
//                 userId: document.getElementById('bookingUserId').value,
//                 scheduleId: document.getElementById('bookingScheduleId').value,
//                 seatNumber: document.getElementById('bookingSeatNumber').value
//             })
//         });
//         const result = await response.json();
//         if(result.success)
//         {
//             document.getElementById('bookingId').value= generateFixedId("book_");
//             document.getElementById('seatPickerSection').style.display = 'none';
//             document.getElementById('availableSeatsGrid').innerHTML = '';
//             document.getElementById('selectedSeatLabel').textContent = 'None';
//             window.multiBookingState = null;
//             document.getElementById('getAvailableSchedulesForm').dispatchEvent(new Event('submit'));



//         }
//         alert(result.message);
//     } catch (error) {
//         alert('Error: ' + error.message);
//     }
// });

// document.getElementById('deleteScheduleForm').addEventListener('submit', async (e) => {
//     e.preventDefault();
//     try {
//         const scheduleId = document.getElementById('deleteScheduleId').value;
//         const response = await fetch('/api/deleteSchedule', {
//             method: 'POST',
//             headers: { 'Content-Type': 'application/json' },
//             body: JSON.stringify({ scheduleId })
//         });
//         const result = await response.json();
//         alert(result.message);
//     } catch (error) {
//         alert('Error: ' + error.message);
//     }
// });

// document.getElementById('deleteTransportForm').addEventListener('submit', async (e) => {
//     e.preventDefault();
//     try {
//         const transportId = document.getElementById('deleteTransportId').value;
//         const response = await fetch('/api/deleteTransport', {
//             method: 'POST',
//             headers: { 'Content-Type': 'application/json' },
//             body: JSON.stringify({ transportId })
//         });
//         const result = await response.json();
//         alert(result.message);
//     } catch (error) {
//         alert('Error: ' + error.message);
//     }
// });

// document.getElementById('deleteProviderForm').addEventListener('submit', async (e) => {
//     e.preventDefault();
//     try {
//         const providerId = document.getElementById('deleteProviderId').value;
//         const response = await fetch('/api/deleteProvider', {
//             method: 'POST',
//             headers: { 'Content-Type': 'application/json' },
//             body: JSON.stringify({ providerId })
//         });
//         const result = await response.json();
//         alert(result.message);
//     } catch (error) {
//         alert('Error: ' + error.message);
//     }
// });

// document.getElementById('cancelTicketForm').addEventListener('submit', async (e) => {
//     e.preventDefault();
//     try {
//         const bookingId = document.getElementById('cancelBookingId').value;
//         const response = await fetch('/api/cancelTicket', {
//             method: 'POST',
//             headers: { 'Content-Type': 'application/json' },
//             body: JSON.stringify({ bookingId })
//         });
//         const result = await response.json();
//         alert(result.message);
//     } catch (error) {
//         alert('Error: ' + error.message);
//     }
// });

// document.getElementById('modifyTicketForm').addEventListener('submit', async (e) => {
//     e.preventDefault();
//     try {
//         const response = await fetch('/api/modifyTicket', {
//             method: 'POST',
//             headers: { 'Content-Type': 'application/json' },
//             body: JSON.stringify({
//                 oldBookingId: document.getElementById('modifyOldBookingId').value,
//                 newBookingId: document.getElementById('modifyNewBookingId').value,
//                 newScheduleId: document.getElementById('newScheduleId').value,
//                 newSeatNumber: document.getElementById('newSeatNumber').value
//             })
//         });
//         const result = await response.json();
//         alert(result.message);
//         if(result.success)
//         {
//             document.getElementById('modifyOldBookingId').value = '';
//             document.getElementById('newScheduleId').value = '';
//             document.getElementById('newSeatNumber').value = '';
//             document.getElementById('modifyNewBookingId').value = generateFixedId("book_");
//             document.getElementById('bookTicketForm').style.display = 'block';
//             document.getElementById('cancelModifyBtn').style.display = 'none';

//         }
//     } catch (error) {
//         alert('Error: ' + error.message);
//     }
// });

// document.getElementById('updateUserForm').addEventListener('submit', async (e) => {
//     e.preventDefault();

//     const userId = document.getElementById('updateUserId').value.trim();
//     const name = document.getElementById('updateName').value.trim();
//     const email = document.getElementById('updateEmail').value.trim();
//     const phone = document.getElementById('updatePhone').value.trim();
//     const isAnonymous = document.getElementById('updateIsAnonymous').checked;

//     // ✅ Basic validations
//     if (!userId) {
//         alert("❌ User ID is required.");
//         return;
//     }

//     if (!name) {
//         alert("❌ Name is required.");
//         return;
//     }

//     // ✅ Phone: 10 digits only
//     const phoneRegex = /^[0-9]{10}$/;
//     if (!phoneRegex.test(phone)) {
//         alert("❌ Phone number must be exactly 10 digits.");
//         return;
//     }

//     // ✅ Email validation
//     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//     if (!emailRegex.test(email)) {
//         alert("❌ Please enter a valid email address.");
//         return;
//     }

//     try {
//         const response = await fetch('/api/updateUser', {
//             method: 'POST',
//             headers: { 'Content-Type': 'application/json' },
//             body: JSON.stringify({ userId, name, email, phone, isAnonymous })
//         });

//         const result = await response.json();
//         if (result.success) {
//             alert("✅ User updated successfully!");
//         } else {
//             alert("❌ " + result.message);
//         }
//     } catch (error) {
//         alert("❌ Error while updating user: " + error.message);
//     }
// });

// document.getElementById('updateProviderForm').addEventListener('submit', async (e) => {
//     e.preventDefault();
//     try {
//         const response = await fetch('/api/updateProvider', {
//             method: 'POST',
//             headers: { 'Content-Type': 'application/json' },
//             body: JSON.stringify({
//                 id: document.getElementById('updateProviderId').value,
//                 name: document.getElementById('updateProviderName').value,
//                 rating: document.getElementById('updateProviderRating').value,
//                 isPublic: document.getElementById('updateProviderPublic').checked
//             })
//         });
//         const result = await response.json();
//         alert(result.message);
//     } catch (error) {
//         alert('Error: ' + error.message);
//     }
// });

// document.getElementById('getUserBookingsForm').addEventListener('submit', async (e) => {
//     e.preventDefault();
//     const userId = document.getElementById('userBookingsId').value.trim();
//     const tableBody = document.querySelector('#userBookingsTable tbody');
//     const container = document.getElementById('userBookingsContainer');
//     tableBody.innerHTML = '';
//     container.style.display = 'none';

//     try {
//         const resp = await fetch(`/api/getBookingsByUser/${userId}`);
//         const { data } = await resp.json();

//         for (const booking of data) {
//             const schedResp = await fetch(`/api/getSchedule/${booking.scheduleId}`);
//             const schedule = (await schedResp.json()).data;

//             const transportResp = await fetch(`/api/getTransport/${schedule.transportId}`);
//             const transport = (await transportResp.json()).data;

//             const providerResp = await fetch(`/api/getProvider/${transport.providerId}`);
//             const provider = (await providerResp.json()).data;

//             const departure = new Date(schedule.departure);
//             const formattedTime = departure.toLocaleString('en-IN', {
//                 day: 'numeric', month: 'short', hour: 'numeric',
//                 minute: '2-digit', weekday: 'short'
//             });

//             const now = new Date();
//             const isFuture = departure > now;

//             const row = document.createElement('tr');
//             row.innerHTML = `
//                 <td>${booking.id}</td>
//                 <td>${schedule.source}</td>
//                 <td>${schedule.destination}</td>
//                 <td>${formattedTime}</td>
//                 <td>${booking.seatNumber}</td>
//                 <td>₹${booking.pricePaid}</td>
//                 <td>${booking.status}</td>
//                 <td>${transport.type}</td>
//                 <td>${provider.name}</td>
//                 <td>${provider.rating}⭐</td>
//                 <td>
//                 ${isFuture && booking.status === 'confirmed' ? `
//                         <button onclick="cancelBooking('${booking.id}')">Cancel</button>
//                         <button onclick="prefillModify('${booking.id}', '${schedule.id}')">Modify</button>
//                     ` : '—'}
//                 </td>
//                 `;
//                 tableBody.appendChild(row);
//             }

//             container.style.display = 'block';
//         } catch (error) {
//             alert("❌ Failed to fetch bookings: " + error.message);
//         }
//     });

// document.getElementById('cancelModifyBtn').addEventListener('click', () => {
//     // Reset all modify fields
//     document.getElementById('modifyOldBookingId').value = '';
//     document.getElementById('newScheduleId').value = '';
//     document.getElementById('newSeatNumber').value = '';
//     document.getElementById('modifyNewBookingId').value = generateFixedId("book_");

//     // Show booking form again
//     document.getElementById('bookTicketForm').style.display = 'block';
//     document.getElementById('cancelModifyBtn').style.display = 'none';

//     alert("🧹 Modify mode cancelled. You can now book normally.");
// });


// document.getElementById('multiBookBtn').addEventListener('click', async () => {
//     console.log("📩 Book Multiple Button Clicked");

//     const userId = document.getElementById('bookingUserId').value.trim();
//     const state = window.multiBookingState || {};
//     const scheduleId = state.scheduleId;
//     const seats = [...(state.selectedSeats || [])].map(seat => seat.toString());


//     console.log({ userId, scheduleId, seats });

//     if (!userId) return alert("❌ Please enter a User ID before booking.");
//     if (!scheduleId || seats.length === 0) {
//         return alert("❌ No seats selected.");
//     }

//     const bookingIds = seats.map(() => generateFixedId("book_"));
//     console.log("Generated booking IDs:", bookingIds);

//     try {
//         const response = await fetch('/api/bookMultipleTickets', {
//             method: 'POST',
//             headers: { 'Content-Type': 'application/json' },
//             body: JSON.stringify({
//                 userId,
//                 scheduleId,
//                 seatNumbers: seats,
//                 bookingIds,
//             })
//         });

//         const result = await response.json();
//         alert(result.message || "Booking done");

//         if (result.success) {
//             window.multiBookingState = null;
//             document.getElementById('availableSeatsGrid').innerHTML = '';
//             document.getElementById('selectedSeatLabel').textContent = 'None';
//             document.getElementById('bookingSeatNumber').value = '';
//             document.getElementById('bookingScheduleId').value = '';
//             document.getElementById('seatPickerSection').style.display = 'none';
//             document.getElementById('availableSeatsGrid').innerHTML = '';
//             window.multiBookingState = null;
//             document.getElementById('getAvailableSchedulesForm').dispatchEvent(new Event('submit'));


//         }

//     } catch (error) {
//         alert("❌ Booking failed: " + error.message);
//     }
// });

// document.getElementById('getSchedulesByProviderForm').addEventListener('submit', async (e) => {
//   e.preventDefault();
//   const provId = document.getElementById('scheduleProviderId').value.trim();
//   const tableBody = document.querySelector('#providerScheduleTable tbody');
//   tableBody.innerHTML = "";

//   try {
//     const res = await fetch(`/api/getSchedulesByProvider/${provId}`);
//     const result = await res.json();
//     if (!result.success) throw new Error(result.message);

//     window.providerSchedules = result.data;
//     renderProviderSchedules();

// } catch (err) {
//     alert("❌ Error fetching schedules: " + err.message);
// }
// });

// function renderProviderSchedules() {
//   const data = window.providerSchedules || [];
//   const search = document.getElementById('scheduleSearch').value.toLowerCase();
//   const sortField = document.getElementById('scheduleSortField').value;
//   const sortDir = document.getElementById('scheduleSortDir').value;
//   const tbody = document.querySelector('#providerScheduleTable tbody');
//   tbody.innerHTML = "";

//   const filtered = data.filter(s => {
//     const weekday = new Date(s.departure).toLocaleDateString('en-IN', { weekday: 'long' }).toLowerCase();
//     return !search || (
//       s.source.toLowerCase().includes(search) ||
//       s.destination.toLowerCase().includes(search) ||
//       s.transportType.toLowerCase().includes(search) ||
//       weekday.startsWith(search)
//       );
// });

//   const sorted = filtered.sort((a, b) => {
//     let v1, v2;
//     switch (sortField) {
//     case 'departure':
//         v1 = new Date(a.departure).getTime();
//         v2 = new Date(b.departure).getTime();
//         break;
//     case 'currentPrice':
//         v1 = a.currentPrice;
//         v2 = b.currentPrice;
//         break;
//     case 'vacant':
//         v1 = a.available;
//         v2 = b.available;
//         break;
//     case 'booked':
//         v1 = Object.keys(a.bookedSeats || {}).length;
//         v2 = Object.keys(b.bookedSeats || {}).length;
//         break;
//     case 'transportType':
//         v1 = a.transportType.charCodeAt(0);
//         v2 = b.transportType.charCodeAt(0);
//         break;
//     default:
//         v1 = v2 = 0;
//     }
//     return sortDir === 'asc' ? v1 - v2 : v2 - v1;
// });

//   for (const sched of sorted) {
//     const booked = Object.keys(sched.bookedSeats || {}).length;
//     const dateStr = new Date(sched.departure).toLocaleString('en-IN', {
//       day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', weekday: 'short'
//   });

//     const row = document.createElement('tr');
//     row.innerHTML = `
//       <td>${sched.source}</td>
//       <td>${sched.destination}</td>
//       <td>${dateStr}</td>
//       <td>${sched.available}</td>
//       <td>${booked}</td>
//       <td>₹${sched.currentPrice}</td>
//       <td>${sched.transportType}</td>
//       <td>
//         <button onclick="prefillScheduleEdit('${sched.id}', '${sched.departure}', ${sched.basePrice}, ${sched.totalSeats - sched.available})">✏️ Edit</button>
//         <button onclick="deleteSchedule('${sched.id}')">🗑️ Delete</button>
//       </td>
//     `;
//     tbody.appendChild(row);
// }
// }

// ['scheduleSearch', 'scheduleSortField', 'scheduleSortDir']
// .forEach(id => document.getElementById(id).addEventListener('input', renderProviderSchedules));


// function renderUserTable() {
//   const tbody = document.querySelector('#allUsersTable tbody');
//   const search = document.getElementById('userSearch').value.trim().toLowerCase();
//   tbody.innerHTML = '';

//   const filtered = (window.allUsers || []).filter(user => {
//     return !search ||
//     user.name.toLowerCase().includes(search) ||
//     user.email.toLowerCase().includes(search);
// });

//   filtered.sort((a, b) => a.name.localeCompare(b.name)); // Sort by name

//   for (const user of filtered) {
//     const row = document.createElement('tr');
//     row.style.cursor = "pointer";
//     row.addEventListener('click', () => {
//       const adjustField = document.getElementById('adjustUserId');
//       const getField = document.getElementById('getUserId');

//       if (adjustField) {
//         adjustField.value = user.id;
//     }
//     if (getField) {
//         getField.value = user.id;
//     }

//     alert(`💡 Selected ${user.name} for wallet adjustment and user info.`);
// });



//     row.innerHTML = `
//       <td>${user.name}</td>
//       <td>${user.email}</td>
//     `;
//     tbody.appendChild(row);
// }
// }


// async function loadAllProviders() {
//   try {
//     const res = await fetch('/api/getAllProviders'); // You need this route
//     const result = await res.json();
//     if (!result.success) throw new Error(result.message);

//     const transportsRes = await fetch('/api/getAllTransports'); // You need this too
//     const transports = (await transportsRes.json()).data || [];

//     const grouped = result.data.map(provider => {
//       const providerTransports = transports.filter(t => t.providerId === provider.id);
//       return {
//         ...provider,
//         transportTypes: [...new Set(providerTransports.map(t => t.type))].join(", ")
//       };
//     });

//     window.allProviders = grouped;
//     renderProviderTable();

//   } catch (err) {
//     alert("❌ Failed to load providers: " + err.message);
//   }
// }


// function renderProviderTable() {
//   const search = document.getElementById('providerSearch').value.trim().toLowerCase();
//   const tbody = document.querySelector('#allProvidersTable tbody');
//   tbody.innerHTML = "";

//   const filtered = (window.allProviders || []).filter(p => {
//     return !search ||
//       p.name.toLowerCase().includes(search) ||
//       p.transportTypes.toLowerCase().includes(search);
//   });

//   filtered.sort((a, b) => a.name.localeCompare(b.name));

//   for (const p of filtered) {
//     const row = document.createElement('tr');
//     row.style.cursor = "pointer";
//     row.addEventListener('click', () => {
//       const getField = document.getElementById('getProviderId');
//       if (getField) {
//         getField.value = p.id;
//         alert(`💡 Selected ${p.name} for provider lookup.`);
//       }
//     });

//     row.innerHTML = `
//       <td>${p.name}</td>
//       <td>${p.rating}</td>
//       <td>${p.transportTypes || '-'}</td>
//     `;
//     tbody.appendChild(row);
//   }
// }


// document.getElementById('providerSearch').addEventListener('input', renderProviderTable);

// loadAllProviders();

// document.getElementById('userSearch').addEventListener('input', renderUserTable);
// loadAllUsers();


   //===========================

});



//  window.handleBookClick = async function (schedule) {
//     const grid = document.getElementById('availableSeatsGrid');
//     const label = document.getElementById('selectedSeatLabel');
//     const picker = document.getElementById('seatPickerSection');

//     picker.style.display = 'block';
//     label.textContent = "None";
//     grid.innerHTML = "";

//     const selectedSeats = new Set();

//     schedule.vacantSeatNumbers.forEach(seat => {
//         const btn = document.createElement('button');
//         btn.textContent = seat;
//         btn.className = 'seat-btn';
//         btn.dataset.seat = seat;

//         btn.addEventListener('click', () => {
//             if (selectedSeats.has(seat)) {
//                 selectedSeats.delete(seat);
//                 btn.style.backgroundColor = "#e0f7fa";
//             } else {
//                 selectedSeats.add(seat);
//                 btn.style.backgroundColor = "#4CAF50";
//             }

//             label.textContent = [...selectedSeats].join(', ') || "None";

//             const isModify = document.getElementById('modifyOldBookingId').value.trim();

//             if (!isModify) {
//                 document.getElementById('bookingScheduleId').value = schedule.id;

//                 if (selectedSeats.size === 1) {
//                     document.getElementById('bookingSeatNumber').value = [...selectedSeats][0];
//                 } else {
//                     document.getElementById('bookingSeatNumber').value = '';
//                 }
//             } else {
//                 // In modify mode
//                 if (selectedSeats.size === 1) {
//                     document.getElementById('newScheduleId').value = schedule.id;
//                     document.getElementById('newSeatNumber').value = [...selectedSeats][0];
//                 } else {
//                     document.getElementById('newSeatNumber').value = '';
//                 }
//             }

//             // Save state globally for multi-book
//             window.multiBookingState = {
//                 scheduleId: schedule.id,
//                 selectedSeats,
//             };
//         });

//         grid.appendChild(btn);
//     });
// };




// window.cancelBooking = async function (bookingId) {
//     if (!confirm("Are you sure you want to cancel this booking?")) return;

//     try {
//         const resp = await fetch('/api/cancelTicket', {
//             method: 'POST',
//             headers: { 'Content-Type': 'application/json' },
//             body: JSON.stringify({ bookingId })
//         });
//         const result = await resp.json();
//         alert(result.message);
//     } catch (err) {
//         alert("❌ Cancel failed: " + err.message);
//     }
// };

// window.prefillModify = function (bookingId, oldScheduleId) {
//     document.getElementById('modifyOldBookingId').value = bookingId;

//     // Optional: Clear previously selected schedule and seat
//     document.getElementById('newScheduleId').value = '';
//     document.getElementById('newSeatNumber').value = '';
//     document.getElementById('modifyNewBookingId').value = generateFixedId('book_');

//     alert("✅ Modify mode activated! Now search for a new schedule and select a seat.");
//     document.getElementById('bookTicketForm').style.display = 'none';

//     document.getElementById('cancelModifyBtn').style.display = 'inline-block';
//     document.getElementById('bookTicketForm').style.display = 'none';


// };


// window.deleteTransport = async function (transportId) {
//   if (!confirm(`Are you sure you want to delete ${transportId}?`)) return;

//   try {
//     const resp = await fetch('/api/deleteTransport', {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({ transportId })
//   });

//     const result = await resp.json();
//     alert(result.message);

//     // Auto-refresh the list
//     document.getElementById('getTransportsByProviderForm')
//     .dispatchEvent(new Event('submit'));

// } catch (error) {
//     alert("❌ Failed to delete: " + error.message);
// }
// }



// window.prefillSchedule = function (transportId) {
//   document.getElementById('scheduleTransportId').value = transportId;

//   // Optional: focus on schedule creation section
//   document.getElementById('scheduleTransportId').scrollIntoView({ behavior: 'smooth', block: 'center' });

//   alert("✅ Transport ID loaded into 'Create Schedule' form. Please complete the rest and submit.");
// };


// window.prefillScheduleEdit = function (id, departure, basePrice, bookedSeats) {
//   document.getElementById('modifyScheduleId').value = id;
//   document.getElementById('modifyScheduleDate').value = departure.slice(0, 16); // datetime-local format
//   document.getElementById('modifySchedulePrice').value = basePrice;
//   document.getElementById('modifyScheduleSeats').value = 0; // user must increase seats only

//   alert("✏️ Schedule loaded. You can only modify price/date or increase seats.");
// };

// window.deleteSchedule = async function (scheduleId) {
//   if (!confirm(`Are you sure to delete ${scheduleId}? All users will be refunded.`)) return;

//   try {
//     const res = await fetch('/api/deleteSchedule', {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({ scheduleId })
//   });

//     const result = await res.json();
//     alert(result.message);

//     // Refresh
//     document.getElementById('getSchedulesByProviderForm').dispatchEvent(new Event('submit'));

// } catch (error) {
//     alert("❌ Failed to delete: " + error.message);
// }
// }


// setInterval(() => {
//   fetch('/api/confirmPendingBookings', { method: 'POST' })
//     .then(res => res.json())
//     .then(data => {
//       if (data.success && data.confirmed.length > 0) {
//         console.log("✅ Confirmed:", data.confirmed);
//       }
//     });
// }, 30000);
