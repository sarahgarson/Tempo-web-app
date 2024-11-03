import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

export const pool = new Pool(
  isProduction
    ? {
        connectionString: 'postgresql://sarahgarson:CTemuEUDuyiK6lbYXeAQFafFuamEkPnG@dpg-csjkl723esus73863vag-a/shift_scheduling_app',
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
