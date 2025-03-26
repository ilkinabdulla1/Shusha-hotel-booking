const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path'); // Import `path`
const multer = require('multer'); // Import `multer`

const Admin = require('../model/admins'); // Ensure this path is correct
const authenticateToken = require('../middleware/auth'); // Ensure this path is correct
const Room = require('../model/rooms'); // Import Room model
const Booking = require('../model/bookings'); // Import the Booking model
const Staff = require('../model/staff'); // Ensure this path matches your project structure
const Customer = require('../model/customers'); // Adjust the path to match your project structure
const HotelReport = require('../model/HotelReport'); // Adjust the path to your models folder
const Hotel = require('../model/hotels');
const Parking = require('../model/parkings');
const Reservation = require('../model/reservations');


// Configure storage for multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Determine the destination folder dynamically based on the route or other logic
    if (req.originalUrl.includes('/staff')) {
      cb(null, path.join(__dirname, '../public/uploads/staff-profiles')); // Save to /public/uploads/staff-profiles
    } else if (req.originalUrl.includes('/rooms')) {
      cb(null, path.join(__dirname, '../public/uploads/rooms')); // Save to /public/uploads/rooms
    } else if (req.originalUrl.includes('/hotels')) {
      cb(null, path.join(__dirname, '../public/uploads/hotels')); // Save to /public/uploads/hotels
    } else {
      cb(null, path.join(__dirname, '../public/uploads')); // Default uploads folder
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname)); // Unique filename
  },
});



// Create multer instance
const upload = multer({ storage });

  
// --------------------- Home Page Routes ---------------------

// Root Route
router.get('/', (req, res) => {
  res.render('home', { 
    message: 'Welcome to the Homepage!', 
    showSidebar: false // Enable sidebar for homepage
  });
});

// About Page Route
router.get('/about', (req, res) => {
  res.render('about', { 
    message: 'About Page', 
    showSidebar: false // Enable sidebar for about page
  });
});




// --------------------- Login Page Routes ---------------------
// GET: Login Page
router.get('/login', (req, res) => {
  res.render('login', { layout: false, errorMessage: null });
});

// POST: Login Action
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check if the admin exists in the database
    const admin = await Admin.findOne({ email: email });
    if (!admin) {
      return res.render('login', { layout: false, errorMessage: 'Admin not found' });
    }

    // Validate password
    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      return res.render('login', { layout: false, errorMessage: 'Invalid password' });
    }

    // Issue JWT token
    const payload = {
      admin: {
        id: admin.id
      }
    };

    const jwtSecret =
      process.env.JWT_SECRET ||
      '4715aed3c946f7b0a38e6b534a9583628d84e96d10fbc04700770d572af3dce43625dd';
    jwt.sign(payload, jwtSecret, { expiresIn: '1h' }, (err, token) => {
      if (err) throw err;
      res.cookie('token', token, { httpOnly: true }); // Set cookie with JWT token
      res.redirect('/dashboard');
    });
  } catch (error) {
    console.error('Error logging in admin:', error);
    res.render('login', { layout: false, errorMessage: 'Server error' });
  }
});



// --------------------- Register Page Routes ---------------------
// GET: Register Page
router.get('/register', (req, res) => {
  res.render('register', { layout: false, errorMessage: null }); // Pass showSidebar: false and handle errorMessage
});

// POST: Register Action
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;

  try {
    // Check if email already exists in the database
    const existingAdmin = await Admin.findOne({ email: email });
    if (existingAdmin) {
      return res.render('register', { layout: false, errorMessage: 'Email already exists' });
    }

    // Validate the password
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z]).{6,}$/;
    if (!passwordRegex.test(password)) {
      return res.render('register', { layout: false, errorMessage: 'Password must be at least 6 characters long and contain at least one uppercase and one lowercase letter' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new admin document
    const newAdmin = new Admin({
      name: name,
      email: email,
      password: hashedPassword
    });

    // Save the new admin document to the database
    await newAdmin.save();
    console.log('Admin registered successfully');

    // Redirect to a success page or login page
    res.redirect('/login');
  } catch (error) {
    console.error('Error registering admin:', error);
    res.render('register', { layout: false, errorMessage: 'Server error' });
  }
});



// --------------------- Profile Page Routes ---------------------

  router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const admin = await Admin.findById(req.admin.id).select('-password');
        if (!admin) {
            return res.status(404).send('Admin not found');
        }
        res.render('profile', { admin });
    } catch (error) {
        console.error('Error fetching admin:', error);
        res.status(500).send('Server error');
    }
});

// POST route to handle profile updates
router.post('/profile', authenticateToken, upload.single('picture'), async (req, res) => {
    try {
        const { name, bio } = req.body;
        const picture = req.file ? '/images/' + req.file.filename : null; // Construct path to store in database

        // Find the admin by ID and update the fields
        const updatedFields = { name, bio };
        if (picture) {
            updatedFields.picture = picture;
        }

        const admin = await Admin.findByIdAndUpdate(req.admin.id, updatedFields, { new: true });

        if (!admin) {
            return res.status(404).send('Admin not found');
        }

        res.render('profile', { admin, successMessage: 'Profile updated successfully' });
    } catch (error) {
        console.error('Error updating admin profile:', error);
        res.status(500).send('Server error');
    }
});



