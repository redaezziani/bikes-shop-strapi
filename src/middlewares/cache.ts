import { getRedisClient } from '../utils/redis';
import type { Context, Next } from 'koa';

interface CacheConfig {
  maxAge?: number;
  excludeRoutes?: string[];
  includeQuery?: boolean;
}

const defaultConfig: CacheConfig = {
  maxAge: 300, // 5 minutes default
  excludeRoutes: ['/admin', '/api/auth', '/api/upload'],
  includeQuery: true,
};

const generateCacheKey = (ctx: Context, includeQuery: boolean): string => {
  const path = ctx.path;
  const query = includeQuery ? JSON.stringify(ctx.query) : '';
  const method = ctx.method;
  return `strapi:cache:${method}:${path}:${query}`;
};

const shouldCache = (ctx: Context, config: CacheConfig): boolean => {
  // Only cache GET requests
  if (ctx.method !== 'GET') {
    return false;
  }

  // Don't cache if Authorization header is present (user-specific data)
  if (ctx.headers.authorization) {
    return false;
  }

  // Check if route should be excluded
  const excludeRoutes = config.excludeRoutes || defaultConfig.excludeRoutes || [];
  const isExcluded = excludeRoutes.some(route => ctx.path.startsWith(route));

  return !isExcluded;
};

export default (config: CacheConfig = {}) => {
  const mergedConfig = { ...defaultConfig, ...config };

  return async (ctx: Context, next: Next) => {
    const redis = getRedisClient();

    // If Redis is not available, skip caching
    if (!redis) {
      return next();
    }

    // Check if this request should be cached
    if (!shouldCache(ctx, mergedConfig)) {
      return next();
    }

    const cacheKey = generateCacheKey(ctx, mergedConfig.includeQuery ?? true);

    try {
      // Try to get cached response
      const cachedData = await redis.get(cacheKey);

      if (cachedData) {
        // Parse and return cached response
        const cached = JSON.parse(cachedData);
        ctx.status = cached.status || 200;
        ctx.body = cached.body;
        ctx.set('X-Cache', 'HIT');
        ctx.set('X-Cache-Key', cacheKey);

        // Get TTL for debugging
        const ttl = await redis.ttl(cacheKey);
        ctx.set('X-Cache-TTL', ttl.toString());

        return;
      }

      // Cache miss - continue to next middleware
      ctx.set('X-Cache', 'MISS');
      await next();

      // Cache the response if it was successful
      if (ctx.status >= 200 && ctx.status < 300 && ctx.body) {
        const responseToCache = {
          status: ctx.status,
          body: ctx.body,
          headers: ctx.response.headers,
        };

        const maxAge = mergedConfig.maxAge || defaultConfig.maxAge || 300;
        await redis.setex(
          cacheKey,
          maxAge,
          JSON.stringify(responseToCache)
        );

        ctx.set('X-Cache-Stored', 'true');
      }
    } catch (error) {
      // Log error but don't break the request
      console.error('Redis cache error:', error);
      ctx.set('X-Cache', 'ERROR');
      return next();
    }
  };
};
