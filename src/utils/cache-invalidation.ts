import { getRedisClient } from './redis';

/**
 * Invalidate all cache entries matching a pattern
 * @param pattern - Redis key pattern (e.g., 'strapi:cache:GET:/api/products:*')
 */
export const invalidateCacheByPattern = async (pattern: string): Promise<number> => {
  const redis = getRedisClient();

  if (!redis) {
    console.warn('Redis client not available for cache invalidation');
    return 0;
  }

  try {
    const keys = await redis.keys(pattern);

    if (keys.length === 0) {
      return 0;
    }

    const result = await redis.del(...keys);
    console.log(`✅ Invalidated ${result} cache entries matching pattern: ${pattern}`);
    return result;
  } catch (error) {
    console.error('Error invalidating cache by pattern:', error);
    return 0;
  }
};

/**
 * Invalidate all cache entries for a specific API route
 * @param path - API path (e.g., '/api/products')
 */
export const invalidateCacheByRoute = async (path: string): Promise<number> => {
  const pattern = `strapi:cache:GET:${path}:*`;
  return invalidateCacheByPattern(pattern);
};

/**
 * Clear all cached data
 */
export const clearAllCache = async (): Promise<boolean> => {
  const redis = getRedisClient();

  if (!redis) {
    console.warn('Redis client not available for clearing cache');
    return false;
  }

  try {
    await redis.flushdb();
    console.log('✅ All cache cleared');
    return true;
  } catch (error) {
    console.error('Error clearing all cache:', error);
    return false;
  }
};

/**
 * Get cache statistics
 */
export const getCacheStats = async (): Promise<{
  totalKeys: number;
  cacheKeys: number;
  memoryUsed: string;
}> => {
  const redis = getRedisClient();

  if (!redis) {
    return {
      totalKeys: 0,
      cacheKeys: 0,
      memoryUsed: '0',
    };
  }

  try {
    const dbSize = await redis.dbsize();
    const cacheKeys = await redis.keys('strapi:cache:*');
    const info = await redis.info('memory');

    // Parse memory info
    const memoryMatch = info.match(/used_memory_human:([^\r\n]+)/);
    const memoryUsed = memoryMatch ? memoryMatch[1] : 'unknown';

    return {
      totalKeys: dbSize,
      cacheKeys: cacheKeys.length,
      memoryUsed,
    };
  } catch (error) {
    console.error('Error getting cache stats:', error);
    return {
      totalKeys: 0,
      cacheKeys: 0,
      memoryUsed: '0',
    };
  }
};

export default {
  invalidateCacheByPattern,
  invalidateCacheByRoute,
  clearAllCache,
  getCacheStats,
};