// --------------------- Dashboard Page Routes ---------------------

// 📊 GET: Admin Dashboard with Staff on Duty
router.get('/dashboard', async (req, res) => {
  try {
    // 📅 Date Calculations
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // 🔍 Daily, Weekly, Monthly Bookings
    const dailyBookings = await Booking.countDocuments({ checkInDate: { $gte: today } });
    const weeklyBookings = await Booking.countDocuments({
      checkInDate: { $gte: new Date(today.setDate(today.getDate() - today.getDay())) }
    });
    const monthlyBookings = await Booking.countDocuments({ checkInDate: { $gte: startOfMonth } });

    // 💰 Total Revenue
    const revenueData = await Booking.aggregate([
      { $match: { checkInDate: { $gte: startOfMonth }, status: 'Completed' } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } }
    ]);
    const totalRevenue = revenueData.length > 0 ? revenueData[0].total : 0;

    // 🔝 Top Revenue-Generating Room Type
    const topRoomType = await Booking.aggregate([
      { $lookup: { from: 'rooms', localField: 'room', foreignField: '_id', as: 'roomDetails' } },
      { $unwind: "$roomDetails" },
      { $group: { _id: "$roomDetails.type", totalRevenue: { $sum: "$totalAmount" } } },
      { $sort: { totalRevenue: -1 } },
      { $limit: 1 }
    ]);
    const topRevenueRoomType = topRoomType.length > 0 ? topRoomType[0]._id : 'N/A';

    // 🔝 Top Revenue-Generating Hotel
    const topHotel = await Booking.aggregate([
      { $lookup: { from: 'hotels', localField: 'hotel', foreignField: '_id', as: 'hotelDetails' } },
      { $unwind: "$hotelDetails" },
      { $group: { _id: "$hotelDetails.name", totalRevenue: { $sum: "$totalAmount" } } },
      { $sort: { totalRevenue: -1 } },
      { $limit: 1 }
    ]);
    const topRevenueHotel = topHotel.length > 0 ? topHotel[0]._id : 'N/A';

    // 💳 Paid vs Unpaid Bookings
    const paidBookings = await Booking.countDocuments({ paymentMethod: { $ne: 'Unpaid' } });
    const unpaidBookings = await Booking.countDocuments({ paymentMethod: 'Unpaid' });

    // 📦 Totals
    const totalBookings = await Booking.countDocuments();
    const totalCustomers = await Customer.countDocuments();
    const totalRooms = await Room.countDocuments();
    const totalHotels = await Hotel.countDocuments();

    // 📈 Occupancy Rate
    const occupiedRooms = await Room.countDocuments({ status: 'Occupied' });
    const occupancyRate = totalRooms > 0 ? ((occupiedRooms / totalRooms) * 100).toFixed(2) : 0;

    // 👨‍💼 Fetch Staff on Duty (Assuming shiftTime is a field in the Staff model)
    const staffOnDuty = await Staff.find({ status: 'Active' }).select('name role shiftTime');

    // 📦 Render Dashboard with all data
    res.render('dashboard', {
      dailyBookings,
      weeklyBookings,
      monthlyBookings,
      totalRevenue,
      paidBookings,
      unpaidBookings,
      totalBookings,
      totalCustomers,
      totalRooms,
      totalHotels,
      occupancyRate,
      topRevenueRoomType,
      topRevenueHotel,
      staffOnDuty // ✅ Passing staff data to the view
    });

  } catch (error) {
    console.error('Error loading dashboard:', error);
    res.status(500).send('Internal Server Error');
  }
});



router.get('/logout', (req, res) => {
  res.clearCookie('token'); // Clear the token cookie
  res.redirect('/login'); // Redirect to login page after logout
});



// --------------------- Rooms Page Routes ---------------------

// GET: Display all rooms
router.get('/hotel-booking/rooms', async (req, res) => {
  try {
    const rooms = await Room.find().populate('hotel', 'name'); // Populate the 'name' field of the related Hotel document
    res.render('rooms', { rooms }); // Pass the rooms to the template
  } catch (error) {
    console.error('Error fetching rooms:', error);
    res.status(500).send('Server Error');
  }
});



// GET: Add room form
router.get('/hotel-booking/rooms/add-room', async (req, res) => {
  try {
    const hotels = await Hotel.find(); // Fetch all hotels with their facilities
    res.render('add-room', { hotels });
  } catch (error) {
    console.error('Error fetching hotels:', error);
    res.status(500).send('Server Error');
  }
});

// POST: Add a new room
router.post('/hotel-booking/rooms/add-room', upload.single('image'), async (req, res) => {
  try {
    const {
      hotel, // This is the ObjectId of the selected hotel
      roomNumber,
      type,
      bedType,
      price,
      status,
      description,
      maxOccupancy,
      roomSize,
      facilities
    } = req.body;

    const selectedFacilities = Array.isArray(facilities) ? facilities : [facilities];

    const image = req.file ? `/uploads/rooms/${req.file.filename}` : '/images/default-room.png';

    const newRoom = new Room({
      hotel, // ObjectId from the form
      roomNumber,
      type,
      bedType,
      price,
      status,
      description,
      maxOccupancy,
      roomSize,
      facilities: selectedFacilities,
      image
    });

    await newRoom.save();
    res.redirect('/hotel-booking/rooms');
  } catch (error) {
    console.error('Error adding room:', error);
    res.status(400).send('Error adding room');
  }
});



