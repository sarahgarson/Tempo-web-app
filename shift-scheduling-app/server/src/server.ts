import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import passport from './config/passport';
import authRoutes from './routes/auth';
import scheduleRoutes from './routes/schedules';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { pool } from './config/database';

dotenv.config();

const app = express();
const pgSession = connectPgSimple(session);

app.use((req, res, next) => {
  console.log('Incoming request:', {
    path: req.path,
    method: req.method,
    headers: req.headers,
    timestamp: new Date().toISOString()
  });
  next();
});

const port = process.env.PORT || 5003;

// CORS configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://tempo-frontend.onrender.com']
    : ['http://localhost:3000'],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
};

app.use(cors(corsOptions));
app.use(express.json());


// Reverted to this simpler session configuration because it was affecting the tables data
app.use(session({
  secret: process.env.SESSION_SECRET || 'your_session_secret',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  }
}));


app.use(passport.initialize());
app.use(passport.session());

// Logging middleware (for debugging)
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Health check route
app.get('/health', (req, res) => {
  res.json({
    status: 'up',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV
  });
});

// Test route
app.get('/api/auth/test', (req, res) => {
  res.json({
    message: 'Auth routes accessible',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

// Root routes
app.get('/', (req, res) => res.json({ message: 'Welcome to Tempo API' }));
app.get('/api', (req, res) => res.json({ message: 'Tempo API is running' }));

// Test route to confirm server is running
app.get('/test-google-auth', (req, res) => {
  res.json({ status: 'active', environment: process.env.NODE_ENV });
});

// Auth Routes
app.use('/api/auth', authRoutes);
app.use('/api/schedules', passport.authenticate('jwt', { session: false }), scheduleRoutes);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', err);
  console.error('Stack trace:', err.stack);
  res.status(500).json({ 
    message: 'Internal server error', 
    error: err.message,
    stack: process.env.NODE_ENV === 'production' ? '🥞' : err.stack
  });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

// 404 handler
app.use((req, res) => {
  console.log(`404 Not Found: ${req.method} ${req.url}`);
  res.status(404).send('Route not found');
});

