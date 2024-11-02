import passport from 'passport';
import { Strategy as GoogleStrategy, Profile, VerifyCallback } from 'passport-google-oauth20';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import { pool } from './database';
import dotenv from 'dotenv';

dotenv.config();


// Google Strategy
const isProduction = process.env.NODE_ENV === 'production';
const callbackURL = isProduction
? 'https://tempo-web-app.onrender.com/api/auth/google/callback'
: 'http://localhost:5003/api/auth/google/callback';


console.log('Current environment:', process.env.NODE_ENV);
console.log('Is Production:', isProduction);
console.log('Using callback URL:', callbackURL);


passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  callbackURL: callbackURL,
  proxy: true
},
async (accessToken: string, refreshToken: string, profile: Profile, done: VerifyCallback) => {
  console.log('Google Strategy Callback Started');
  
  if (!profile.emails || !profile.emails[0].value) {
    console.error('No email provided from Google');
    return done(new Error('No email provided from Google'));
  }

  const email = profile.emails[0].value;
  const googleId = profile.id;
  const displayName = profile.displayName || email.split('@')[0];

  try {
    // Transaction to ensure data consistency
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Check for existing user
      let result = await client.query(
        'SELECT * FROM users WHERE google_id = $1 OR email = $2',
        [googleId, email]
      );

      let user;
      
      if (result.rows.length > 0) {
        user = result.rows[0];
        // Update existing user if needed
        await client.query(
          'UPDATE users SET google_id = $1, name = $2 WHERE id = $3',
          [googleId, displayName, user.id]
        );
      } else {
        // Create new user
        const newUserResult = await client.query(
          'INSERT INTO users (google_id, email, name, role) VALUES ($1, $2, $3, $4) RETURNING *',
          [googleId, email, displayName, 'employee']
        );
        user = newUserResult.rows[0];
      }

      await client.query('COMMIT');
      console.log('User processed successfully:', user);
      return done(null, user);
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Database error:', error);
    return done(error as Error);
  }
}));



// JWT Strategy
const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET as string,
};

passport.use(new JwtStrategy(jwtOptions, async (jwt_payload, done) => {
  try {
    console.log('JWT Strategy: Payload:', jwt_payload);
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [jwt_payload.userId]);
    const user = result.rows[0];

    if (user) {
      return done(null, user);
    } else {
      return done(null, false);
    }
  } catch (error) {
    console.error('JWT Strategy Error:', error);
    return done(error, false);
  }
}));

passport.serializeUser((user: any, done) => {
  console.log('Serialize User:', user);
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    done(null, result.rows[0]);
  } catch (error) {
    done(error as Error);
  }
});

export default passport;