// GET: Edit room page
router.get('/hotel-booking/rooms/:id/edit', async (req, res) => {
  try {
    // Fetch the room details with the hotel name populated
    const room = await Room.findById(req.params.id).populate('hotel', 'name');
    if (!room) {
      return res.status(404).send('Room not found');
    }

    // Fetch all hotels for the dropdown
    const hotels = await Hotel.find();

    // Render the edit-room page with room and hotel data
    res.render('edit-room', { room, hotels });
  } catch (error) {
    console.error('Error fetching room:', error);
    res.status(500).send('Server error');
  }
});


// POST: Update room details
router.post('/hotel-booking/rooms/:id/edit', upload.single('image'), async (req, res) => {
  try {
    const {
      hotel,
      roomNumber,
      type,
      bedType,
      price,
      status,
      description,
      maxOccupancy,
      roomSize,
      facilities
    } = req.body;

    const updateData = {
      hotel,
      roomNumber,
      type,
      bedType,
      price,
      status,
      description,
      maxOccupancy,
      roomSize,
      facilities: Array.isArray(facilities) ? facilities : [facilities],
    };

    // If a new image is uploaded, update the image path
    if (req.file) {
      updateData.image = `/uploads/rooms/${req.file.filename}`;
    }

    // Update the room in the database
    const updatedRoom = await Room.findByIdAndUpdate(req.params.id, updateData, { new: true });

    if (!updatedRoom) {
      return res.status(404).send('Room not found');
    }

    res.redirect('/hotel-booking/rooms'); // Redirect to the Rooms page
  } catch (error) {
    console.error('Error updating room:', error);
    res.status(400).send('Error updating room');
  }
});



// GET: Room details page
router.get('/hotel-booking/rooms/:id', async (req, res) => {
  try {
    // Fetch the room and populate the hotel's name
    const room = await Room.findById(req.params.id).populate('hotel', 'name');

    // Handle case where room is not found
    if (!room) {
      return res.status(404).send('Room not found');
    }

    // Extract hotel name or fallback if no hotel is assigned
    const hotelName = room.hotel ? room.hotel.name : 'No Hotel Assigned';

    // Fetch booking history for the room, sorted by the most recent booking
    const bookingHistory = await Booking.find({ room: req.params.id })
                                        .sort({ checkIn: -1 });  // Recent bookings first

    // Render the room-details page with all required data
    res.render('room-details', { 
      room, 
      bookingHistory, 
      hotelName 
    });
  } catch (error) {
    console.error('Error fetching room details:', error);
    res.status(500).send('Server Error');
  }
});





// GET: Delete a room
router.get('/hotel-booking/rooms/:id/delete', async (req, res) => {
  try {
    await Room.findByIdAndDelete(req.params.id);
    res.redirect('/hotel-booking/rooms');
  } catch (error) {
    console.error('Error deleting room:', error.message);
    res.status(500).send('Internal Server Error');
  }
});



// --------------------- Booking Page Routes ---------------------


// GET: Display all bookings
router.get('/hotel-booking/bookings', async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate({
        path: 'room',
        populate: { path: 'hotel' }
      });

    res.render('bookings', { bookings });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).send('Error fetching bookings');
  }
});



// GET: Add Booking Form
router.get('/hotel-booking/bookings/add-booking', async (req, res) => {
  try {
    const rooms = await Room.find().populate('hotel'); // Fetch all rooms with hotel details
    res.render('add-booking', { rooms }); // Pass rooms to the form
  } catch (error) {
    console.error('Error fetching rooms for booking:', error);
    res.status(500).send('Error fetching rooms');
  }
});

// POST: Add a New Booking
router.post('/hotel-booking/bookings/add-booking', async (req, res) => {
  const {
    guestName,
    guestEmail,
    guestPhone,
    room,
    checkInDate,
    checkOutDate,
    adults,
    children,
    paymentMethod,
    status
  } = req.body;

  try {
    // Fetch the selected room to get price and hotel details
    const selectedRoom = await Room.findById(room).populate('hotel');
    if (!selectedRoom) {
      return res.status(404).send('Room not found');
    }

    // Calculate the total nights
    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);
    const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));

    if (nights <= 0) {
      return res.status(400).send('Check-out date must be after check-in date');
    }

    // Calculate total amount
    const totalAmount = selectedRoom.price * nights;

    // 🔍 Check if the customer already exists by email
    let customer = await Customer.findOne({ email: guestEmail });

    if (!customer) {
      // 📝 If not, create a new customer with booking details
      customer = new Customer({
        name: guestName,
        email: guestEmail,
        phone: guestPhone,
        room: selectedRoom._id,               // Link Room
        hotel: selectedRoom.hotel._id,        // Link Hotel
        checkInDate: checkInDate,             // Save Check-in Date
        checkOutDate: checkOutDate,           // Save Check-out Date
        status: 'Active',
        paymentMethod: paymentMethod
      });

      await customer.save();
    } else {
      // ✏️ If customer exists, update their latest booking details
      customer.room = selectedRoom._id;
      customer.hotel = selectedRoom.hotel._id;
      customer.checkInDate = checkInDate;
      customer.checkOutDate = checkOutDate;
      customer.status = 'Active';
      customer.paymentMethod = paymentMethod;

      await customer.save();
    }

    // ✅ Create new booking linked to the customer
    const newBooking = new Booking({
      guestName,
      guestEmail,
      guestPhone,
      room: selectedRoom._id,
      hotel: selectedRoom.hotel._id,
      checkInDate,
      checkOutDate,
      adults,
      children,
      paymentMethod,
      totalAmount,
      status,
      customer: customer._id // Link to the Customer
    });

    await newBooking.save();

    // 🚪 Redirect to the bookings page
    res.redirect('/hotel-booking/bookings');
  } catch (error) {
    console.error('Error adding booking:', error.message);
    res.status(500).send('Internal Server Error');
  }
});

