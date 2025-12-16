import { getCacheStats, clearAllCache, invalidateCacheByRoute } from '../../../utils/cache-invalidation';

export default {
  async getStats(ctx) {
    try {
      const stats = await getCacheStats();
      ctx.body = {
        success: true,
        data: stats,
      };
    } catch (error) {
      ctx.body = {
        success: false,
        error: error.message,
      };
    }
  },

  async clearCache(ctx) {
    try {
      const result = await clearAllCache();
      ctx.body = {
        success: result,
        message: result ? 'All cache cleared successfully' : 'Failed to clear cache',
      };
    } catch (error) {
      ctx.body = {
        success: false,
        error: error.message,
      };
    }
  },

  async invalidateRoute(ctx) {
    try {
      const { route } = ctx.request.body;

      if (!route) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          error: 'Route parameter is required',
        };
        return;
      }

      const count = await invalidateCacheByRoute(route);
      ctx.body = {
        success: true,
        message: `Invalidated ${count} cache entries for route: ${route}`,
        count,
      };
    } catch (error) {
      ctx.body = {
        success: false,
        error: error.message,
      };
    }
  },
};
