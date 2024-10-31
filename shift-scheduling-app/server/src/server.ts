import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import passport from './config/passport';
import authRoutes from './routes/auth';
import scheduleRoutes from './routes/schedules';
import session from 'express-session';

const app = express();
const port = process.env.PORT || 5003;

// CORS configuration
const corsOptions = {
  origin: ['http://localhost:3000', 'https://tempo-frontend.onrender.com'],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());

// Session configuration
// app.use(session({
//   secret: process.env.SESSION_SECRET || 'your_session_secret',
//   resave: false,
//   saveUninitialized: false,
//   cookie: { secure: process.env.NODE_ENV === 'production' }
// }));

app.use(session({
  secret: process.env.SESSION_SECRET || 'your_session_secret',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production', 
    httpOnly: true,
    sameSite: 'lax'
  }
}));


app.use(passport.initialize());
app.use(passport.session());

// Logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  next();
});

console.log('Environment:', process.env.NODE_ENV);
console.log('Port:', process.env.PORT);
console.log('Starting route registration...');

// Root routes - must be before other routes
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Tempo API' });
});

app.get('/api', (req, res) => {
  res.json({ message: 'Tempo API is running' });
});

//for tests onlyy
app.get('/test-google-auth', (req, res) => {
  console.log('Test route hit at:', new Date().toISOString());
  res.json({ 
    status: 'active',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/auth/google', (req, res) => {
  console.log('Google auth endpoint hit:', new Date().toISOString());
  passport.authenticate('google', {
    scope: ['profile', 'email']
  })(req, res);
});



// API routes
app.use('/api/auth', authRoutes);
console.log("Auth routes loaded");
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

// 404 handler - must be last
app.use((req, res) => {
  console.log(`[${new Date().toISOString()}] 404 - Not Found: ${req.method} ${req.url}`);
  res.status(404).send('Route not found');
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