// GET: Edit booking form
router.get('/hotel-booking/bookings/:id/edit', async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    const rooms = await Room.find(); // Fetch all available rooms

    if (!booking) {
      return res.status(404).send('Booking not found');
    }

    res.render('edit-booking', { booking, rooms }); // Pass rooms to the view
  } catch (error) {
    console.error('Error fetching booking for editing:', error);
    res.status(500).send('Server error');
  }
});



// POST: Update a booking
router.post('/hotel-booking/bookings/:id/edit', async (req, res) => {
  const { guestName, guestEmail, guestPhone, adults, children, room, checkInDate, checkOutDate, paymentMethod, status } = req.body;

  try {
    // Fetch the existing booking to compare the previous room
    const previousBooking = await Booking.findById(req.params.id);
    
    // If the room was changed, update the room statuses
    if (previousBooking.room.toString() !== room) {
      // Set the previous room back to Available
      await Room.findByIdAndUpdate(previousBooking.room, { status: 'Available' });
      // Set the new room to Occupied
      await Room.findByIdAndUpdate(room, { status: 'Occupied' });
    }

    // Update the booking with new data
    await Booking.findByIdAndUpdate(req.params.id, {
      guestName,
      guestEmail,
      guestPhone,
      adults,
      children,
      room,
      checkInDate,
      checkOutDate,
      paymentMethod,
      status
    });

    // Redirect to the updated booking details page
    res.redirect(`/hotel-booking/bookings/${req.params.id}`);
  } catch (error) {
    console.error('Error updating booking:', error.message);
    res.status(500).send('Internal Server Error');
  }
});


// GET: Booking Details Page
router.get('/hotel-booking/bookings/:id', async (req, res) => {
  try {
    // Fetch booking by ID and populate related room and hotel data
    const booking = await Booking.findById(req.params.id)
      .populate({
        path: 'room',
        populate: {
          path: 'hotel'
        }
      });

    if (!booking) {
      return res.status(404).send('Booking not found');
    }

    res.render('booking-details', { booking });
  } catch (error) {
    console.error('Error fetching booking details:', error.message);
    res.status(500).send('Internal Server Error');
  }
});



// POST: Delete Booking
router.post('/hotel-booking/bookings/:id/delete', async (req, res) => {
  try {
    await Booking.findByIdAndDelete(req.params.id);
    res.redirect('/hotel-booking/bookings');
  } catch (error) {
    console.error('Error deleting booking:', error);
    res.status(500).send('Internal Server Error');
  }
});




// --------------------- Staff Page Routes ---------------------

// GET: Staff Management Page
router.get('/hotel-booking/staff', async (req, res) => {
  try {
    // Fetch the latest staff data and populate the hotel name
    const staffList = await Staff.find().populate('hotel', 'name');

    res.render('staff', { staffList }); // Pass populated data to EJS
  } catch (error) {
    console.error('Error fetching staff list:', error.message);
    res.status(500).send('Internal Server Error');
  }
});


// GET: Add Staff Form
router.get('/hotel-booking/staff/add-staff', async (req, res) => {
  try {
    const hotels = await Hotel.find(); // Fetch available hotels for selection
    res.render('add-staff', { hotels }); // Pass hotels to the form
  } catch (error) {
    console.error('Error fetching hotels:', error);
    res.status(500).send('Internal Server Error');
  }
});

// POST: Add a New Staff Member
router.post('/hotel-booking/staff/add-staff', upload.single('profilePhoto'), async (req, res) => {
  const {
    name,
    badgeNumber,
    role,
    contact,
    email,        // ✅ Included email
    scheduleDays,
    scheduleTime, // ✅ Included schedule time
    joinDate,
    status,
    dateOfBirth,
    nationalId,
    accessLevel,
    salary,
    hotel
  } = req.body;

  const schedule = {
    days: Array.isArray(scheduleDays) ? scheduleDays : [scheduleDays],
    time: scheduleTime,
  };

  const profilePhoto = req.file ? `/uploads/staff-profiles/${req.file.filename}` : null;

  try {
    const newStaff = new Staff({
      name,
      badgeNumber,
      role,
      contact,
      email,        // ✅ Saved email
      schedule,
      joinDate,
      status,
      dateOfBirth,
      nationalId,
      accessLevel,
      salary,
      hotel,
      profilePhoto,
    });

    await newStaff.save();
    res.redirect('/hotel-booking/staff');
  } catch (error) {
    console.error('Error adding staff:', error.message);
    res.status(500).send('Internal Server Error');
  }
});



