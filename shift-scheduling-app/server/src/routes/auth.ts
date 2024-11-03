import express, { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import passport from '../config/passport';
import { createUser, getUserByEmail, validatePassword } from '../models/User';

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
    console.log('Login attempt for:', email);

    const user = await getUserByEmail(email);
    if (!user) {
      console.log('User not found');
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Add role validation here
    if (user && user.role) {
      console.log('Original user role:', user.role);
      if (!['employee', 'manager'].includes(user.role)) {
        user.role = 'employee';
        console.log('Invalid role detected, defaulting to:', user.role);
      }
    }

    console.log('User found:', { id: user.id, email: user.email, role: user.role });

    if (user.password === null) {
      console.log('User has no password (possibly Google account)');
      return res.status(401).json({ message: 'Invalid login method' });
    }

    const isValidPassword = await validatePassword(user, password);
    console.log('Password validation result:', isValidPassword);

    if (!isValidPassword) {
      console.log('Password does not match');
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    console.log('User role from database:', user.role);
    console.log('User ID from database:', user.id);
    console.log('Creating token with role:', user.role);
    
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET as string,
      { expiresIn: '1h' }
    );

    const response = { token, userId: user.id, role: user.role };
    console.log('Sending response:', response);

    res.json(response);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Error logging in', error: error instanceof Error ? error.message : 'Unknown error' });
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




export default router;