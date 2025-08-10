import express from 'express';
import cookieParser from 'cookie-parser';
import authRouter from './routes/authRoutes.js';
import { errorHandler, notFound } from './middleware/authMiddleware.js';
const app = express();
import connect from './db/db.js'
connect()

app.use(express.json());
app.use(cookieParser());


// Routes
app.use('/api/v1/auth', authRouter);


// Test route
app.get('/', (req, res) => {
  res.send('VIT Bhopal Authentication Service');
});


// Error handling middleware
app.use(notFound);
app.use(errorHandler);


export default app;