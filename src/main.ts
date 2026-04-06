import app from './app';
import { connectRedis } from './config/redis';

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await connectRedis();
    // eslint-disable-next-line no-console
    console.log('Redis connected');
  } catch (error) {
    console.error('Redis connection failed. Running without cache.', error);
  }

  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`🚀 Server is running at http://localhost:${PORT}`);
  });
};

startServer();
