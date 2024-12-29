import express, { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import passport from '../config/passport';
import { createUser, getUserByEmail, validatePassword } from '../models/User';
import { pool } from '../config/database';

const router = express.Router();

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET as string, (err: any, user: any) => {
    if (err) return res.sendStatus(403);
    (req as any).user = user;
    next();
  });
};

router.post('/register', async (req, res) => {
  try {
    const { username, email, password, role } = req.body;
    console.log('Registration attempt:', { username, email, role });
    
    const user = await createUser({ username, email, password, role });
    res.status(201).json({ message: 'User created successfully', userId: user.id });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Error creating user', error: error instanceof Error ? error.message : 'Unknown error' });
  }
});


router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('Login attempt with email:', email);
    const user = await getUserByEmail(email);
    if (!user) {
      console.log('Invalid credentials: User not found');
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const isValidPassword = await validatePassword(user, password);
    if (!isValidPassword) {
      console.log('Invalid credentials: Incorrect password');
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET as string,
      { expiresIn: '1h' }
    );
    console.log('User logged in:', user);
    res.json({ token, userId: user.id, role: user.role });
  } catch (error) {
    console.error('Error in login route:', error);
    res.status(500).json({ message: 'Error logging in', error });
  }
});


// Google OAuth routes
router.get('/google', (req, res, next) => {
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    prompt: 'select_account',
  })(req, res, next);
});




router.get('/google/callback', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    console.log('Processing Google callback');
    console.log('User data:', req.user);
    
    const user = req.user as any;
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET as string,
      { expiresIn: '1h' }
    );

    const frontendURL = process.env.NODE_ENV === 'production'
      ? 'https://tempo-frontend.onrender.com'
      : 'http://localhost:3000';

    const redirectURL = `${frontendURL}/auth-callback?token=${token}&role=${user.role}`;
    console.log('Final redirect URL:', redirectURL);

    res.redirect(redirectURL);
  }
);


// Add this route to your auth.ts
router.get('/manager-details', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    
    // Query your database for manager details
    const query = `
      SELECT id, username, email, role
      FROM users
      WHERE id = $1 AND role = 'manager'
    `;
    
    const result = await pool.query(query, [userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Manager not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching manager details:', error);
    res.status(500).json({ message: 'Error fetching manager details' });
  }
});





export default router;