// GET: Edit Staff Form
router.get('/hotel-booking/staff/:id/edit', async (req, res) => {
  try {
    // Find staff by ID
    const staff = await Staff.findById(req.params.id).populate('hotel');  // Populate hotel details
    if (!staff) {
      return res.status(404).send('Staff not found');
    }

    // Fetch all hotels for the dropdown
    const hotels = await Hotel.find();

    // Render the edit form with staff and hotels
    res.render('edit-staff', { staff, hotels });
  } catch (error) {
    console.error('Error fetching staff for editing:', error.message);
    res.status(500).send('Internal Server Error');
  }
});

// POST: Update a Staff Member
router.post('/hotel-booking/staff/:id/edit', upload.single('profilePhoto'), async (req, res) => {
  const {
    name,
    badgeNumber,
    role,
    contact,
    email,
    dateOfBirth,
    nationalId,
    accessLevel,
    salary,
    hotel,
    scheduleDays,
    scheduleTime,
    joinDate,
    status
  } = req.body;

  try {
    // Construct the updated staff data
    const updatedData = {
      name,
      badgeNumber,
      role,
      contact,
      email,
      dateOfBirth,
      nationalId,
      accessLevel,
      salary,
      hotel,
      schedule: {
        days: Array.isArray(scheduleDays) ? scheduleDays : [scheduleDays],
        time: scheduleTime,
      },
      joinDate,
      status,
    };

    // Handle new profile photo upload
    if (req.file) {
      updatedData.profilePhoto = `/uploads/staff-profiles/${req.file.filename}`;
    }

    // Update staff in the database
    const updatedStaff = await Staff.findByIdAndUpdate(req.params.id, updatedData, { new: true });

    if (!updatedStaff) {
      return res.status(404).send('Staff member not found');
    }

    console.log('Updated Staff:', updatedStaff);

    // Redirect to staff management page
    res.redirect('/hotel-booking/staff');
  } catch (error) {
    console.error('Error updating staff:', error.message);
    res.status(500).send('Internal Server Error');
  }
});


// GET: Staff Details Page
router.get('/hotel-booking/staff/:id', async (req, res) => {
  try {
    // Populate the 'hotel' field to get hotel details
    const staff = await Staff.findById(req.params.id).populate('hotel', 'name');

    if (!staff) {
      return res.status(404).send('Staff not found');
    }

    res.render('staff-details', { staff });
  } catch (error) {
    console.error('Error fetching staff details:', error);
    res.status(500).send('Server Error');
  }
});




// GET: Delete a Staff Member
router.get('/hotel-booking/staff/:id/delete', async (req, res) => {
  try {
    await Staff.findByIdAndDelete(req.params.id);
    res.redirect('/hotel-booking/staff');
  } catch (error) {
    console.error('Error deleting staff:', error.message);
    res.status(500).send('Internal Server Error');
  }
});



// --------------------- Customers Page Routes ---------------------

// GET: Customer Management Page
router.get('/hotel-booking/customers', async (req, res) => {
  try {
    // Populate both 'room' and 'hotel' fields
    const customers = await Customer.find()
      .populate('room')   // Populate room details
      .populate('hotel'); // Populate hotel details

    res.render('customers', { customers });
  } catch (error) {
    console.error('Error fetching customers:', error.message);
    res.status(500).send('Internal Server Error');
  }
});



// GET: Render Add Customer Page
router.get('/hotel-booking/customers/add-customer', async (req, res) => {
  try {
    // Fetch all rooms from the database
    const rooms = await Room.find({});
    
    // Render the add-customer view with rooms data
    res.render('add-customer', { rooms });
  } catch (error) {
    console.error('Error fetching rooms:', error);
    res.status(500).send('Server Error');
  }
});

// POST: Add a new customer
router.post('/hotel-booking/customers/add-customer', async (req, res) => {
  const { name, email, phone, roomNumber, checkInDate, checkOutDate } = req.body;

  try {
    const newCustomer = new Customer({
      name,
      email,
      phone,
      roomNumber, // Save the room number
      checkInDate: new Date(checkInDate), // Convert to Date object
      checkOutDate: new Date(checkOutDate) // Convert to Date object
    });

    await newCustomer.save();
    res.redirect('/hotel-booking/customers'); // Redirect to the customers list
  } catch (error) {
    console.error('Error adding customer:', error.message);
    res.status(500).send('Internal Server Error');
  }
});


// GET: Edit Customer Form
router.get('/hotel-booking/customers/:id/edit', async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);

    if (!customer) {
      return res.status(404).send('Customer not found');
    }

    res.render('edit-customer', { customer });
  } catch (error) {
    console.error('Error fetching customer for editing:', error.message);
    res.status(500).send('Internal Server Error');
  }
});

