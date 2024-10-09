import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import passport from '../config/passport';
import { pool } from '../config/database';
import { createUser, getUserByEmail, validatePassword } from '../models/User';

const router = express.Router();

// User Registration Route
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, role } = req.body;
    
    // Create user using the model method
    const user = await createUser({ username, email, password, role });
    
    // Respond with success message and user ID
    res.status(201).json({ message: 'User created successfully', userId: user.id });
  } catch (error) {
    // Error handling in case of issues during registration
    console.error('Error in registration route:', error);
    res.status(500).json({ message: 'Error creating user', error });
  }
});

// User Login Route
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Fetch user by email from the database
    const user = await getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Validate the password using bcrypt and custom validation logic
    const isValidPassword = await validatePassword(user, password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET as string,
      { expiresIn: '1h' }
    );
    
    // Respond with the token and user information
    res.json({ token, userId: user.id, role: user.role });
  } catch (error) {
    // Error handling in case of issues during login
    console.error('Error in login route:', error);
    res.status(500).json({ message: 'Error logging in', error });
  }
});

// Google OAuth Login Route
router.get('/google', 
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

// Google OAuth Callback Route
router.get('/google/callback', 
  passport.authenticate('google', { failureRedirect: '/login' }), 
  (req, res) => {
    const user = req.user as any;

    // Generate JWT token for Google-authenticated user
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET as string,
      { expiresIn: '1h' }
    );

    // Redirect to the client app with the token and role
    res.redirect(`http://localhost:3001/auth-callback?token=${token}&role=${user.role}`);
  }
);

export default router;
