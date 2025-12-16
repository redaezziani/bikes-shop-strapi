import Redis from 'ioredis';

let redisClient: Redis | null = null;
let isRedisAvailable = true;
let lastErrorLog = 0;
const ERROR_LOG_INTERVAL = 60000; // Log errors at most once per minute

export const getRedisClient = (): Redis | null => {
  // If Redis is known to be unavailable, don't try to reconnect on every request
  if (!isRedisAvailable) {
    return null;
  }

  if (!redisClient) {
    try {
      const redisHost = process.env.REDIS_HOST;
      const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
      const redisPassword = process.env.REDIS_PASSWORD;

      // If Redis is not configured, disable it
      if (!redisHost) {
        console.log('ℹ️ Redis not configured - caching disabled');
        isRedisAvailable = false;
        return null;
      }

      redisClient = new Redis({
        host: redisHost,
        port: redisPort,
        password: redisPassword,
        retryStrategy: (times) => {
          // Limit retries to 5 attempts
          if (times > 5) {
            console.error('❌ Redis connection failed after 5 attempts - caching disabled');
            isRedisAvailable = false;
            return null; // Stop retrying
          }
          const delay = Math.min(times * 1000, 5000);
          return delay;
        },
        maxRetriesPerRequest: 2,
        enableReadyCheck: true,
        lazyConnect: false,
        connectTimeout: 10000,
        enableOfflineQueue: false, // Don't queue commands when offline
      });

      redisClient.on('connect', () => {
        console.log('✅ Redis connected successfully');
        isRedisAvailable = true;
      });

      redisClient.on('error', (err) => {
        const now = Date.now();
        // Rate-limit error logging to avoid spam
        if (now - lastErrorLog > ERROR_LOG_INTERVAL) {
          console.error('❌ Redis connection error:', err.message);
          console.log('ℹ️ Application will continue without caching');
          lastErrorLog = now;
        }
        isRedisAvailable = false;
      });

      redisClient.on('ready', () => {
        console.log('🚀 Redis client is ready');
        isRedisAvailable = true;
      });

      redisClient.on('close', () => {
        console.log('⚠️ Redis connection closed');
        isRedisAvailable = false;
      });
    } catch (error) {
      console.error('Failed to initialize Redis client:', error);
      isRedisAvailable = false;
      return null;
    }
  }

  return isRedisAvailable ? redisClient : null;
};

export const closeRedisConnection = async (): Promise<void> => {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    console.log('Redis connection closed');
  }
};

export default {
  getRedisClient,
  closeRedisConnection,
};
