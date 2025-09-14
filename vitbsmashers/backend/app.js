import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import authRouter from './routes/authRoutes.js';
import { errorHandler, notFound } from './middleware/authMiddleware.js';

import connect from './db/db.js'
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import paymentRoutes from './routes/paymentRoutes.js';
import authRoutes from './routes/authRoutes.js';

connect()
dotenv.config();
const app = express();

// Enable CORS for browser clients
app.use(cors({ origin: true, credentials: true }));

// Parse JSON bodies (except for webhook)
app.use(express.json());

// Webhook route must be before express.json() middleware for Stripe webhooks
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }), paymentRoutes);

app.use(cookieParser());

// Routes backend
app.use('/api/v1/auth', authRouter);
app.use('/api/auth', authRoutes);
app.use('/api/payments', paymentRoutes);





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


mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log('DB connected'))
  .catch(err => console.error('DB connection error:', err));




// // Test route
// app.get('/', (req, res) => {
//   res.send('VIT Bhopal Authentication Service');
// });


// Serve the main index page
app.get('/', (req, res) => {
  res.sendFile(path.join(frontendDir, 'index.html'));
});



// Error handling middleware
app.use(notFound);
app.use(errorHandler);


export default app;