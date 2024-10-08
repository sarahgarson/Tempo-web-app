import { pool } from '../config/database';
import bcrypt from 'bcrypt';

export interface User {
  id: number;
  username: string;
  email: string;
  password: string;
  role: 'employee' | 'manager';
}

export const createUser = async (user: Omit<User, 'id'>): Promise<User> => {
  const hashedPassword = await bcrypt.hash(user.password, 10);
  const result = await pool.query(
    'INSERT INTO users (username, email, password, role) VALUES ($1, $2, $3, $4) RETURNING *',
    [user.username, user.email, hashedPassword, user.role]
  );
  return result.rows[0];
};

export const getUserByEmail = async (email: string): Promise<User | null> => {
  const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  return result.rows[0] || null;
};

export const validatePassword = async (user: User, password: string): Promise<boolean> => {
  return bcrypt.compare(password, user.password);
};