import { createClient } from 'redis';

const redisClient = createClient({
  url: process.env.REDIS_URL,
  socket: {
    connectTimeout: 5000,
    reconnectStrategy: (retries) => {
      if (retries >= 5) return false;
      return Math.min(retries * 500, 3000);
    },
  },
});

redisClient.on('error', (error) => {
  console.error('[Redis] Client error:', error);
});

redisClient.on('connect', () => {
  console.log('[Redis] Connected');
});

redisClient.on('reconnecting', () => {
  console.warn('[Redis] Reconnecting...');
});

export const connectRedis = async () => {
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }
};

export const disconnectRedis = async () => {
  if (redisClient.isOpen) {
    await redisClient.disconnect();
  }
};

export default redisClient;
