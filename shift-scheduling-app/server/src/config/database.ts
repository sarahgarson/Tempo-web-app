import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

export const pool = new Pool(
  isProduction
    ? {
        connectionString: 'postgresql://tempo_user:mvVOmmkdZ5W58iboda5vjA5weiYsUOsm@dpg-csghnstumphs73b5rleg-a.frankfurt-postgres.render.com/tempo_database',
        ssl: {
          rejectUnauthorized: false
        }
      }
    : {
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASSWORD,
        port: parseInt(process.env.DB_PORT || '5432'),
      }
);

pool.on('connect', () => {
  console.log(`Database connected successfully in ${process.env.NODE_ENV} mode`);
});

pool.on('error', (err) => {
  console.error('Database connection error:', err);
});