// POST: Update Customer Information
router.post('/hotel-booking/customers/:id/edit', async (req, res) => {
  const { name, email, phone } = req.body;

  try {
    await Customer.findByIdAndUpdate(req.params.id, {
      name,
      email,
      phone
    });

    res.redirect('/hotel-booking/customers'); // Redirect to the customers list
  } catch (error) {
    console.error('Error updating customer:', error.message);
    res.status(500).send('Internal Server Error');
  }
});


// GET: View Customer Details
router.get('/hotel-booking/customers/:id', async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id)
      .populate({
        path: 'bookings',
        populate: {
          path: 'room',
          populate: { path: 'hotel' }  // 🔥 Populate hotel in the room
        }
      })
      .populate({
        path: 'room',
        populate: { path: 'hotel' }  // 🔥 Populate hotel for customer's assigned room
      });

    if (!customer) {
      return res.status(404).send('Customer not found');
    }

    res.render('customer-details', { customer });
  } catch (error) {
    console.error('Error fetching customer details:', error.message);
    res.status(500).send('Internal Server Error');
  }
});


// GET: Delete a customer
router.get('/hotel-booking/customers/:id/delete', async (req, res) => {
  try {
    await Customer.findByIdAndDelete(req.params.id);
    res.redirect('/hotel-booking/customers');
  } catch (error) {
    console.error('Error deleting customer:', error.message);
    res.status(500).send('Internal Server Error');
  }
});


// --------------------- Hotel Report Page Routes ---------------------

