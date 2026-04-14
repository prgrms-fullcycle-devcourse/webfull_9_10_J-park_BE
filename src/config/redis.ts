import { createClient, type RedisClientType } from 'redis';

const redisUrl = process.env.REDIS_URL;

const createRedisConnection = (): RedisClientType | null => {
  if (!redisUrl) return null;

  return createClient({
    url: redisUrl,
    socket: {
      connectTimeout: 5000,
      reconnectStrategy: (retries) => {
        const delay = Math.min(retries * 500, 3000);

        if (retries >= 5) {
          console.error(
            '[Redis] Reconnect retries exceeded. Stop reconnecting.',
          );
          return false;
        }

        console.warn(
          `[Redis] Reconnecting... retry=${retries}, delay=${delay}ms`,
        );
        return delay;
      },
    },
  });
};

const redisClient = createRedisConnection();
const redisMonitorClient = createRedisConnection();

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

redisMonitorClient?.on('error', (error) => {
  console.error('[Redis Monitor] Client error:', error);
});

redisMonitorClient?.on('end', () => {
  console.warn('[Redis Monitor] Connection closed');
});

export const connectRedis = async () => {
  try {
    if (!redisClient) {
      console.warn('[Redis] REDIS_URL not set. Redis disabled.');
      return;
    }

    if (redisClient.isOpen || redisClient.isReady) {
      console.log('[Redis] Already connected');
      return;
    }

    await redisClient.connect();
    console.log('[Redis] Connected');
  } catch (error) {
    console.error('[Redis] Failed to connect:', error);
  }
};

export const startRedisMonitor = async () => {
  try {
    if (!redisMonitorClient) {
      console.warn('[Redis Monitor] REDIS_URL not set. Monitor disabled.');
      return;
    }

    if (redisMonitorClient.isOpen || redisMonitorClient.isReady) {
      console.log('[Redis Monitor] Already connected');
      return;
    }

    await redisMonitorClient.connect();
    console.log('[Redis Monitor] Connected');

    const handleMonitor = (...monitorArgs: unknown[]) => {
      console.log('[Redis Monitor]', JSON.stringify(monitorArgs, null, 2));
    };

    await redisMonitorClient.monitor(handleMonitor as never);
    console.log('[Redis Monitor] Started');
  } catch (error) {
    console.error('[Redis Monitor] Failed to start:', error);
  }
};

export const disconnectRedis = async () => {
  try {
    if (!redisClient) {
      console.warn('[Redis] Disconnect skipped - redis disabled');
    } else if (redisClient.isOpen) {
      await redisClient.quit();
      console.log('[Redis] Disconnected');
    } else {
      console.warn('[Redis] Disconnect skipped - redis not connected');
    }

    if (!redisMonitorClient) {
      console.warn('[Redis Monitor] Disconnect skipped - monitor disabled');
      return;
    }

    if (redisMonitorClient.isOpen) {
      await redisMonitorClient.quit();
      console.log('[Redis Monitor] Disconnected');
      return;
    }

    console.warn('[Redis Monitor] Disconnect skipped - monitor not connected');
  } catch (error) {
    console.error('[Redis] Failed to disconnect:', error);
  }
};

export default redisClient;
