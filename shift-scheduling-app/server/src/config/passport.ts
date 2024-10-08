import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import { pool } from './database';
import dotenv from 'dotenv';

dotenv.config();

// Google Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  callbackURL: "http://localhost:5003/api/auth/google/callback"
},
async (accessToken, refreshToken, profile, done) => {
  try {
    // First, check if user exists by Google ID
    let result = await pool.query('SELECT * FROM users WHERE google_id = $1', [profile.id]);
    
    if (result.rows.length === 0) {
      // If not found by Google ID, check by email
      result = await pool.query('SELECT * FROM users WHERE email = $1', [profile.emails![0].value]);
    }

    if (result.rows.length > 0) {
      // User exists, update Google ID if it's not set
      if (!result.rows[0].google_id) {
        await pool.query('UPDATE users SET google_id = $1 WHERE id = $2', [profile.id, result.rows[0].id]);
      }
      return done(null, result.rows[0]);
    } else {
      // User doesn't exist, create a new user
      const newUser = await pool.query(
        'INSERT INTO users (google_id, email, name, role) VALUES ($1, $2, $3, $4) RETURNING *',
        [profile.id, profile.emails![0].value, profile.displayName, 'employee']
      );
      return done(null, newUser.rows[0]);
    }
  } catch (error) {
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
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [jwt_payload.userId]);
    const user = result.rows[0];

    if (user) {
      return done(null, user);
    } else {
      return done(null, false);
    }
  } catch (error) {
    return done(error, false);
  }
}));

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