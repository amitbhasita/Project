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
// const sessionStore = {}; // In-memory session store
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

const session = require('express-session');
const MongoStore = require('connect-mongo');
app.use(session({
  secret: 'yourSecretKey',
  resave: false,
  saveUninitialized: false,
  rolling: true,
  store: MongoStore.create({
    mongoUrl: 'mongodb://localhost:27017/ticketBooking',  // your MongoDB connection
    ttl: 60 * 60  // Session expiry in seconds (1 hour)
  }),
  cookie: {
    maxAge: 60 * 60 * 1000,  // 1 hour
    sameSite: 'lax',
    secure: false
  }
}));







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


function authorize(allowedRoles = []) {
  return (req, res, next) => {
    const session = req.session;

    if (!session || !allowedRoles.includes(session.role)) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    // session already attached to req, no need to manually add
    next();
  };
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


async function batchExecute(tasks, batchSize = 5) {
  for (let i = 0; i < tasks.length; i += batchSize) {
    const batch = tasks.slice(i, i + batchSize);
    await Promise.all(batch.map(fn => fn().catch(err => {
      console.error('⚠️ Batch task failed:', err.message);
    })));
    await new Promise(resolve => setTimeout(resolve, 200)); // Optional: slight delay between batches
  }
}


app.post('/api/registerUser' , authorize(['admin']),async (req, res) => {
  const { userId,name, email, phone, isAnonymous, password, role } = req.body;
  console.log(req.body);
  // Check if the user already exists in MongoDB
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({ success: false, message: `User with email ${email} already exists.` });
  }

  const hashedPassword = hashString(password);

  try {
    // Create and save user in MongoDB
    const user = new User({
      id:userId,
      name,
      email,
      phone,
      isAnonymous,
      password: hashedPassword,
      role,
      walletBalance: 1000,
      registrationDate: new Date()
    });

    await user.save();

    const { gateway, contract } = await connectToNetwork();
    
    // ✅ Create corresponding UserWallet on-chain
    await contract.submitTransaction('CreateUserWallet', user.id.toString());
    const result = await contract.evaluateTransaction('GetUserWalletBalance', userId);
    const balance = parseInt(result.toString());
    console.log(balance);
    gateway.disconnect();

    res.json({ success: true, message: 'User registered successfully' });

  } catch (err) {
    console.error('❌ Registration error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});


async function fetchBookingsByUser(userId) {
  const { gateway, contract } = await connectToNetwork();
  const result = await contract.evaluateTransaction('GetBookingsByUser', userId);
  gateway.disconnect();
  return JSON.parse(result.toString());
}


app.post('/api/registerProvider', authorize(['admin']),async (req, res) => {
  const { id, name, ownerName, rating, isPublic, email, phone, password } = req.body;
  console.log(req.body);
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


app.get('/api/getUserPrivate/:id', authorize(['user','admin']),async (req, res) => {
  const { id } = req.params;
  if (req.session.role === 'user' && req.session.userId !== id) {
    return res.status(403).json({ success: false, message: 'Access denied for this user.' });
  }

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


app.get('/api/getUserPublic/:id',authorize(['user','admin']), async (req, res) => {
  const { id } = req.params;
  if (req.session.role === 'user' && req.session.userId !== id) {
    return res.status(403).json({ success: false, message: 'Access denied for this user.' });
  }

  try {
    const user = await User.findOne({id:id});
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

app.get('/api/getProvider/:id',authorize(['user','provider','admin']), async (req, res) => {
  const { id } = req.params;


  try {
    // Fetch provider from MongoDB
    const provider = await Provider.findOne({id:id});
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

app.post('/api/addTransport', authorize(['provider', 'admin']), async (req, res) => {
  const { id, providerId, type } = req.body;
  console.log('📥 Transport Add Request:', req.body);

  // Validate transport type
  const validTypes = ['plane', 'train', 'bus'];
  if (!validTypes.includes(type)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid transport type (must be plane, train, or bus)'
    });
  }

  if (req.session.role === 'provider') {
    if (req.session.userId !== providerId) {
      return res.status(403).json({
        success: false,
        message: 'Providers can only add transports under their own account.'
      });
    }
  }
  try {
    // Step 1: Check if transport ID already exists
    const existingTransportById = await Transport.findOne({ id: id });
    if (existingTransportById) {
      return res.status(400).json({
        success: false,
        message: `Transport with id ${id} already exists`
      });
    }

    // Step 2: Check if provider already has a transport of this type
    const existingTransportByProviderAndType = await Transport.findOne({ providerId: providerId, type: type });
    if (existingTransportByProviderAndType) {
      return res.status(400).json({
        success: false,
        message: `Provider ${providerId} already has a ${type} transport registered`
      });
    }

    // Step 3: Create a new transport
    const transport = new Transport({
      id,
      providerId,
      type
    });

    await transport.save();

    console.log(`✅ Transport ${id} added for provider ${providerId}`);
    res.json({
      success: true,
      message: `Transport added successfully`
    });

  } catch (err) {
    console.error('❌ Error in /api/addTransport:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});


app.get('/api/getTransport/:id',authorize(['user','provider','admin']), async (req, res) => {
  const { id } = req.params;

  try {
    // Fetch transport from MongoDB
    const transport = await Transport.findOne({id:id});
    if (!transport) {
      return res.status(404).json({ success: false, message: `Transport with id ${id} not found` });
    }

    res.json({ success: true, data: transport });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});


app.post('/api/updateUser', authorize(['user','admin']),async (req, res) => {
  const { userId, name, phone, isAnonymous } = req.body;
  // console.log(req.body);
  // console.log(userId);
  if (req.session.role === 'user' && req.session.userId !== userId) {
    return res.status(403).json({ success: false, message: 'You can only update your own profile.' });
  }

  try {
    // Fetch user from MongoDB
    const user = await User.findOne({id:userId});
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


app.post('/api/updateProvider', authorize(['provider','admin']),async (req, res) => {
  const { id, name, ownerName, phone, rating, isPublic } = req.body;
  if (req.session.role === 'provider' && req.session.userId !== id) {
    return res.status(403).json({ success: false, message: 'You can only update your own provider profile.' });
  }

  // Validate rating (1-5)
  if (rating < 1 || rating > 5) {
    return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
  }

  try {
    // Fetch provider from MongoDB
    const provider = await Provider.findOne({id:id});
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


app.post('/api/createSchedule',authorize(['provider','admin']), async (req, res) => {
  const { id, transportId, departure, source, destination, totalSeats, basePrice } = req.body;

  // Validate transport exists in MongoDB
  const transport = await Transport.findOne({id:transportId});
  if (!transport) {
    return res.status(400).json({ success: false, message: `Transport with id ${transportId} does not exist` });
  }
  // 🔐 Check if provider owns the transport
  if (req.session.role === 'provider' && req.session.userId !== transport.providerId) {
    return res.status(403).json({ success: false, message: 'You can only create schedules for your own transports' });
  }
  // Parse departure time
  const parsedDeparture = new Date(departure);
  if (isNaN(parsedDeparture)) {
    return res.status(400).json({ success: false, message: `Invalid departure time format` });
  }

  try {
    // Check if schedule already exists
    const existingSchedule = await Schedule.findOne({ id:id });
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

app.get('/api/getSchedule/:id', authorize(['user', 'provider', 'admin']), async (req, res) => {
  const { id } = req.params;

  try {
    const schedule = await Schedule.findOne({ id: id });

    if (!schedule) {
      return res.status(404).json({ success: false, message: `Schedule with id ${id} not found` });
    }

    const transport = await Transport.findOne({ id: schedule.transportId });
    if (!transport) {
      return res.status(404).json({ success: false, message: 'Transport not found' });
    }

    // 🔐 Check provider ownership
    if (req.session.role === 'provider' && req.session.userId !== transport.providerId) {
      return res.status(403).json({ success: false, message: 'You can only view your own schedules' });
    }

    // 🧠 Handle bookedSeats safely (Map or Object)
    const bookedSeats = schedule.bookedSeats instanceof Map
    ? Object.fromEntries(schedule.bookedSeats)
    : (schedule.bookedSeats || {});

    // 🧠 Calculate vacant seats
    const vacantSeats = [];
    for (let i = 1; i <= schedule.totalSeats; i++) {
      const seat = i.toString();
      if (!bookedSeats[seat]) {
        vacantSeats.push(i);
      }
    }

    // 🧠 Dynamic Pricing
    const currentTime = new Date();
    const dynamicPrice = calculateDynamicPrice(schedule, schedule.departure, currentTime);

    // 🧠 Respond with enhanced schedule
    res.json({ 
      success: true,
      data: {
        ...schedule.toObject(),
        bookedSeats: bookedSeats,                  // safe to send
        dynamicPrice: dynamicPrice,
        vacantSeatNumbers: vacantSeats,
        vacantCount: vacantSeats.length,
        availableSeats: vacantSeats.length          // ✅ Keep consistency
      }
    });
  } catch (err) {
    console.error('❌ Error in /api/getSchedule/:id:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});


app.get('/api/userExists/:id',authorize(['user','admin']), async (req, res) => {
  const { id } = req.params;
  if (req.session.role === 'user' && req.session.userId !== id) {
    return res.status(403).json({ success: false, message: 'You can only check your own ID.' });
  }

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



app.delete('/api/deleteUser/:id', authorize(['user', 'admin']), async (req, res) => {
  const { id } = req.params;
  console.log(`📥 Received request to delete user: ${id}`);

  if (req.session.role === 'user' && req.session.userId !== id) {
    console.warn(`🚫 Unauthorized attempt to delete user: ${id}`);
    return res.status(403).json({ success: false, message: 'You can only delete your own account.' });
  }
  if (id === 'admin@blockchain.com') {
    console.warn('🚫 Attempt to delete admin account blocked');
    return res.status(403).json({ success: false, message: 'This account cannot be deleted.' });
  }

  try {
    // 1. Check if user exists
    const user = await User.findOne({ id: id });
    if (!user) {
      console.warn(`❌ User ${id} not found in database.`);
      return res.status(404).json({ success: false, message: `User with id ${id} does not exist` });
    }
    console.log(`✅ User ${id} found. Proceeding with deletion...`);

    // 2. Fetch all bookings of user
    const { gateway, contract } = await connectToNetwork();
    const resultBuffer = await contract.evaluateTransaction('GetBookingsByUser', id);
    const bookings = JSON.parse(resultBuffer.toString());
    await gateway.disconnect();

    console.log(`📦 Found ${bookings.length} bookings for user ${id}`);

    // 3. For each confirmed booking, refund 50%
    for (const booking of bookings) {
      if (booking.status === 'confirmed') {
        const refund = Math.floor(booking.pricePaid * 0.5);

        try {
          console.log(`🔁 Refunding 50% for booking ${booking.id} (Refund ₹${refund})...`);
          const { gateway, contract } = await connectToNetwork();
          await contract.submitTransaction('CancelTicket', booking.id, refund.toString());
          await gateway.disconnect();
          console.log(`✅ Booking ${booking.id} cancelled successfully.`);
        } catch (err) {
          console.warn(`⚠️ Failed to cancel booking ${booking.id}:`, err.message);
          // continue without crash
        }
      } else {
        console.log(`ℹ️ Skipping booking ${booking.id} as status is '${booking.status}'`);
      }
    }

    // 4. Delete user from MongoDB
    await user.deleteOne();
    console.log(`🗑️ User ${id} deleted from database.`);

    // 5. Now safely clear session
    req.session.destroy((err) => {
      if (err) {
        console.error('❌ Error destroying session:', err);
        return res.status(500).json({ success: false, message: 'User deleted but session could not be destroyed.' });
      }

      res.clearCookie('connect.sid');
      console.log('✅ Session destroyed successfully.');
      return res.json({ success: true, message: 'User deleted successfully. Please login again.' });
    });

  } catch (error) {
    console.error('❌ Error deleting user:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});


app.post('/api/cancelTicket', authorize(['user','admin']),async (req, res) => {
  try {
    const { bookingId } = req.body;

    if (!bookingId) {
      return res.status(400).json({ success: false, message: 'bookingId is required' });
    }

    const { gateway, contract } = await connectToNetwork();

    // 1. Get booking
    const bookingResult = await contract.evaluateTransaction('GetBooking', bookingId);
    const booking = JSON.parse(bookingResult.toString());


// 🔐 Only allow users to cancel their own booking
    if (req.session.role === 'user' && req.session.userId !== booking.userId) {
      gateway.disconnect();
      return res.status(403).json({ success: false, message: 'You can only cancel your own bookings.' });
    }

    // 2. Get schedule from MongoDB
    const schedule = await Schedule.findOne({id:booking.scheduleId});
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
    const user = await User.findOne({id:booking.userId});
    // console.log(await User.findOne({id:userId}));
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // ✅ Only update non-sensitive fields
    user.walletBalance+=refund;


    // ❌ Ensure email, role, and password are not modified
    // These fields will be ignored

    await user.save(); //
    // 🪑 Release the seat in MongoDB
    schedule.bookedSeats.delete(booking.seatNumber);
    schedule.availableSeats += 1;
    schedule.lastModified = new Date();
    await schedule.save();

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
function calculateDynamicPriceV4(schedule, departure, currentTime) {
  const basePrice = schedule.basePrice;
  const totalSeats = schedule.totalSeats;

  // 🔥 Handle bookedSeats safely if Map or Object
  const bookedSeats = schedule.bookedSeats instanceof Map
  ? Object.fromEntries(schedule.bookedSeats)
  : (schedule.bookedSeats || {});

  const bookedCount = Object.keys(bookedSeats).length;
  const demandRatio = bookedCount / totalSeats;

  const timeToGoHours = (new Date(departure) - currentTime) / (1000 * 60 * 60); // hours left

  // Normalize over 7 days (168 hours)
  let timeRatio = 1 - (timeToGoHours / 168.0);
  if (timeRatio < 0) timeRatio = 0;
  if (timeRatio > 1) timeRatio = 1;

  const alpha = 0.5; // demand importance
  const beta = 0.3;  // time importance

  // 🧠 Phase 1: Far from departure (>7 days)
  if (timeToGoHours > 168) {
    if (demandRatio < 0.2) {
      return basePrice; // 🔒 Protect early bookers
    }
    // else fall through to normal dynamic pricing
  }

  // 🧠 Phase 2: Normal dynamic pricing (7 days ➔ 24 hours)
  let multiplier = 1 + (alpha * demandRatio) + (beta * timeRatio);
  let price = Math.floor(basePrice * multiplier);

  if (timeToGoHours > 24 && timeToGoHours <= 168) {
    // Optional cap during moderate dynamic phase (7d to 24h)
    const capPrice = Math.floor(basePrice * 2.0);
    if (price > capPrice) {
      price = capPrice;
    }
  }

  // 🧠 Phase 3: Skyrocket pricing phase (24h ➔ 2h)
  if (timeToGoHours <= 24 && timeToGoHours > 2) {
    // No cap, allow full dynamic pricing based on demand and time
    // Price already calculated above without any new cap
  }

  // 🧠 Phase 4: Discounting phase (<2 hours)
  if (timeToGoHours <= 2) {
    // Start dynamic discounting based on how close we are
    const hoursPassedFrom2h = 2 - timeToGoHours; // 0 to 2
    let discountPercent = Math.min(30, hoursPassedFrom2h * 15); // Max 30% discount (15% per hour)

    const discountMultiplier = 1 - (discountPercent / 100);
    const discountedPrice = Math.floor(price * discountMultiplier);

    // Protect from dropping too much — minimum price should be around 1.2× basePrice
    price = Math.max(discountedPrice, Math.floor(basePrice * 1.2));
  }

  // 🛡️ Absolute safety: Never less than basePrice in any extreme case
  if (price < basePrice) {
    price = basePrice;
  }

  return price;
}


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


app.post('/api/modifySchedule',authorize(['provider','admin']), async (req, res) => {
  const { scheduleId, newDeparture, newBasePrice, additionalSeats } = req.body;

  try {
    // 1. Fetch the schedule from MongoDB
    const schedule = await Schedule.findOne({id:scheduleId});
    if (!schedule) {
      return res.status(404).json({ success: false, message: `Schedule with id ${scheduleId} not found` });
    }

    const transport = await Transport.findOne({ id: schedule.transportId });
    if (!transport) {
      return res.status(404).json({ success: false, message: 'Transport not found' });
    }

// 🔐 Enforce that provider can only modify their own schedules
    if (req.session.role === 'provider' && req.session.userId !== transport.providerId) {
      return res.status(403).json({ success: false, message: 'You can only modify schedules belonging to your own transports.' });
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


app.get('/api/getTransportsByProvider/:providerId', authorize(['provider','admin']),async (req, res) => {
  const { providerId } = req.params;
  if (req.session.role === 'provider' && req.session.userId !== providerId) {
    return res.status(403).json({ success: false, message: 'You can only view your own transports.' });
  }

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

app.get('/api/getSchedulesByProvider/:providerId', authorize(['provider','admin']),async (req, res) => {
  const { providerId } = req.params;

  try {
    // Fetch all schedules from MongoDB
    if (req.session.role === 'provider' && req.session.userId !== providerId) {
      return res.status(403).json({ success: false, message: 'You can only view schedules for your own transports.' });
    }

    const schedules = await Schedule.find();

    // Filter schedules based on providerId from transport
    const result = [];

    for (const schedule of schedules) {
      // Fetch transport details by transportId
      const transport = await Transport.findOne( {id: schedule.transportId });

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

app.get('/api/getAllUsers', authorize(['admin']),async (req, res) => {
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

app.get('/api/getAllProviders',authorize(['admin']), async (req, res) => {
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

app.get('/api/getAllTransports', authorize(['admin']),async (req, res) => {
  try {
    // Fetch all users from MongoDB
    const transports = await Transport.find();


    res.json({ success: true, data: transports });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/check-session', (req, res) => {
  if (req.session && req.session.userId && req.session.role) {
    res.json({ loggedIn: true, role: req.session.role });
  } else {
    res.status(401).json({ loggedIn: false });
  }
});

app.get('/api/GetUser/:id',authorize(['user','admin']), async (req, res) => {
  try {
    if (req.session.role === 'user' && req.session.userId !== id) {
      return res.status(403).json({ success: false, message: 'You can only view your own profile.' });
    }

    // Fetch all users from MongoDB
    const { id } = req.params;
    const user = await User.findOne({id});

    user.password = '';
      user.phone = ''; // Remove phone if needed
      const { gateway, contract } = await connectToNetwork();
      const resultBytes = await contract.evaluateTransaction('GetUserWalletBalance', id);
      const blockchainBalance = parseFloat(resultBytes.toString());
      console.log("User fetch Success"+ id);
      res.json({
        success: true,
        data: {
          ...user._doc,
          mongoBalance: user.walletBalance,
          blockchainBalance
        }
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

app.get('/api/validate-session', (req, res) => {
  if (!req.session || !req.session.userId || !req.session.role) {
    return res.status(401).json({ success: false, message: 'Session invalid' });
  }

  res.json({
    success: true,
    userId: req.session.userId,
    role: req.session.role
  });
});


app.get('/api/GetUserByEmail/:emailid',authorize(['user','admin']), async (req, res) => {
  try {

    // Fetch all users from MongoDB
    const { emailid } = req.params;
    if (req.session.role === 'user' && req.session.userId !== emailid) {
      return res.status(403).json({ success: false, message: 'You can only view your own profile.' });
    }

    const user = await User.findOne({email:emailid});

    // // Exclude sensitive fields (password, email, phone)
    user.password = '';
      user.phone = ''; // Remove phone if needed

      res.json({ success: true, data: user });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

app.get('/api/GetProviderByEmail/:emailid', authorize(['provider','admin']),async (req, res) => {
  try {
    // Fetch all users from MongoDB
    const { emailid } = req.params;
    if (req.session.role === 'provider' && req.session.userId !== emailid) {
      return res.status(403).json({ success: false, message: 'You can only view your own profile.' });
    }
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


app.delete('/api/deleteScheduleAndRefund/:scheduleId', authorize(['provider', 'admin']), async (req, res) => {
  const { scheduleId } = req.params;

  try {
    const schedule = await Schedule.findOne({ id: scheduleId });
    if (!schedule) {
      return res.status(404).json({ success: false, message: `Schedule with id ${scheduleId} not found` });
    }

    const transport = await Transport.findOne({ id: schedule.transportId });
    if (!transport) {
      return res.status(404).json({ success: false, message: 'Associated transport not found' });
    }

    if (req.session.role === 'provider' && req.session.userId !== transport.providerId) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const { gateway, contract } = await connectToNetwork();

    try {
      for (const [seatNumber, userId] of schedule.bookedSeats?.entries() || []) {
        try {
          const user = await User.findOne({ id: userId });
          if (!user) {
            console.warn(`⚠️ User not found: ${userId}`);
            continue;
          }

          const bookingResult = await contract.evaluateTransaction('GetBookingByUserAndSchedule', userId, scheduleId);
          const booking = JSON.parse(bookingResult.toString());

          if (!booking || !booking.pricePaid) {
            console.warn(`⚠️ Booking not found for user ${userId} and schedule ${scheduleId}`);
            continue;
          }

          user.walletBalance += booking.pricePaid;
          await user.save();

          await contract.submitTransaction('AdjustUserWallet', userId, booking.pricePaid.toString());
          await contract.submitTransaction('RefundBookingsByUserAndSchedule', userId, scheduleId);

          console.log(`✅ Refunded ₹${booking.pricePaid} to user ${userId}`);

        } catch (innerError) {
          console.warn(`⚠️ Refund failed for user ${userId}: ${innerError.message}`);
          // Continue refunding others even if one fails
        }
      }
    } finally {
      await gateway.disconnect();
    }

    await schedule.deleteOne();
    res.json({ success: true, message: 'Schedule deleted and all bookings refunded' });

  } catch (error) {
    console.error('❌ Error deleting schedule and refunding:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});






app.delete('/api/deleteTransportAndSchedules/:transportId',authorize(['provider','admin']), async (req, res) => {
  const { transportId } = req.params;
  // const token=req.headers.authorization;
  try {
    // 1. Fetch transport from MongoDB
    const transport = await Transport.findOne({id:transportId});
    if (!transport) {
      return res.status(404).json({ success: false, message: `Transport with id ${transportId} not found` });
    }

// 🔐 Ownership enforcement
    if (req.session.role === 'provider' && req.session.userId !== transport.providerId) {
      return res.status(403).json({ success: false, message: 'You can only delete transports belonging to your business.' });
    }

    // 2. Find and delete all schedules associated with the transport
    const schedules = await Schedule.find({ transportId : transportId});
    const cookieHeader = req.headers.cookie;

    // For each schedule related to the transport, call the deleteScheduleAndRefund route
    for (const schedule of schedules) {
      const scheduleResponse = await fetch(`http://localhost:3000/api/deleteScheduleAndRefund/${schedule.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookieHeader
        }
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

app.post('/api/deleteProvider', authorize(['provider', 'admin']), async (req, res) => {
  const { providerId } = req.body;

  if (req.session.role === 'provider' && req.session.userId !== providerId) {
    return res.status(403).json({ success: false, message: 'You can only delete your provider account.' });
  }

  try {
    console.log(`🗑️ Provider ${providerId} requesting deletion`);

    const cookieHeader = req.headers.cookie;
    const response = await fetch(`http://localhost:3000/api/deleteProviderAndTransports/${providerId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieHeader
      }
    });

    const result = await response.json();

    if (!result.success) {
      // If deleteProviderAndTransports failed, don't destroy session
      return res.status(response.status).json(result);
    }

    // 🧹 Now safely clear session and respond
    req.session.destroy((err) => {
      if (err) {
        console.error('❌ Error destroying session:', err);
        return res.status(500).json({ success: false, message: 'Provider deleted but session could not be destroyed' });
      }

      res.clearCookie('connect.sid');
      return res.json({ success: true, message: 'Provider deleted successfully. Please login again.' });
    });

  } catch (error) {
    console.error('❌ Error forwarding provider deletion:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

app.delete('/api/deleteProviderAndTransports/:providerId',authorize(['provider','admin']), async (req, res) => {
  const { providerId } = req.params;
  // const token=req.headers.authorization;
  try {
    // 1. Fetch provider from MongoDB
    const provider = await Provider.findOne({id:providerId});
    if (!provider) {
      return res.status(404).json({ success: false, message: `Provider with id ${providerId} not found` });
    }


  // 🔐 Ownership enforcement
    if (req.session.role === 'provider' && req.session.userId !== providerId) {
      return res.status(403).json({ success: false, message: 'You can only delete your transports.' });
    }

    // 2. Find all transports associated with the provider
    const transports = await Transport.find({ providerId : providerId});

    // 3. For each transport, invoke the deleteTransportAndSchedules route
    const cookieHeader = req.headers.cookie;

    for (const transport of transports) {
      const transportResponse = await fetch(`http://localhost:3000/api/deleteTransportAndSchedules/${transport.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
    'Cookie': cookieHeader   // ✅ Correct placement
  }
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



app.post('/api/modifyTicket',authorize(['user','admin']), async (req, res) => {
  try {
    const { oldBookingId, newBookingId, newScheduleId, newSeatNumber, userId } = req.body;
    console.log(req.body);
    if (!oldBookingId || !newBookingId || !newScheduleId || !newSeatNumber || !userId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: oldBookingId, newBookingId, newScheduleId, newSeatNumber, userId'
      });
    }

    // 🔐 Ownership enforcement
    if (req.session.role === 'user' && req.session.userId !== userId) {
      return res.status(403).json({ success: false, message: 'You can only modify your own tickets.' });
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
      Schedule.findOne({id:booking.scheduleId}),
      Schedule.findOne({id:newScheduleId})
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

    const oldTransport = await Transport.findOne({id:oldSchedule.transportId});
    const newTransport = await Transport.findOne({id:newSchedule.transportId});
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
    // const newDeparture = new Date(newSchedule.departure);
    const currentTime = new Date();
    const newPrice = calculateDynamicPriceV4(newSchedule, newDeparture, currentTime);


    const user = await User.findOne({id:userId});
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
    user.walletBalance=effectiveBalance-newPrice;
    await user.save();
    

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




app.get('/api/getAvailableSchedules', authorize(['user', 'admin']), async (req, res) => {
  const { source, destination } = req.query;

  try {
    const schedules = await Schedule.find({
      source: { $regex: source, $options: 'i' },
      destination: { $regex: destination, $options: 'i' },
    });

    if (!schedules || schedules.length === 0) {
      return res.status(404).json({ success: false, message: `No schedules found for source: ${source} and destination: ${destination}` });
    }

    const result = schedules.map(schedule => {
      const bookedSeats = schedule.bookedSeats instanceof Map
      ? Object.fromEntries(schedule.bookedSeats)
      : (schedule.bookedSeats || {});

      const vacantSeats = [];
      for (let i = 1; i <= schedule.totalSeats; i++) {
        const seat = i.toString();
        if (!bookedSeats[seat]) {
          vacantSeats.push(i);
        }
      }

      return {
        id: schedule.id,
        transportId: schedule.transportId,
        departure: schedule.departure,
        source: schedule.source,
        destination: schedule.destination,
        availableSeats: vacantSeats.length,
        totalSeats: schedule.totalSeats,
        basePrice: schedule.basePrice,
        bookedSeats: bookedSeats,  // now safe
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



app.post('/api/bookTicket', authorize(['user','admin']),async (req, res) => {
  try {
    const { bookingId, userId, scheduleId, seatNumber } = req.body;

    if (!bookingId || !userId || !scheduleId || !seatNumber) {
      return res.status(400).json({
        success: false,
        message: 'bookingId, userId, scheduleId, and seatNumber are required.'
      });
    }

  // 🔐 Ownership enforcement
    if (req.session.role === 'user' && req.session.userId !== userId) {
      return res.status(403).json({ success: false, message: 'You cant book tickets.' });
    }

    // 🔍 Fetch schedule from MongoDB
    const schedule = await Schedule.findOne({id:scheduleId});
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
    const price = calculateDynamicPriceV4(schedule, departureTime, currentTime);

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

    const user = await User.findOne({id:userId});
    // console.log(await User.findOne({id:userId}));
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // ✅ Only update non-sensitive fields
    user.walletBalance-=price;


    // ❌ Ensure email, role, and password are not modified
    // These fields will be ignored

    await user.save(); // Save 
    // ✅ Update MongoDB state
    // ✅ Correct way to set seat booking
    schedule.bookedSeats.set(seatNumber.toString(), userId);
    schedule.availableSeats -= 1;
    schedule.lastModified = new Date();
    await schedule.save();

  

    res.json({
      success: true,
      message: 'Ticket booked successfully',
      bookingId,
      paid: price
    });
    console.log(userId+" successfully booked seat "+ seatNumber+" in schedule "+ scheduleId);
  } catch (error) {
    console.error('❌ Error in bookTicket:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});



app.post('/api/adjustWallet', authorize(['admin']),async (req, res) => {
  try {
    const { userId, amount } = req.body;
    console.log(req.body);
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

    const user = await User.findOne({id:userId});
    // console.log(await User.findOne({id:userId}));
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // ✅ Only update non-sensitive fields
    user.walletBalance+=amount;


    // ❌ Ensure email, role, and password are not modified
    // These fields will be ignored

    await user.save(); // Save updated user to MongoDB


    res.json({
      success: true,
      message: `Wallet successfully ${amount > 0 ? 'credited' : 'debited'} ₹${Math.abs(amount)}`
    });

  } catch (err) {
    console.error('❌ Error in adjustWallet:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET route
app.get('/api/getBookingsByUser/:userId', authorize(['user', 'admin']), async (req, res) => {
  const { userId } = req.params;

  try {
    // 🔒 Ownership enforcement
    if (req.session.role === 'user' && req.session.userId !== userId) {
      return res.status(403).json({ success: false, message: 'You can only view your own bookings.' });
    }

    const { gateway, contract } = await connectToNetwork();
    const result = await contract.evaluateTransaction('GetBookingsByUser', userId);
    const bookings = JSON.parse(result.toString());

    const enrichedBookings = [];

    for (const booking of bookings) {
      try {
        // 🆕 Always re-fetch latest booking details using GetBooking
        const updatedResult = await contract.evaluateTransaction('GetBooking', booking.id);
        const updatedBooking = JSON.parse(updatedResult.toString());

        enrichedBookings.push({
          ...booking,
          status: updatedBooking.status  // ⬅️ override status with latest
        });
      } catch (err) {
        console.warn(`⚠️ Failed to fetch updated booking for ${booking.id}. Keeping old status.`);
        enrichedBookings.push(booking); // fallback to original
      }
    }

    await gateway.disconnect();

    res.json({ success: true, data: enrichedBookings });

  } catch (error) {
    console.error('❌ Error fetching enriched bookings:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
});

// POST route
app.post('/api/getUserBookings',authorize(['user','admin']), async (req, res) => {
  const { userId } = req.body;
    // 🔐 Ownership enforcement
  if (req.session.role === 'user' && req.session.userId !== userId) {
    return res.status(403).json({ success: false, message: 'You cant get otherrs booked tickets.' });
  }

  try {
    const bookings = await fetchBookingsByUser(userId);
    res.json({ success: true, bookings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});




app.post('/api/bookMultipleTickets', authorize(['user','admin']),async (req, res) => {
  try {
    const { userId, scheduleId, seatNumbers, bookingIds } = req.body;
    console.log(seatNumbers);
      // 🔐 Ownership enforcement
    if (req.session.role === 'user' && req.session.userId !== userId) {
      return res.status(403).json({ success: false, message: 'You cant book multiple tickets.' });
    }

    if (!userId || !scheduleId || !Array.isArray(seatNumbers) || !Array.isArray(bookingIds)) {
      return res.status(400).json({ success: false, message: "userId, scheduleId, seatNumbers, and bookingIds are required." });
    }

    if (seatNumbers.length !== bookingIds.length || seatNumbers.length === 0) {
      return res.status(400).json({ success: false, message: "Mismatch or empty seat and booking IDs." });
    }

    const schedule = await Schedule.findOne({id:scheduleId});
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
    console.log("before");
    const user = await User.findOne({id:userId});
    // console.log(await User.findOne({id:userId}));
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // ✅ Only update non-sensitive fields
    user.walletBalance-=seatNumbers.length*price;


    // ❌ Ensure email, role, and password are not modified
    // These fields will be ignored

    await user.save(); //
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



app.get('/api/verifyTicket/:id',authorize(['provider','admin']), async (req, res) => {
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

    const providerIdFromTicket = parsed?.transport?.providerId;

    if (req.session.role === 'provider' && req.session.userId !== providerIdFromTicket) {
      gateway.disconnect();
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to verify this ticket. Provider mismatch.'
      });
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

app.post('/api/confirmPendingBookings',authorize(['admin']), async (req, res) => {
  

  try {
    const { gateway, contract } = await connectToNetwork();

    // 🔍 Get all pending bookings from chaincode
    const result = await contract.evaluateTransaction('GetAllPendingBookings');
    const pending = JSON.parse(result.toString());
    console.log("=================================================")
    console.log(pending);
    console.log("=================================================")
    const qscc = await qsccContract(gateway);

    // 📦 Get current block height from ledger
    const infoBuf = await qscc.evaluateTransaction('GetChainInfo', 'ticketchannel');
    const info = protos.common.BlockchainInfo.decode(infoBuf);
    const currentHeight = parseInt(info.height.toString());
    console.log("currentHeight"+currentHeight);
    const confirmed = [];

    // 🔁 Loop through each pending booking
    for (const booking of pending) {
      try {
        const blockBuf = await qscc.evaluateTransaction('GetBlockByTxID', 'ticketchannel', booking.txID);
        const blockNumber = parseBlockNumber(blockBuf);
        console.log("currentHeight"+currentHeight+" - blockNumber"+blockNumber);
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

app.get('/api/getSessionInfo', async (req, res) => {
  if (!req.session || !req.session.userId || !req.session.role) {
    return res.json({ success: false });
  }

  let userInfo = null;

  if (req.session.role === 'user') {
    const user = await User.findOne({ id: req.session.userId });
    if (user) {
      userInfo = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      };
    }
  } else if (req.session.role === 'provider') {
    const provider = await Provider.findOne({ id: req.session.userId });
    if (provider) {
      userInfo = {
        id: provider.id,
        email: provider.email,
        name: provider.name,
        role: provider.role
      };
    }
  } else if (req.session.role === 'admin') {
    userInfo = {
      id: 'admin',
      email: 'admin@blockchain.com',
      name: 'Administrator',
      role: 'admin'
    };
  }

  if (!userInfo) {
    return res.status(401).json({ success: false, message: 'Invalid session' });
  }

  res.json({ success: true, ...userInfo });
});


app.post('/api/deleteTransport',authorize(['provider','admin']), async (req, res) => {

  try {
     // const token = req.headers.authorization; // ✅ Add this line
   const { transportId } = req.body;
   if (!transportId) {
    return res.status(400).json({ success: false, message: 'transportId is required' });
  }
  const transport = await Transport.findOne({ id: transportId });
  if (!transport) {
    return res.status(404).json({ success: false, message: 'Transport not found' });
  }

// 🔐 Provider can only delete their own transport
  if (req.session.role === 'provider' && req.session.userId !== transport.providerId) {
    return res.status(403).json({ success: false, message: 'You can only delete transports that you own.' });
  }

    // ✅ Proxy the request to the new DELETE route
  const cookieHeader = req.headers.cookie;
  const response = await fetch(`http://localhost:3000/api/deleteTransportAndSchedules/${transportId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    'Cookie': cookieHeader   // ✅ Correct placement
  }
});

  const result = await response.json();
  return res.status(response.status).json(result);

} catch (error) {
  console.error('❌ Error forwarding transport deletion:', error);
  res.status(500).json({ success: false, message: error.message });
}
});

app.post('/api/deleteSchedule',authorize(['provider','admin']), async (req, res) => {
  try {
     // const token = req.headers.authorization; // ✅ Add this line
   const { scheduleId } = req.body;
   if (!scheduleId) {
    return res.status(400).json({ success: false, message: 'scheduleId is required' });
  }
  const schedule = await Schedule.findOne({ id: scheduleId });
  if (!schedule) {
    return res.status(404).json({ success: false, message: 'Schedule not found' });
  }

  const transport = await Transport.findOne({ id: schedule.transportId });
  if (!transport) {
    return res.status(404).json({ success: false, message: 'Associated transport not found' });
  }

// 🔐 Check if provider owns the schedule's transport
  if (req.session.role === 'provider' && req.session.userId !== transport.providerId) {
    return res.status(403).json({ success: false, message: 'You can only delete schedules that belong to your own transports.' });
  }




    // 🔁 Forward to new DELETE endpoint
  const cookieHeader = req.headers.cookie;
  const response = await fetch(`http://localhost:3000/api/deleteScheduleAndRefund/${scheduleId}`, {
    method: 'DELETE' ,
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookieHeader
    }
  });

  const result = await response.json();
  return res.status(response.status).json(result);

} catch (error) {
  console.error('❌ Error forwarding schedule deletion:', error);
  res.status(500).json({ success: false, message: error.message });
}
});


app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const hashed = hashString(password);

  // ✅ Check admin
    if (email === 'admin@blockchain.com' && hashed === hashString('admin123')) {
      const token = crypto.randomBytes(16).toString('hex');
      // sessionStore[token] = { userId: 'admin', role: 'admin' };
      req.session.userId = 'admin';
      req.session.role = 'admin';
      return res.json({ success: true, token, role: 'admin' });
    }

  // ✅ Check user
    const user = await User.findOne({ email });
    if (user && user.password === hashed) {
      const token = crypto.randomBytes(16).toString('hex');
      // sessionStore[token] = { userId: user.id, role: user.role, email: user.email };
      req.session.userId = user.id;
      req.session.role = user.role;
      return res.json({ success: true, token, role: user.role , email: email});
    }

  // ✅ Check provider
    const prov = await Provider.findOne({ email });
    if (prov && prov.password === hashed) {
      const token = crypto.randomBytes(16).toString('hex');
      // sessionStore[token] = { userId: prov.id, role: prov.role, email: prov.email };
      req.session.userId = prov.id;
      req.session.role = prov.role;
      return res.json({ success: true, token, role: prov.role,email: email });
    }

    return res.status(401).json({ success: false, message: 'Invalid credentials' });

  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }

});
app.post('/api/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).json({ success: false, message: 'Logout failed' });
    res.clearCookie('connect.sid');
    res.json({ success: true });
  });
});




app.get('/api/getUser/:userId', async (req, res) => {
  const token = req.headers.authorization;
  const session = sessionStore[token];

  if (!session || session.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Unauthorized' });
  }

  try {
    const { userId } = req.params;
    const { gateway, contract, org } = await connectToNetwork();

    console.log(`👤 Admin fetching user ${userId} via ${org.toUpperCase()}`);

    const result = await contract.evaluateTransaction('GetUserPublic', userId);
    const parsed = JSON.parse(result.toString());

    gateway.disconnect();

    res.json({ success: true, data: parsed });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== SERVER STARTUP ========== //
async function startServer() {
  try {
    // Always initialize wallet on startup
    await setupIdentityForOrg('org1');
    await setupIdentityForOrg('org2');
    console.log('✅ Wallets initialized for Org1 and Org2');


    app.listen(PORT, () => {
      console.log(`[${new Date().toLocaleString()}] 🚀 Server running at http://localhost:${PORT}`);
      console.log(`🧪 Ready to test chaincode functions via frontend or Postman`);
    });
  } catch (error) {
    console.error('❌ Failed to initialize:', error);
    process.exit(1);
  }
}

startServer();

