import { createClient } from 'redis';

const redisUrl = process.env.REDIS_URL;

const redisClient = redisUrl
  ? createClient({
      url: redisUrl,
      socket: {
        connectTimeout: 5000,
        reconnectStrategy: (retries) => {
          const delay = Math.min(retries * 500, 3000);

          if (retries >= 5) {
            console.error('[Redis] Reconnect retries exceeded. Stop reconnecting.');
            return false;
          }

          console.warn(
            `[Redis] Reconnecting... retry=${retries}, delay=${delay}ms`,
          );
          return delay;
        },
      },
    })
  : null;

redisClient?.on('error', (error) => {
  console.error('[Redis] Client error:', error);
});

redisClient?.on('connect', () => {
  console.log('[Redis] Connect event');
});

redisClient?.on('ready', () => {
  console.log('[Redis] Ready');
});

redisClient?.on('reconnecting', () => {
  console.warn('[Redis] Reconnecting event...');
});

redisClient?.on('end', () => {
  console.warn('[Redis] Connection closed');
});

export const connectRedis = async () => {
  try {
    if (!redisClient) {
      console.warn('[Redis] REDIS_URL not set. Redis disabled.');
      return;
    }

    if (redisClient.isOpen) {
      console.log('[Redis] Already connected');
      return;
    }

    await redisClient.connect();
    console.log('[Redis] Connected');
  } catch (error) {
    console.error('[Redis] Failed to connect:', error);
  }
};

export const disconnectRedis = async () => {
  try {
    if (!redisClient) {
      console.warn('[Redis] Disconnect skipped - redis disabled');
      return;
    }

    if (redisClient.isOpen) {
      await redisClient.quit();
      console.log('[Redis] Disconnected');
      return;
    }

    console.warn('[Redis] Disconnect skipped - redis not connected');
  } catch (error) {
    console.error('[Redis] Failed to disconnect:', error);
  }
};

export default redisClient;