import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import passport from './config/passport'
import authRoutes from './routes/auth';
import scheduleRoutes from './routes/schedules';

dotenv.config();

const app = express();
const port = process.env.PORT || 5003;

app.use(cors());
app.use(express.json());
app.use(passport.initialize());

app.use('/api/auth', authRoutes, passport.authenticate('jwt', { session: false }));
app.use('/api/schedules', scheduleRoutes);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});