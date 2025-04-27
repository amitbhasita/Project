const express = require('express');
const { Gateway, Wallets } = require('fabric-network');
const protos = require('fabric-protos');
const bodyParser = require('body-parser');
const crypto = require('crypto');
// const { qsccContract } = require('./fabric-qscc-utils'); // see next step

const { qsccContract, parseBlockNumber } = require('./fabric-qscc-utils');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
// app.use(bodyParser.json());
const sessionStore = {}; // In-memory session store
app.use(express.json());
app.use(cors());
app.use(express.static('public'));

// ========== CONFIGURATION ========== //
const PORT = 3000;
const channelName = 'ticketchannel';
const chaincodeName = 'ticketbooking';
const walletPath = path.join(process.cwd(), 'wallet');

const mongoose = require('mongoose');
const User = require('./models/User'); // Import MongoDB User schema
const Provider = require('./models/Provider'); // Import the Provider model
const Transport = require('./models/Transport'); 
const Schedule = require('./models/Schedule'); 








// Connect to MongoDB (make sure MongoDB is running locally or use a cloud instance)
mongoose.connect('mongodb://localhost:27017/ticketBooking', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log("Connected to MongoDB"))
.catch((err) => console.log("MongoDB connection error: ", err));

function hashString(str) {
  return crypto.createHash('sha256').update(str).digest('hex');
}

// ========== WALLET INITIALIZATION ========== //
async function setupIdentityForOrg(org) {
  const wallet = await Wallets.newFileSystemWallet(walletPath);

  const identityLabel = `admin-${org}`;
  const userName = `Admin@${org}.example.com`;
  const credPath = path.join(
    __dirname,
  `../../test-network/organizations/peerOrganizations/${org}.example.com/users/${userName}/msp`
  );

  const certFile = fs.readdirSync(path.join(credPath, 'signcerts'))
  .find(f => f.endsWith('.pem'));
  const keyFile = fs.readdirSync(path.join(credPath, 'keystore'))
  .find(f => f.endsWith('_sk'));

  const cert = fs.readFileSync(path.join(credPath, 'signcerts', certFile)).toString();
  const key = fs.readFileSync(path.join(credPath, 'keystore', keyFile)).toString();

  const identity = {
    credentials: { certificate: cert, privateKey: key },
    mspId: org === 'org1' ? 'Org1MSP' : 'Org2MSP',
    type: 'X.509'
  };

  await wallet.put(identityLabel, identity);
  console.log(`✅ Admin identity for ${org} registered in wallet.`);
}

// ========== FABRIC NETWORK CONNECTION ========== //
async function connectToNetwork() {
  try {
        // 🔁 Randomly pick org1 or org2 for load balancing
    const org = Math.random() > 0.5 ? 'org1' : 'org2';
    const identityLabel = `admin-${org}`;
    const wallet = await Wallets.newFileSystemWallet(walletPath);

    let identity = await wallet.get(identityLabel);
    if (!identity) {
      await setupIdentityForOrg(org);
      identity = await wallet.get(identityLabel);
    }

    const ccpPath = path.join(
      __dirname,
    `../../test-network/organizations/peerOrganizations/${org}.example.com/connection-${org}.json`
    );
    const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

    const gateway = new Gateway();
    await gateway.connect(ccp, {
      wallet,
      identity: identityLabel,
      discovery: { enabled: true, asLocalhost: true }
    });

    const network = await gateway.getNetwork(channelName);
    const contract = network.getContract(chaincodeName);

    return { gateway, contract, org };
  } catch (error) {
    console.error('❌ Failed to connect:', error);
    throw error;
  }
}

