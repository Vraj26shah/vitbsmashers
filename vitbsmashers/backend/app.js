import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import passport from './config/passport.js';
import session from 'express-session';
// import authRouter from './routes/authRoutes.js';
import authRouter from './routes/authRoutes.js';
// import attendanceRouter from './routes/attendanceRoutes.js';
// import gpaRouter from './routes/gpaRoutes.js';
// import timetableRouter from './routes/timetableRoutes.js';
// import courseRouter from './routes/courseRoutes.js';
// import messRouter from './routes/messRoutes.js';
// import mapRouter from './routes/mapRoutes.js';
import facultyRouter from './routes/facultyRoutes.js';
// import clubRouter from './routes/clubRoutes.js';
// import profileRouter from './routes/profileRoutes.js';
import profileRouter from './routes/profileRoutes.js';
// import marketplaceRouter from './routes/marketplaceRoutes.js';
// import paymentRouter from './routes/paymentRoutes.js';
import paymentRouter from './routes/paymentRoutes.js';
import eventRouter from './routes/eventRoutes.js';
// import adminRouter from './routes/adminRoutes.js';
import { errorHandler, notFound } from './middleware/authMiddleware.js';
import connect from './db/db.js';
import fs from 'fs';

const app = express();
connect();

// Middleware
app.use(express.json());
app.use(cookieParser());

// Session middleware (required for Passport OAuth)
app.use(session({
  secret: process.env.JWT_SECRET || 'vitbsmashers_session_secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // Use HTTPS in production
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Enable CORS for browser clients
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      'http://localhost:8000',  // Frontend development server
      'http://localhost:5500',  // Alternative frontend port
      'http://127.0.0.1:8000', // Alternative localhost
      'http://127.0.0.1:5500', // Alternative localhost
      'http://localhost:4000',  // Backend itself (for internal requests)
      'https://vitbsmashers.vercel.app', // Production frontend
      'https://vitbsmashers-main.vercel.app' // Alternative production
    ];

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With']
};

app.use(cors(corsOptions));

// API Routes
// app.use('/api/v1/auth', authRouter);
app.use('/api/v1/auth', authRouter);
// app.use('/api/v1/attendance', attendanceRouter);
// app.use('/api/v1/gpa', gpaRouter);
// app.use('/api/v1/timetable', timetableRouter);
// app.use('/api/v1/courses', courseRouter);//you want to focus no course section only
// app.use('/api/v1/mess', messRouter);
// app.use('/api/v1/map', mapRouter);
app.use('/api/v1/faculty', facultyRouter);
// app.use('/api/v1/clubs', clubRouter);
app.use('/api/v1/profile', profileRouter);
// app.use('/api/v1/marketplace', marketplaceRouter);
app.use('/api/v1/payment', paymentRouter);
app.use('/api/v1/events', eventRouter);
// app.use('/api/v1/admin', adminRouter);

// Frontend compatibility routes (frontend calls different paths)
app.use('/api/payments', paymentRouter); // Frontend calls /api/payments/create-checkout-session






// Resolve frontend directory path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDir = path.resolve(__dirname, '../frontend');




// Map frontend feature pages to their correct locations BEFORE static middleware
app.get('/features/profile/profile.html', (req, res) => {
  res.sendFile(path.resolve(frontendDir, 'features/profile/profile.html'));
});

app.get('/features/attendance/attendance.html', (req, res) => {
  res.sendFile(path.resolve(frontendDir, 'features/attendance/attendance.html'));
});

app.get('/features/gpa-calculator/cgpa.html', (req, res) => {
  res.sendFile(path.resolve(frontendDir, 'features/gpa-calculator/cgpa.html'));
});

app.get('/features/ttmaker/ttmaker1.html', (req, res) => {
  res.sendFile(path.resolve(frontendDir, 'features/ttmaker/ttmaker1.html'));
});

app.get('/features/marketplace/market.html', (req, res) => {
  res.sendFile(path.resolve(frontendDir, 'features/marketplace/market.html'));
});

app.get('/features/faculty/faculty.html', (req, res) => {
  res.sendFile(path.resolve(frontendDir, 'features/faculty/faculty.html'));
});

app.get('/features/mess-menu/mess.html', (req, res) => {
  res.sendFile(path.resolve(frontendDir, 'features/mess-menu/mess.html'));
});

app.get('/features/event/event.html', (req, res) => {
  res.sendFile(path.resolve(frontendDir, 'features/event/event.html'));
});

app.get('/features/mycourses/mycourses.html', (req, res) => {
  res.sendFile(path.resolve(frontendDir, 'features/mycourses/mycourses.html'));
});

app.get('/features/club/club.html', (req, res) => {
  res.sendFile(path.resolve(frontendDir, 'features/club/club.html'));
});


// Serve frontend statically so pages are available at http://localhost:PORT
app.use('/features', express.static(path.join(frontendDir, 'features')));


// Login page removed - using Google sign-in on home page only

// Serve frontend files
app.use(express.static(frontendDir));

//mainPage route by ai
app.get('/', (req, res) => {
  res.sendFile(path.join(frontendDir, 'index.html'));
});




// Error handling middleware
app.use(notFound);
app.use(errorHandler);


export default app;