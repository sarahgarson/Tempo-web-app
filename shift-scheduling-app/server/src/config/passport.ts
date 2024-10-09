import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { pool } from './database';
import dotenv from 'dotenv';

dotenv.config();

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    callbackURL: "http://localhost:5003/api/auth/google/callback"
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Check if user already exists in your database
      const result = await pool.query('SELECT * FROM users WHERE google_id = $1', [profile.id]);
      
      if (result.rows.length > 0) {
        // User exists, return the user
        return done(null, result.rows[0]);
      } else {
        // User doesn't exist, create a new user
        const newUser = await pool.query(
          'INSERT INTO users (google_id, email, name) VALUES ($1, $2, $3) RETURNING *',
          [profile.id, profile.emails![0].value, profile.displayName]
        );
        return done(null, newUser.rows[0]);
      }
    } catch (error) {
      return done(error as Error);
    }
  }
));

passport.serializeUser((user: any, done) => {
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