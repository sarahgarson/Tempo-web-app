import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import passport from './config/passport'
import authRoutes from './routes/auth';
import scheduleRoutes from './routes/schedules';

dotenv.config();

const app = express();
const port = process.env.PORT || 5003;

// CORS configuration
const corsOptions = {
  origin: 'http://localhost:3001',
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Enable pre-flight for all routes

app.use(express.json());
app.use(passport.initialize());

// CORS headers middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:3001');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  next();
});

// Logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/schedules', (req, res, next) => {
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    passport.authenticate('jwt', { session: false })(req, res, next);
  }
}, scheduleRoutes);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// 404 handler
app.use((req, res) => {
  console.log(`[${new Date().toISOString()}] 404 - Not Found: ${req.method} ${req.url}`);
  res.status(404).send('Route not found');
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
