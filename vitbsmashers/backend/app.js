import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import authRouter from './routes/authRoutes.js';
import attendanceRouter from './routes/attendanceRoutes.js';
import gpaRouter from './routes/gpaRoutes.js';
import timetableRouter from './routes/timetableRoutes.js';
import courseRouter from './routes/courseRoutes.js';
import messRouter from './routes/messRoutes.js';
import mapRouter from './routes/mapRoutes.js';
import facultyRouter from './routes/facultyRoutes.js';
import clubRouter from './routes/clubRoutes.js';
import profileRouter from './routes/profileRoutes.js';
import marketplaceRouter from './routes/marketplaceRoutes.js';
import paymentRouter from './routes/paymentRoutes.js';
import eventRouter from './routes/eventRoutes.js';
import { errorHandler, notFound } from './middleware/authMiddleware.js';
const app = express();
import connect from './db/db.js'
connect()

app.use(express.json());
app.use(cookieParser());

// Enable CORS for browser clients
app.use(cors({ origin: true, credentials: true }));

// API Routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/attendance', attendanceRouter);
app.use('/api/v1/gpa', gpaRouter);
app.use('/api/v1/timetable', timetableRouter);
app.use('/api/v1/courses', courseRouter);//you want to focus no course section only
app.use('/api/v1/mess', messRouter);
app.use('/api/v1/map', mapRouter);
app.use('/api/v1/faculty', facultyRouter);
app.use('/api/v1/clubs', clubRouter);
app.use('/api/v1/profile', profileRouter);
app.use('/api/v1/marketplace', marketplaceRouter);
app.use('/api/v1/payment', paymentRouter);
app.use('/api/v1/events', eventRouter);






// Resolve frontend directory path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDir = path.resolve(__dirname, '../frontend');




// Map legacy /profile.html to new location BEFORE static middleware
app.get('/profile.html', (req, res) => {
  res.sendFile(path.join(frontendDir, 'features/profile/profile.html'));
});


// Serve frontend statically so pages are available at http://localhost:PORT
app.use(express.static(frontendDir));


//mainPage route by ai
app.get('/', (req, res) => {
  res.sendFile(path.join(frontendDir, 'index.html'));
});




// Error handling middleware
app.use(notFound);
app.use(errorHandler);


export default app;