app.post('/api/registerUser', async (req, res) => {
  const { name, email, phone, isAnonymous, password, role } = req.body;

  // Check if the user already exists in MongoDB
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({ success: false, message: `User with email ${email} already exists.` });
  }

  // Hash the password
  const hashedPassword = hashString(password);

  try {
    // Create a new user and save to MongoDB
    const user = new User({
      name,
      email,
      phone,
      isAnonymous,
      password: hashedPassword,
      role,
      walletBalance: 1000, // Initialize wallet balance
      registrationDate: new Date()
    });

    await user.save(); // Save to MongoDB

    res.json({ success: true, message: 'User registered successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});


app.post('/api/registerProvider', async (req, res) => {
  const { id, name, ownerName, rating, isPublic, email, phone, password } = req.body;

  // Validate rating (1-5)
  if (rating < 1 || rating > 5) {
    return res.status(400).json({ success: false, message: 'Rating must be between 1-5' });
  }

  // Check if provider already exists
  const existingProvider = await Provider.findOne({ email });
  if (existingProvider) {
    return res.status(400).json({ success: false, message: `Provider with email ${email} already exists` });
  }

  // Hash the password
  const hashedPassword = hashString(password);

  try {
    // Create a new provider
    const provider = new Provider({
      id,
      name,
      ownerName,
      rating,
      isPublic,
      email,
      phone,
      password: hashedPassword,
      role: 'provider',
    });

    await provider.save(); // Save to MongoDB

    res.json({ success: true, message: 'Provider registered successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});


app.get('/api/getUserPrivate/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.phone = '';
    // user.email = '';
    user.password = ''; // Hide password
    user.role = '';
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});


app.get('/api/getUserPublic/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Apply privacy filters: Hide sensitive fields
    if (user.isAnonymous) {
      user.name = 'Anonymous';
    }
    user.phone = '';
    // user.email = '';
    user.password = ''; // Hide password
    user.role = '';

    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/getProvider/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // Fetch provider from MongoDB
    const provider = await Provider.findById(id);
    if (!provider) {
      return res.status(404).json({ success: false, message: 'Provider not found' });
    }

    // Apply privacy filters: Hide sensitive fields
    provider.phone = '';
    // provider.email = '';
    provider.password = ''; // Hide password
    provider.role = ''; // Hide role if not needed

    // If provider is not public, set name to "Anonymous Provider"
    if (!provider.isPublic) {
      provider.name = 'Anonymous Provider';
    }

    res.json({ success: true, data: provider });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/addTransport', async (req, res) => {
  const { id, providerId, transportType } = req.body;

  // Validate transport type
  const validTypes = ['plane', 'train', 'bus'];
  if (!validTypes.includes(transportType)) {
    return res.status(400).json({ success: false, message: 'Invalid transport type (must be plane/train/bus)' });
  }

  try {
    // Check if transport already exists in MongoDB
    const existingTransport = await Transport.findById(id);
    if (existingTransport) {
      return res.status(400).json({ success: false, message: `Transport with id ${id} already exists` });
    }

    // Create a new transport record and save to MongoDB
    const transport = new Transport({
      id,
      providerId,
      type: transportType
    });

    await transport.save(); // Save to MongoDB

    res.json({ success: true, message: 'Transport added successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/getTransport/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // Fetch transport from MongoDB
    const transport = await Transport.findById(id);
    if (!transport) {
      return res.status(404).json({ success: false, message: `Transport with id ${id} not found` });
    }

    res.json({ success: true, data: transport });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});


app.post('/api/updateUser', async (req, res) => {
  const { id, name, phone, isAnonymous } = req.body;

  try {
    // Fetch user from MongoDB
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // ✅ Only update non-sensitive fields
    user.name = name;
    user.phone = phone;
    user.isAnonymous = isAnonymous;

    // ❌ Ensure email, role, and password are not modified
    // These fields will be ignored

    await user.save(); // Save updated user to MongoDB

    res.json({ success: true, message: 'User updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});


app.post('/api/updateProvider', async (req, res) => {
  const { id, name, ownerName, phone, rating, isPublic } = req.body;

  // Validate rating (1-5)
  if (rating < 1 || rating > 5) {
    return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
  }

  try {
    // Fetch provider from MongoDB
    const provider = await Provider.findById(id);
    if (!provider) {
      return res.status(404).json({ success: false, message: 'Provider not found' });
    }

    // ✅ Only update allowed fields
    provider.name = name;
    provider.ownerName = ownerName;
    provider.phone = phone;
    provider.rating = rating;
    provider.isPublic = isPublic;

    // ❌ Do NOT change email, password, or role

    await provider.save(); // Save updated provider to MongoDB

    res.json({ success: true, message: 'Provider updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});


app.post('/api/createSchedule', async (req, res) => {
  const { id, transportId, departure, source, destination, totalSeats, basePrice } = req.body;

  // Validate transport exists in MongoDB
  const transport = await Transport.findById(transportId);
  if (!transport) {
    return res.status(400).json({ success: false, message: `Transport with id ${transportId} does not exist` });
  }

  // Parse departure time
  const parsedDeparture = new Date(departure);
  if (isNaN(parsedDeparture)) {
    return res.status(400).json({ success: false, message: `Invalid departure time format` });
  }

  try {
    // Check if schedule already exists
    const existingSchedule = await Schedule.findOne({ id });
    if (existingSchedule) {
      return res.status(400).json({ success: false, message: `Schedule with id ${id} already exists` });
    }

    // Create new schedule
    const schedule = new Schedule({
      id,
      transportId,
      departure: parsedDeparture.toISOString(),
      source,
      destination,
      totalSeats,
      basePrice,
      availableSeats: totalSeats,
      bookedSeats: {},
      currentPrice: basePrice,
      lastModified: new Date().toISOString(),
    });

    await schedule.save(); // Save to MongoDB

    res.json({ success: true, message: 'Schedule created successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/getSchedule/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const schedule = await Schedule.findById(id);
    if (!schedule) {
      return res.status(404).json({ success: false, message: `Schedule with id ${id} not found` });
    }

    const currentTime = new Date();
    const dynamicPrice = calculateDynamicPrice(schedule, schedule.departure, currentTime);

    // Return the schedule with the dynamic price
    res.json({ success: true, data: { ...schedule.toObject(), dynamicPrice } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/userExists/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // Check if user exists in MongoDB
    const user = await User.findById(id);
    if (user) {
      return res.json({ success: true, exists: true });
    }

    return res.json({ success: true, exists: false });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});


async function invokeChaincode(functionName, args) {
  const walletPath = path.join(process.cwd(), 'wallet');
  const wallet = await Wallets.newFileSystemWallet(walletPath);
  
  const gateway = await Gateway.createGateway({
    wallet,
    identity: 'admin', // Use correct identity (admin or user)
    discovery: { enabled: true, asLocalhost: true }
  });

  const network = await gateway.getNetwork('ticketchannel');
  const contract = network.getContract('ticketbooking');

  const result = await contract.submitTransaction(functionName, ...args);
  
  await gateway.disconnect();

  return result;
}


const User = require('./models/User');
const Schedule = require('./models/Schedule');

app.delete('/api/deleteUser/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // 1. Check if user exists
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: `User with id ${id} does not exist` });
    }

    // 2. Fetch all bookings of user
    const result = await invokeChaincode('GetBookingsByUser', [id]);
    const bookings = JSON.parse(result.toString());

    for (const booking of bookings) {
      if (booking.status === 'confirmed') {
        // 3. Refund 50% of pricePaid
        const refund = Math.floor(booking.pricePaid * 0.5);

        // 4. Cancel ticket with refund
        await invokeChaincode('CancelTicket', [booking.id, refund.toString()]);
      }
    }

    // 5. Delete user from MongoDB
    await user.deleteOne();

    res.json({ success: true, message: 'User and all active bookings cancelled and refunded (50%)' });

  } catch (err) {
    console.error('❌ Error deleting user:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});



const Schedule = require('./models/Schedule');

app.post('/api/cancelTicket', async (req, res) => {
  try {
    const { bookingId } = req.body;

    if (!bookingId) {
      return res.status(400).json({ success: false, message: 'bookingId is required' });
    }

    const { gateway, contract } = await connectToNetwork();

    // 1. Get booking
    const bookingResult = await contract.evaluateTransaction('GetBooking', bookingId);
    const booking = JSON.parse(bookingResult.toString());

    if (booking.userId !== req.body.userId) { // For now — replace with session.userId when auth re-enabled
      gateway.disconnect();
      return res.status(403).json({ success: false, message: 'You can only cancel your own bookings.' });
    }

    // 2. Get schedule from MongoDB
    const schedule = await Schedule.findById(booking.scheduleId);
    if (!schedule) {
      gateway.disconnect();
      return res.status(404).json({ success: false, message: 'Schedule not found.' });
    }

    // 3. Check departure is in the future
    const departure = new Date(schedule.departure);
    const now = new Date();
    if (departure <= now) {
      gateway.disconnect();
      return res.status(400).json({ success: false, message: 'Cannot cancel a past or departed ticket.' });
    }

    // 4. Grace refund window check
    const bookingTime = new Date(booking.timestamp);
    const modifiedTime = new Date(schedule.lastModified);
    let refund = 0;

    if ((modifiedTime > bookingTime) && ((modifiedTime - bookingTime) / 1000 <= 10)) {
      refund = booking.pricePaid;
    } else {
      const hoursLeft = (departure - now) / (1000 * 60 * 60);
      const penalty = hoursLeft < 24
        ? Math.floor(booking.pricePaid * 0.2)
        : hoursLeft < 48
          ? Math.floor(booking.pricePaid * 0.1)
          : 0;
      refund = booking.pricePaid - penalty;
      if (refund < 0) refund = 0;
    }

    // 5. Submit to chaincode
    await contract.submitTransaction('CancelTicket', bookingId, refund.toString());
    gateway.disconnect();

    res.json({
      success: true,
      message: 'Ticket cancelled and refund processed',
      refund
    });

  } catch (error) {
    console.error('❌ Cancel ticket error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});


function calculateDynamicPrice(schedule, departure, currentTime) {
  const demandRatio = schedule.bookedSeats.size / schedule.totalSeats;
  const timeToGo = (new Date(departure) - currentTime) / (1000 * 60 * 60); // Convert to hours
  let timeRatio = 1 - (timeToGo / 168.0); // Normalize over 7 days

  if (timeRatio < 0) timeRatio = 0;
  if (timeRatio > 1) timeRatio = 1;

  const alpha = 0.5;
  const beta = 0.3;

  let multiplier = 1 + (alpha * demandRatio) + (beta * timeRatio);
  let price = Math.floor(schedule.basePrice * multiplier);

  // Cap max price at 2× base
  if (price > 2 * schedule.basePrice) {
    price = 2 * schedule.basePrice;
  }

  return price;
}


app.post('/api/modifySchedule', async (req, res) => {
  const { scheduleId, newDeparture, newBasePrice, additionalSeats } = req.body;

  try {
    // 1. Fetch the schedule from MongoDB
    const schedule = await Schedule.findById(scheduleId);
    if (!schedule) {
      return res.status(404).json({ success: false, message: `Schedule with id ${scheduleId} not found` });
    }

    // 2. Validate the new departure time
    const parsedTime = new Date(newDeparture);
    if (isNaN(parsedTime)) {
      return res.status(400).json({ success: false, message: 'Invalid departure format' });
    }

    const now = new Date();
    if (parsedTime <= now) {
      return res.status(400).json({ success: false, message: 'Departure must be a future date/time' });
    }

    // 3. Update schedule fields
    schedule.departure = parsedTime.toISOString();
    schedule.basePrice = newBasePrice;
    schedule.currentPrice = newBasePrice;
    schedule.totalSeats += additionalSeats;
    schedule.availableSeats += additionalSeats;
    schedule.lastModified = new Date().toISOString();

    // 4. Save the updated schedule to MongoDB
    await schedule.save();

    // Optionally: Recalculate dynamic price based on updated data
    const dynamicPrice = calculateDynamicPrice(schedule, parsedTime, now);

    res.json({ success: true, message: 'Schedule updated successfully', dynamicPrice });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});


app.get('/api/getTransportsByProvider/:providerId', async (req, res) => {
  const { providerId } = req.params;

  try {
    // Fetch transports from MongoDB by providerId
    const transports = await Transport.find({ providerId });
    if (!transports || transports.length === 0) {
      return res.status(404).json({ success: false, message: `No transports found for provider ${providerId}` });
    }

    res.json({ success: true, data: transports });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/getSchedulesByProvider/:providerId', async (req, res) => {
  const { providerId } = req.params;

  try {
    // Fetch all schedules from MongoDB
    const schedules = await Schedule.find();

    // Filter schedules based on providerId from transport
    const result = [];

    for (const schedule of schedules) {
      // Fetch transport details by transportId
      const transport = await Transport.findById( schedule.transportId );

      if (transport && transport.providerId === providerId) {
        // Construct the response with necessary schedule details
        const schedMap = {
          id: schedule.id,
          departure: schedule.departure,
          source: schedule.source,
          destination: schedule.destination,
          totalSeats: schedule.totalSeats,
          basePrice: schedule.basePrice,
          available: schedule.availableSeats,
          bookedSeats: schedule.bookedSeats,
          currentPrice: schedule.currentPrice,
          transportId: schedule.transportId,
          transportType: transport.type
        };

        result.push(schedMap);
      }
    }

    if (result.length === 0) {
      return res.status(404).json({ success: false, message: `No schedules found for provider ${providerId}` });
    }

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/getAllUsers', async (req, res) => {
  try {
    // Fetch all users from MongoDB
    const users = await User.find();

    // Exclude sensitive fields (password, email, phone)
    const sanitizedUsers = users.map(user => {
      user.password = '';
      // user.email = '';
      user.phone = ''; // Remove phone if needed
      return user;
    });

    res.json({ success: true, data: sanitizedUsers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/getAllProviders', async (req, res) => {
  try {
    // Fetch all users from MongoDB
    const providers = await Provider.find();

    // Exclude sensitive fields (password, email, phone)
    const sanitizedProviders = providers.map(provider => {
      provider.password = '';
      provider.ownerName = '';
      provider.phone = ''; // Remove phone if needed
      return provider;
    });

    res.json({ success: true, data: sanitizedProviders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/getAllTransports', async (req, res) => {
  try {
    // Fetch all users from MongoDB
    const transports = await Transport.find();


    res.json({ success: true, data: transports });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});


app.get('/api/GetUserByEmail/:emailid', async (req, res) => {
  try {
    // Fetch all users from MongoDB
    const { emailid } = req.params;
    const user = await User.findOne({email:emailid});

    // // Exclude sensitive fields (password, email, phone)
    // const sanitizedUsers = users.map(user => {
      user.password = '';
      user.phone = ''; // Remove phone if needed
    //   return user;
    // });

    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/GetProviderByEmail/:emailid', async (req, res) => {
  try {
    // Fetch all users from MongoDB
    const { emailid } = req.params;
    const prov = await Provider.findOne({email:emailid});

    // // Exclude sensitive fields (password, email, phone)
    // const sanitizedUsers = users.map(user => {
      prov.password = '';
      prov.ownerName='';
      prov.phone = ''; // Remove phone if needed
    //   return user;
    // });

    res.json({ success: true, data: prov });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

const Schedule = require('./models/Schedule');
const User = require('./models/User');

app.delete('/api/deleteScheduleAndRefund/:scheduleId', async (req, res) => {
  const { scheduleId } = req.params;

  try {
    // 1. Fetch the schedule
    const schedule = await Schedule.findById(scheduleId);
    if (!schedule) {
      return res.status(404).json({ success: false, message: `Schedule with id ${scheduleId} not found` });
    }

    // 2. Refund each booked user
    for (const [seatNumber, userId] of schedule.bookedSeats.entries()) {
      // 3. Fetch user from MongoDB by userId
      const user = await User.findById(userId);
      if (!user) {
        console.warn(`⚠️ User not found: ${userId}`);
        continue;
      }

      // 4. Refund the user in MongoDB
      user.walletBalance += schedule.currentPrice;
      await user.save();

      // 5. Update user wallet in chaincode
      await invokeChaincode('AdjustUserWallet', [userId, schedule.currentPrice.toString()]);

      // 6. Mark bookings as refunded in chaincode
      await invokeChaincode('RefundBookingsByUserAndSchedule', [userId, scheduleId]);
    }

    // 7. Delete schedule from MongoDB
    await schedule.deleteOne();

    res.json({ success: true, message: 'Schedule deleted and all bookings refunded' });

  } catch (err) {
    console.error('❌ Error deleting schedule and refunding:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});



app.delete('/api/deleteTransportAndSchedules/:transportId', async (req, res) => {
  const { transportId } = req.params;

  try {
    // 1. Fetch transport from MongoDB
    const transport = await Transport.findById(transportId);
    if (!transport) {
      return res.status(404).json({ success: false, message: `Transport with id ${transportId} not found` });
    }

    // 2. Find and delete all schedules associated with the transport
    const schedules = await Schedule.find({ transportId });

    // For each schedule related to the transport, call the deleteScheduleAndRefund route
    for (const schedule of schedules) {
      const scheduleResponse = await fetch(`http://localhost:3000/api/deleteScheduleAndRefund/${schedule.id}`, {
        method: 'DELETE',
      });

      const result = await scheduleResponse.json();
      if (!result.success) {
        console.warn(`Failed to delete and refund schedule with ID ${schedule.id}:`, result.message);
      }
    }

    // 3. Delete the transport from MongoDB
    await transport.deleteOne();

    res.json({ success: true, message: 'Transport and associated schedules deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/deleteProviderAndTransports/:providerId', async (req, res) => {
  const { providerId } = req.params;

  try {
    // 1. Fetch provider from MongoDB
    const provider = await Provider.findById(providerId);
    if (!provider) {
      return res.status(404).json({ success: false, message: `Provider with id ${providerId} not found` });
    }

    // 2. Find all transports associated with the provider
    const transports = await Transport.find({ providerId });

    // 3. For each transport, invoke the deleteTransportAndSchedules route
    for (const transport of transports) {
      const transportResponse = await fetch(`http://localhost:3000/api/deleteTransportAndSchedules/${transport.id}`, {
        method: 'DELETE',
      });

      const result = await transportResponse.json();
      if (!result.success) {
        console.warn(`Failed to delete transport with ID ${transport.id}:`, result.message);
      }
    }

    // 4. Delete the provider from MongoDB
    await provider.deleteOne();

    res.json({ success: true, message: 'Provider and associated transports deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});


const Schedule = require('./models/Schedule');
const Transport = require('./models/Transport');
const User = require('./models/User');

app.post('/api/modifyTicket', async (req, res) => {
  try {
    const { oldBookingId, newBookingId, newScheduleId, newSeatNumber, userId } = req.body;

    if (!oldBookingId || !newBookingId || !newScheduleId || !newSeatNumber || !userId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: oldBookingId, newBookingId, newScheduleId, newSeatNumber, userId'
      });
    }

    const { gateway, contract } = await connectToNetwork();

    // 🛡️ Step 1: Fetch old booking
    const result = await contract.evaluateTransaction('GetBooking', oldBookingId);
    const booking = JSON.parse(result.toString());

    if (booking.userId !== userId) {
      gateway.disconnect();
      return res.status(403).json({ success: false, message: 'You can only modify your own bookings.' });
    }

    if (booking.scheduleId === newScheduleId) {
      gateway.disconnect();
      return res.status(400).json({ success: false, message: 'Cannot modify to the same schedule.' });
    }

    // 🗓️ Step 2: Validate schedules and transport type
    const [oldSchedule, newSchedule] = await Promise.all([
      Schedule.findById(booking.scheduleId),
      Schedule.findById(newScheduleId)
    ]);

    if (!oldSchedule || !newSchedule) {
      gateway.disconnect();
      return res.status(404).json({ success: false, message: 'One of the schedules was not found.' });
    }

    if (!oldSchedule.departure || !newSchedule.departure) {
      gateway.disconnect();
      return res.status(400).json({ success: false, message: 'Invalid departure times in schedules.' });
    }

    const oldDeparture = new Date(oldSchedule.departure);
    const newDeparture = new Date(newSchedule.departure);
    const now = new Date();

    if (oldDeparture <= now) {
      gateway.disconnect();
      return res.status(400).json({ success: false, message: 'Cannot modify a past or departed ticket.' });
    }
    if (newDeparture <= now) {
      gateway.disconnect();
      return res.status(400).json({ success: false, message: 'New schedule must be in the future.' });
    }

    const oldTransport = await Transport.findById(oldSchedule.transportId);
    const newTransport = await Transport.findById(newSchedule.transportId);
    if (!oldTransport || !newTransport || oldTransport.type !== newTransport.type) {
      gateway.disconnect();
      return res.status(400).json({ success: false, message: 'Transport type mismatch between schedules.' });
    }

    if (newSchedule.bookedSeats?.get(newSeatNumber)) {
      gateway.disconnect();
      return res.status(400).json({ success: false, message: `Seat ${newSeatNumber} is already booked.` });
    }

    // 💰 Step 3: Calculate penalty and refund
    const hoursLeft = (oldDeparture - now) / (1000 * 60 * 60);
    const penalty = hoursLeft < 24
      ? Math.floor(booking.pricePaid * 0.2)
      : hoursLeft < 48
        ? Math.floor(booking.pricePaid * 0.1)
        : 0;

    const refund = booking.pricePaid - penalty;
    const newPrice = newSchedule.currentPrice;

    const user = await User.findById(userId);
    if (!user) {
      gateway.disconnect();
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const effectiveBalance = user.walletBalance + refund;
    if (effectiveBalance < newPrice) {
      gateway.disconnect();
      return res.status(400).json({
        success: false,
        message: `Not enough balance. Refund ₹${refund}, price ₹${newPrice}, total available ₹${effectiveBalance}`
      });
    }

    // 🧾 Step 4: Submit modify transaction
    console.log(`✏️ Modifying ${oldBookingId} to ${newBookingId} for user ${userId}`);

    await contract.submitTransaction(
      'ModifyTicket',
      oldBookingId,
      newBookingId,
      newScheduleId,
      newSeatNumber,
      newPrice.toString(),
      penalty.toString()
    );

    gateway.disconnect();

    res.json({
      success: true,
      message: 'Ticket modified successfully',
      refund,
      penalty,
      paid: newPrice
    });

  } catch (error) {
    console.error('❌ Modify ticket error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});



app.get('/api/getAvailableSchedules', async (req, res) => {
  const { source, destination } = req.query;

  try {
    // Fetch all schedules from MongoDB that match the source and destination
    const schedules = await Schedule.find({
      source: { $regex: source, $options: 'i' },
      destination: { $regex: destination, $options: 'i' },
    });

    if (!schedules || schedules.length === 0) {
      return res.status(404).json({ success: false, message: `No schedules found for source: ${source} and destination: ${destination}` });
    }

    // Prepare the result with vacant seat information
    const result = schedules.map(schedule => {
      // Calculate vacant seats
      const vacantSeats = [];
      for (let i = 1; i <= schedule.totalSeats; i++) {
        const seat = i.toString();
        if (!schedule.bookedSeats[seat]) {
          vacantSeats.push(i);
        }
      }

      return {
        id: schedule.id,
        transportId: schedule.transportId,
        departure: schedule.departure,
        source: schedule.source,
        destination: schedule.destination,
        availableSeats: schedule.availableSeats,
        totalSeats: schedule.totalSeats,
        basePrice: schedule.basePrice,
        bookedSeats: schedule.bookedSeats,
        currentPrice: schedule.currentPrice,
        vacantSeatNumbers: vacantSeats,
        vacantCount: vacantSeats.length
      };
    });

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

const Schedule = require('./models/Schedule');

app.post('/api/bookTicket', async (req, res) => {
  try {
    const { bookingId, userId, scheduleId, seatNumber } = req.body;

    if (!bookingId || !userId || !scheduleId || !seatNumber) {
      return res.status(400).json({
        success: false,
        message: 'bookingId, userId, scheduleId, and seatNumber are required.'
      });
    }

    // 🔍 Fetch schedule from MongoDB
    const schedule = await Schedule.findById(scheduleId);
    if (!schedule) {
      return res.status(404).json({ success: false, message: 'Schedule not found.' });
    }

    const seatNum = parseInt(seatNumber);
    if (isNaN(seatNum) || seatNum < 1 || seatNum > schedule.totalSeats) {
      return res.status(400).json({
        success: false,
        message: `Invalid seat number ${seatNumber}. Must be between 1 and ${schedule.totalSeats}.`
      });
    }

    if (schedule.bookedSeats?.get(seatNumber)) {
      return res.status(400).json({
        success: false,
        message: `Seat ${seatNumber} is already booked.`
      });
    }

    // 💰 Compute dynamic price
    const departureTime = new Date(schedule.departure);
    const currentTime = new Date();
    const price = calculateDynamicPrice(schedule, departureTime, currentTime);

    // 🔗 Submit to chaincode
    const { gateway, contract } = await connectToNetwork();

    await contract.submitTransaction(
      'BookTicket',
      bookingId,
      userId,
      scheduleId,
      seatNumber,
      price.toString()
    );

    gateway.disconnect();

    // ✅ Update MongoDB state
    schedule.bookedSeats.set(seatNumber, userId);
    schedule.availableSeats -= 1;
    schedule.lastModified = new Date();
    await schedule.save();

    res.json({
      success: true,
      message: 'Ticket booked successfully',
      bookingId,
      paid: price
    });

  } catch (error) {
    console.error('❌ Error in bookTicket:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});



const express = require('express');
const app = express();

app.post('/api/adjustWallet', async (req, res) => {
  try {
    const { userId, amount } = req.body;

    if (!userId || typeof amount !== 'number' || isNaN(amount)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request. userId and amount (as number) are required.'
      });
    }

    const { gateway, contract } = await connectToNetwork();

    console.log(`💰 Adjusting wallet of user ${userId} by ₹${amount}`);
    await contract.submitTransaction('AdjustUserWallet', userId, amount.toString());

    gateway.disconnect();

    res.json({
      success: true,
      message: `Wallet successfully ${amount > 0 ? 'credited' : 'debited'} ₹${Math.abs(amount)}`
    });

  } catch (err) {
    console.error('❌ Error in adjustWallet:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/getUserBookings', async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId is required.'
      });
    }

    const { gateway, contract } = await connectToNetwork();

    const result = await contract.evaluateTransaction('GetBookingsByUser', userId);
    gateway.disconnect();

    const bookings = JSON.parse(result.toString());

    res.json({
      success: true,
      bookings
    });

  } catch (error) {
    console.error('❌ Error fetching user bookings:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

const Schedule = require('./models/Schedule');

app.post('/api/bookMultipleTickets', async (req, res) => {
  try {
    const { userId, scheduleId, seatNumbers, bookingIds } = req.body;

    if (!userId || !scheduleId || !Array.isArray(seatNumbers) || !Array.isArray(bookingIds)) {
      return res.status(400).json({ success: false, message: "userId, scheduleId, seatNumbers, and bookingIds are required." });
    }

    if (seatNumbers.length !== bookingIds.length || seatNumbers.length === 0) {
      return res.status(400).json({ success: false, message: "Mismatch or empty seat and booking IDs." });
    }

    const schedule = await Schedule.findById(scheduleId);
    if (!schedule) {
      return res.status(404).json({ success: false, message: 'Schedule not found.' });
    }

    // 🧠 Validate all seat numbers
    for (let seat of seatNumbers) {
      const seatNum = parseInt(seat);
      if (isNaN(seatNum) || seatNum < 1 || seatNum > schedule.totalSeats) {
        return res.status(400).json({ success: false, message: `Invalid seat number: ${seat}` });
      }
      if (schedule.bookedSeats?.get(seat)) {
        return res.status(400).json({ success: false, message: `Seat already booked: ${seat}` });
      }
    }

    // 💰 Compute one-time price
    const departure = new Date(schedule.departure);
    const now = new Date();
    const price = calculateDynamicPrice(schedule, departure, now);

    const { gateway, contract } = await connectToNetwork();

    await contract.submitTransaction(
      'BookMultipleTickets',
      userId,
      scheduleId,
      JSON.stringify(seatNumbers),
      JSON.stringify(bookingIds),
      price.toString()
    );

    gateway.disconnect();

    // ✅ Update MongoDB schedule state
    for (let seat of seatNumbers) {
      schedule.bookedSeats.set(seat, userId);
    }
    schedule.availableSeats -= seatNumbers.length;
    schedule.lastModified = new Date();

    await schedule.save();

    res.json({
      success: true,
      message: `${seatNumbers.length} tickets successfully booked.`,
      seats: seatNumbers,
      bookings: bookingIds,
      paidPerTicket: price,
      totalCost: price * seatNumbers.length
    });

  } catch (error) {
    console.error('❌ Booking multiple tickets failed:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});


const User = require('./models/User');
const Schedule = require('./models/Schedule');
const Transport = require('./models/Transport');

app.get('/api/verifyTicket/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { gateway, contract } = await connectToNetwork();
    const result = await contract.evaluateTransaction('VerifyTicket', id);
    const parsed = JSON.parse(result.toString());
    gateway.disconnect();

    if (!parsed?.booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    const booking = parsed.booking;

    // Fetch user, schedule, transport from MongoDB
    const [user, schedule] = await Promise.all([
      User.findById(booking.userId),
      Schedule.findById(booking.scheduleId),
    ]);

    let transport = null;
    if (schedule && schedule.transportId) {
      transport = await Transport.findById(schedule.transportId);
    }

    res.json({
      success: true,
      data: {
        booking,
        user: user ? {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          walletBalance: user.walletBalance
        } : null,
        schedule: schedule ? {
          id: schedule._id,
          departure: schedule.departure,
          source: schedule.source,
          destination: schedule.destination,
          totalSeats: schedule.totalSeats,
          available: schedule.availableSeats,
          currentPrice: schedule.currentPrice,
        } : null,
        transport: transport ? {
          id: transport._id,
          type: transport.type,
          providerId: transport.providerId,
        } : null
      }
    });

  } catch (error) {
    console.error('❌ Error verifying ticket:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/confirmPendingBookings', async (req, res) => {
  // const token = req.headers.authorization;
  // const session = sessionStore[token];
  // if (!session || session.role !== 'admin') {
  //   return res.status(403).json({ success: false, message: 'Unauthorized' });
  // }

  try {
    const { gateway, contract } = await connectToNetwork();

    // 🔍 Get all pending bookings from chaincode
    const result = await contract.evaluateTransaction('GetAllPendingBookings');
    const pending = JSON.parse(result.toString());

    const qscc = await qsccContract(gateway);

    // 📦 Get current block height from ledger
    const infoBuf = await qscc.evaluateTransaction('GetChainInfo', 'ticketchannel');
    const info = protos.common.BlockchainInfo.decode(infoBuf);
    const currentHeight = parseInt(info.height.toString());

    const confirmed = [];

    // 🔁 Loop through each pending booking
    for (const booking of pending) {
      try {
        const blockBuf = await qscc.evaluateTransaction('GetBlockByTxID', 'ticketchannel', booking.txID);
        const blockNumber = parseBlockNumber(blockBuf);

        // ✅ Confirm if 2 blocks have passed
        if ((currentHeight - blockNumber) > 2) {
          await contract.submitTransaction('ConfirmBooking', booking.id);
          confirmed.push(booking.id);
        }

      } catch (innerErr) {
        console.warn(`⚠️ Could not confirm ${booking.id}:`, innerErr.message);
      }
    }

    gateway.disconnect();
    res.json({ success: true, confirmed });

  } catch (err) {
    console.error("❌ confirmPendingBookings failed:", err);
    res.status(500).json({ success: false, message: err.message || "Unknown error" });
  }
});