// GET: Hotel Report Page
router.get('/hotel-booking/report-hotel', async (req, res) => {
  try {
    // Fetch data for Bookings
    const totalBookings = await Booking.countDocuments();
    const totalRevenue = await Booking.aggregate([
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    const totalRevenueValue = totalRevenue.length > 0 ? totalRevenue[0].total : 0;

    // Fetch data for Customers
    const totalCustomers = await Customer.countDocuments();

    // Fetch data for Rooms
    const totalRooms = await Room.countDocuments();
    const availableRooms = await Room.countDocuments({ status: 'Available' });

    // Fetch data for Staff
    const totalStaff = await Staff.countDocuments();
    const activeStaff = await Staff.countDocuments({ status: 'Active' });

    // Pass data to the report view
    res.render('report-hotel', {
      totalBookings,
      totalRevenue: totalRevenueValue,
      totalCustomers,
      totalRooms,
      availableRooms,
      totalStaff,
      activeStaff,
    });
  } catch (error) {
    console.error('Error fetching hotel reports:', error.message);
    res.status(500).send('Internal Server Error');
  }
});


// --------------------- Hotels Page Routes ---------------------

// GET: List all hotels
router.get('/hotel-booking/hotels', async (req, res) => {
  try {
      const hotels = await Hotel.find(); // Fetch hotels from the database
      res.render('hotels', { hotels }); // Pass the hotels array to the template
  } catch (error) {
      console.error('Error fetching hotels:', error);
      res.status(500).send('Server error');
  }
});


// GET: Add a new hotel (form page)
router.get('/hotel-booking/hotels/add-hotel', (req, res) => {
  res.render('add-hotel');
});

// POST: Add a new hotel
router.post('/hotel-booking/hotels/add-hotel', authenticateToken, upload.single('image'), async (req, res) => {
  const { name, location, rating, status, email, phone, description } = req.body;

  // Handle multiple facilities (checkbox input)
  const facilities = Array.isArray(req.body.facilities) 
    ? req.body.facilities 
    : req.body.facilities 
      ? [req.body.facilities] 
      : [];

  try {
    const newHotel = new Hotel({
      name,
      location,
      rating,
      status,
      email,
      phone,
      description,
      facilities, // Save selected facilities
      image: req.file ? req.file.filename : null, // Save the uploaded image filename
    });

    await newHotel.save();
    res.redirect('/hotel-booking/hotels'); // Redirect to the hotels management page
  } catch (error) {
    console.error('Error adding hotel:', error);
    res.status(500).send('Server Error');
  }
});



// GET: Edit hotel form
router.get('/hotel-booking/hotels/:id/edit', authenticateToken, async (req, res) => {
  try {
    const hotel = await Hotel.findById(req.params.id);
    if (!hotel) {
      return res.status(404).send('Hotel not found');
    }
    res.render('edit-hotel', { hotel }); // Pass the hotel data to the template
  } catch (error) {
    console.error('Error fetching hotel:', error);
    res.status(500).send('Server Error');
  }
});

// POST: Update hotel
router.post('/hotel-booking/hotels/:id/edit', authenticateToken, upload.single('image'), async (req, res) => {
  const { name, location, rating, status, email, phone, facilities } = req.body;

  try {
    const hotel = await Hotel.findById(req.params.id);
    if (!hotel) {
      return res.status(404).send('Hotel not found');
    }

    // Update hotel fields
    hotel.name = name;
    hotel.location = location;
    hotel.rating = rating;
    hotel.status = status;
    hotel.email = email;
    hotel.phone = phone;

    // Handle facilities (ensure it's an array)
    hotel.facilities = Array.isArray(facilities) ? facilities : [facilities];

    // Update image if a new one is uploaded
    if (req.file) {
      hotel.image = req.file.filename;
    }

    await hotel.save();
    res.redirect('/hotel-booking/hotels');
  } catch (error) {
    console.error('Error updating hotel:', error);
    res.status(500).send('Server Error');
  }
});

// GET: Hotel Details Page with Booking History
router.get('/hotel-booking/hotels/:id', async (req, res) => {
  try {
    // Fetch hotel data
    const hotel = await Hotel.findById(req.params.id);
    if (!hotel) {
      return res.status(404).send('Hotel not found');
    }

    // Fetch rooms for this hotel
    const rooms = await Room.find({ hotel: hotel._id });

    // Fetch booking history for all rooms in this hotel
    const bookingHistory = await Booking.find({ room: { $in: rooms.map(room => room._id) } })
      .populate('room') // Populate room details
      .sort({ checkInDate: -1 }); // Sort by check-in date (latest first)

    // Render hotel details with rooms and booking history
    res.render('hotel-details', { hotel, rooms, bookingHistory });

  } catch (error) {
    console.error('Error fetching hotel details:', error.message);
    res.status(500).send('Internal Server Error');
  }
});


// GET: Delete a booking
router.get('/hotel-booking/bookings/:id/delete', async (req, res) => {
  try {
    const booking = await Booking.findByIdAndDelete(req.params.id);
    if (!booking) {
      return res.status(404).send('Booking not found');
    }
    res.redirect('/hotel-booking/bookings');
  } catch (error) {
    console.error('Error deleting booking:', error);
    res.status(500).send('Server Error');
  }
});



// --------------------- Parkings Page Routes ---------------------

// GET: Parking Lot Management Page
router.get('/parking-management/parkings', async (req, res) => {
  try {
    const parkings = await Parking.find().populate('hotel');
    res.render('parkings', { parkings });
  } catch (error) {
    console.error('Error fetching parking lots:', error);
    res.status(500).send('Internal Server Error');
  }
});

// GET: Add Parking Lot Form
router.get('/parking-management/parkings/add', async (req, res) => {
  try {
    const hotels = await Hotel.find(); // Fetch hotels for dropdown
    res.render('add-parking', { hotels });
  } catch (error) {
    console.error('Error loading hotels for parking:', error);
    res.status(500).send('Internal Server Error');
  }
});

// POST: Add a New Parking Lot
router.post('/parking-management/parkings/add', async (req, res) => {
  const { lotID, hotel, classType, totalSpots, plan, status, revenue } = req.body;

  try {
    const newParking = new Parking({
      lotID,
      hotel,
      classType,
      totalSpots,
      plan,  // ✅ Make sure this is passed correctly
      status,
      revenue: revenue || 0,
      occupiedSpots: 0
    });

    await newParking.save();
    res.redirect('/parking-management/parkings');
  } catch (error) {
    console.error('Error adding new parking:', error.message);
    res.status(500).send('Error adding new parking lot');
  }
});



// GET: Edit Parking Lot Form
router.get('/parking-management/parkings/:id/edit', async (req, res) => {
  try {
    const parking = await Parking.findById(req.params.id).populate('hotel');
    const hotels = await Hotel.find();

    if (!parking) {
      return res.status(404).send('Parking lot not found');
    }

    res.render('edit-parking', { parking, hotels });
  } catch (error) {
    console.error('Error fetching parking for edit:', error.message);
    res.status(500).send('Server Error');
  }
});

// POST: Update Parking Lot
router.post('/parking-management/parkings/:id/edit', async (req, res) => {
  const { hotel, classType, totalSpots, plan, status } = req.body;

  try {
    await Parking.findByIdAndUpdate(req.params.id, {
      hotel,
      classType,
      totalSpots,
      plan,
      status,
    });

    res.redirect('/parking-management/parkings');
  } catch (error) {
    console.error('Error updating parking:', error.message);
    res.status(500).send('Error updating parking lot');
  }
});



// DELETE: Delete a Parking Lot
router.get('/parking-management/parkings/:id/delete', async (req, res) => {
  try {
    // Find the parking lot by ID and delete it
    await Parking.findByIdAndDelete(req.params.id);

    // Redirect back to the parking management page
    res.redirect('/parking-management/parkings');
  } catch (error) {
    console.error('Error deleting parking:', error.message);
    res.status(500).send('Internal Server Error');
  }
});



// --------------------- Reservations Page Routes ---------------------

// GET: View all reservations
router.get('/parking-management/reservations', async (req, res) => {
  try {
    const reservations = await Reservation.find().populate('parkingLot');  // ✅ Populate parkingLot
    res.render('reservations', { reservations });
  } catch (error) {
    console.error('Error fetching reservations:', error);
    res.status(500).send('Internal Server Error');
  }
});

// GET: Add New Reservation Page
router.get('/parking-management/reservations/add', async (req, res) => {
  try {
    // Fetch all parking lots with hotel details
    const parkingLots = await Parking.find().populate('hotel');

    // Render the 'add-reservation' page and pass parkingLots
    res.render('add-reservation', { parkingLots });
  } catch (error) {
    console.error('Error loading add reservation page:', error);
    res.status(500).send('Internal Server Error');
  }
});


// POST: Add New Reservation
router.post('/parking-management/reservations/add', async (req, res) => {
  const {
    reservationID,
    customerName,
    numberPlate,
    spotNumber,
    parkingLot,  // Parking lot ID from the form
    checkIn,
    checkOut,
    status
  } = req.body;

  try {
    // ✅ Fetch the selected parking lot with hotel data
    const selectedLot = await Parking.findById(parkingLot).populate('hotel');

    if (!selectedLot) {
      return res.status(404).send('Parking lot not found');
    }

    // ✅ Calculate the reservation duration in hours
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const durationHours = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60));

    // ✅ Calculate total price using the parking lot's plan
    const totalPrice = selectedLot.plan * durationHours;

    // ✅ Create a new reservation with the correct ObjectId for the parking lot
    const newReservation = new Reservation({
      reservationID,
      customerName,
      numberPlate,
      spotNumber,
      parkingLot: selectedLot._id,  // ✅ Pass only the ObjectId
      checkIn: checkInDate,
      checkOut: checkOutDate,
      plan: selectedLot.plan,
      totalPrice,
      status
    });

    await newReservation.save();

    // ✅ Update the parking lot's occupied spots and revenue
    selectedLot.occupiedSpots += 1;
    selectedLot.revenue += totalPrice;
    await selectedLot.save();

    res.redirect('/parking-management/reservations');
  } catch (error) {
    console.error('Error adding reservation:', error.message);
    res.status(500).send('Internal Server Error');
  }
});



