import { createClient } from 'redis';

const redisUrl = process.env.REDIS_URL;

const redisClient = redisUrl
  ? createClient({
      url: redisUrl,
      socket: {
        connectTimeout: 5000,
        reconnectStrategy: (retries) => {
          if (retries >= 5) return false;
          return Math.min(retries * 500, 3000);
        },
      },
    })
  : null;

redisClient?.on('error', (error) => {
  console.error('[Redis] Client error:', error);
});

redisClient?.on('connect', () => {
  console.log('[Redis] Connected');
});

redisClient?.on('reconnecting', () => {
  console.warn('[Redis] Reconnecting...');
});

export const connectRedis = async () => {
  try {
    if (!redisClient) {
      console.warn('[Redis] REDIS_URL not set. Redis disabled.');
      return;
    }

    if (!redisClient.isOpen) {
      await redisClient.connect();
    }
  } catch (error) {
    console.error('[Redis] Failed to connect:', error);
  }
};

export const disconnectRedis = async () => {
  try {
    if (redisClient?.isOpen) {
      await redisClient.quit();
    }
  } catch (error) {
    console.error('[Redis] Failed to disconnect:', error);
  }
};

export default redisClient;