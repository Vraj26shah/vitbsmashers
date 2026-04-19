import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import authRouter        from './routes/authRoutes.js';
import courseRouter      from './routes/courseRoutes.js';
import facultyRouter     from './routes/facultyRoutes.js';
import profileRouter     from './routes/profileRoutes.js';
import paymentRouter     from './routes/paymentRoutes.js';
import eventRouter       from './routes/eventRoutes.js';
import adminRouter       from './routes/adminRoutes.js';
import notesRouter       from './routes/notesRoutes.js';
import { errorHandler, notFound } from './middleware/authMiddleware.js';

const app = express();

app.use(express.json());
app.use(cookieParser());

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      'http://localhost:8000',
      'http://localhost:5500',
      'http://localhost:3000',
      'http://127.0.0.1:8000',
      'http://127.0.0.1:5500',
      'http://127.0.0.1:3000',
      'http://localhost:4000',
      'file://',
      'https://vitbsmashers.vercel.app',
      'https://vitbsmashers-main.vercel.app',
      'https://vitbsmashers.onrender.com',
      'https://vitbsmashers-backend.onrender.com',
      /^https:\/\/.*\.vercel\.app$/,
      /^https:\/\/.*\.onrender\.com$/,
      /^https?:\/\/localhost(:\d+)?$/,
      /^https?:\/\/127\.0\.0\.1(:\d+)?$/,
    ];

    const isAllowed = allowedOrigins.some(allowed => {
      if (typeof allowed === 'string') {
        return allowed === origin || (allowed.startsWith('file://') && origin?.startsWith('file://'));
      }
      return allowed instanceof RegExp ? allowed.test(origin) : false;
    });

    if (isAllowed) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

// API Routes
app.use('/api/v1/auth',    authRouter);
app.use('/api/v1/courses', courseRouter);
app.use('/api/v1/courses', notesRouter);
app.use('/api/v1/faculty', facultyRouter);
app.use('/api/v1/profile', profileRouter);
app.use('/api/v1/payment', paymentRouter);
app.use('/api/v1/events',  eventRouter);
app.use('/api/v1/admin',   adminRouter);

// Frontend compatibility
app.use('/api/payments', paymentRouter);

// Resolve frontend directory path
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const frontendDir = path.resolve(__dirname, '../frontend');

// Map frontend feature pages
const featurePages = [
  'profile/profile.html',
  'attendance/attendance.html',
  'gpa-calculator/cgpa.html',
  'ttmaker/ttmaker1.html',
  'marketplace/market.html',
  'faculty/faculty.html',
  'mess-menu/mess.html',
  'event/event.html',
  'mycourses/mycourses.html',
  'pdf-viewer/viewer.html',
  'club/club.html',
];

featurePages.forEach(page => {
  app.get(`/features/${page}`, (req, res) => {
    res.sendFile(path.resolve(frontendDir, `features/${page}`));
  });
});

app.use('/features', express.static(path.join(frontendDir, 'features')));
app.use(express.static(frontendDir));

app.get('/', (req, res) => {
  res.sendFile(path.join(frontendDir, 'index.html'));
});

app.use(notFound);
app.use(errorHandler);

export default app;