// GET: Edit Reservation Form
router.get('/parking-management/reservations/:id/edit', async (req, res) => {
  try {
    const reservationId = req.params.id;

    // Find the reservation by ID and populate related parking lot and hotel details
    const reservation = await Reservation.findById(reservationId).populate({
      path: 'parkingLot',
      populate: {
        path: 'hotel'
      }
    });

    // Fetch all parking lots to display in the dropdown
    const parkingLots = await Parking.find().populate('hotel');

    if (!reservation) {
      return res.status(404).send('Reservation not found');
    }

    // Render the edit form with existing reservation data and available parking lots
    res.render('edit-reservation', {
      reservation,
      parkingLots
    });

  } catch (error) {
    console.error('Error loading edit reservation page:', error.message);
    res.status(500).send('Internal Server Error');
  }
});


// POST: Handle Reservation Update
router.post('/parking-management/reservations/:id/edit', async (req, res) => {
  const reservationId = req.params.id;

  const {
    customerName,
    numberPlate,
    parkingLot,
    spotNumber,
    checkIn,
    checkOut,
    status
  } = req.body;

  try {
    // Find the selected parking lot
    const selectedLot = await Parking.findById(parkingLot).populate('hotel');
    if (!selectedLot) {
      return res.status(404).send('Parking lot not found');
    }

    // Calculate duration in hours
    const checkInTime = new Date(checkIn);
    const checkOutTime = new Date(checkOut);
    const durationInHours = Math.ceil((checkOutTime - checkInTime) / (1000 * 60 * 60));

    // Calculate total price
    const totalPrice = selectedLot.plan * durationInHours;

    // Update the reservation
    await Reservation.findByIdAndUpdate(reservationId, {
      customerName,
      numberPlate,
      parkingLot: selectedLot._id,
      spotNumber,
      checkIn,
      checkOut,
      plan: selectedLot.plan,
      totalPrice,
      status
    });

    // Update Parking Lot's occupied spots if Active
    if (status === 'Active') {
      selectedLot.occupiedSpots += 1;
      selectedLot.revenue += totalPrice;
      await selectedLot.save();
    }

    res.redirect('/parking-management/reservations');

  } catch (error) {
    console.error('Error updating reservation:', error.message);
    res.status(500).send('Internal Server Error');
  }
});


// GET: Reservation Details Page
router.get('/parking-management/reservations/:id/details', async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id).populate('parkingLot');
    
    if (!reservation) {
      return res.status(404).send('Reservation not found');
    }

    res.render('reservation-details', { reservation });
  } catch (error) {
    console.error('Error fetching reservation details:', error);
    res.status(500).send('Internal Server Error');
  }
});


// POST: Delete Reservation
router.post('/parking-management/reservations/:id/delete', async (req, res) => {
  const reservationId = req.params.id;

  try {
    // Find the reservation and populate the parkingLot reference
    const reservation = await Reservation.findById(reservationId).populate('parkingLot');

    if (!reservation) {
      return res.status(404).send('Reservation not found');
    }

    const parkingLot = reservation.parkingLot;

    if (parkingLot) {
      // Adjust occupied spots and revenue if the reservation was active
      if (reservation.status === 'Active') {
        parkingLot.occupiedSpots = Math.max(0, parkingLot.occupiedSpots - 1);
        parkingLot.revenue = Math.max(0, parkingLot.revenue - reservation.totalPrice);
        await parkingLot.save();
      }
    }

    // Delete the reservation
    await Reservation.findByIdAndDelete(reservationId);

    res.redirect('/parking-management/reservations'); // Redirect after deletion

  } catch (error) {
    console.error('Error deleting reservation:', error.message);
    res.status(500).send('Internal Server Error');
  }
});


module.exports = router;
