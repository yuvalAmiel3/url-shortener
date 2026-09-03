import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { connectMongo } from './mongo';
import { connectRedis } from './redis';
import { rateLimiter } from './middleware';
import router from './routes';

dotenv.config();

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '../src/public')));
app.use(rateLimiter);
app.use('/', router);

const PORT = process.env.PORT || 3000;

const start = async () => {
  await connectMongo();
  await connectRedis();
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
};

start();