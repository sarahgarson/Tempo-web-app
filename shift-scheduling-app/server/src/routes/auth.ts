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

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET as string,
      { expiresIn: '1h' }
    );

    console.log('Login successful');
    res.json({ token, userId: user.id, role: user.role });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Error logging in', error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email']
}));

// router.get('/google/callback', 
//   passport.authenticate('google', { failureRedirect: '/login' }),
//   (req, res) => {
//     const user = req.user as any;
//     const token = jwt.sign(
//       { userId: user.id, role: user.role },
//       process.env.JWT_SECRET as string,
//       { expiresIn: '1h' }
//     );
//     res.redirect(`http://localhost:3000/auth-callback?token=${token}&role=${user.role}`);
//   }
// );


router.get('/google/callback', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    const user = req.user as any;
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET as string,
      { expiresIn: '1h' }
    );
    
    // Set token in cookie
    res.cookie('token', token, { httpOnly: true });
    
    // Redirect directly to the appropriate page
    const redirectPath = user.role === 'manager' ? '/manager-schedule' : '/employee-schedule';
    res.redirect(`https://tempo-frontend.onrender.com${redirectPath}`);
  }
);





export default router;