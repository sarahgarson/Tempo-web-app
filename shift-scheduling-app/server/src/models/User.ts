import { pool } from '../config/database';
import bcrypt from 'bcrypt';

export interface User {
  id: number;
  email: string;
  password: string | null;
  name: string | null;
  created_at: Date;
  google_id: string | null;
  role: 'employee' | 'manager';
  username: string | null;
}

export const createUser = async (user: Partial<User>): Promise<User> => {
  let hashedPassword: string | null = null;
  
  if (user.password) {
    hashedPassword = await bcrypt.hash(user.password, 10);
  }
  
  const result = await pool.query(
    'INSERT INTO users (email, password, name, role, username, google_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
    [user.email, hashedPassword, user.name, user.role || 'employee', user.username, user.google_id]
  );
  return result.rows[0];
};

export const getUserByEmail = async (email: string): Promise<User | null> => {
  const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  return result.rows[0] || null;
};

export const validatePassword = async (user: User, password: string): Promise<boolean> => {
  if (!user.password) {
    console.log('User has no password set');
    return false;
  }

  if (user.password.startsWith('$2b$') || user.password.startsWith('$2a$')) {
    // Password is hashed, use bcrypt compare
    return bcrypt.compare(password, user.password);
  } else {
    // Password is not hashed, do a direct comparison
    return user.password === password;
  }
};

export const getUserByGoogleId = async (googleId: string): Promise<User | null> => {
  const result = await pool.query('SELECT * FROM users WHERE google_id = $1', [googleId]);
  return result.rows[0] || null;
};

export const updateUser = async (id: number, updates: Partial<User>): Promise<User | null> => {
  const setClause = Object.keys(updates)
    .map((key, index) => `${key} = $${index + 2}`)
    .join(', ');
  const values = Object.values(updates);
  
  const query = `UPDATE users SET ${setClause} WHERE id = $1 RETURNING *`;
  const result = await pool.query(query, [id, ...values]);
  return result.rows[0] || null;
};
