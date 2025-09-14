import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import authRouter from './routes/authRoutes.js';
import { errorHandler, notFound } from './middleware/authMiddleware.js';
const app = express();
import connect from './db/db.js'
connect()

app.use(express.json());
app.use(cookieParser());

// Enable CORS for browser clients
app.use(cors({ origin: true, credentials: true }));
// Routes backend
app.use('/api/v1/auth', authRouter);






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





// // Test route
// app.get('/', (req, res) => {
//   res.send('VIT Bhopal Authentication Service');
// });


//mainPage route byy ai
app.get('/', (req, res) => {
  res.sendFile(path.join(frontendDir, 'mainPage.html'));
});



// Error handling middleware
app.use(notFound);
app.use(errorHandler);


export default app;