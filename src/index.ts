import { invalidateCacheByRoute } from './utils/cache-invalidation';
import { getRedisClient, closeRedisConnection } from './utils/redis';
// import type { Core } from '@strapi/strapi';

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register({ strapi }) {
    // Initialize Redis connection
    try {
      const redis = getRedisClient();
      if (redis) {
        strapi.log.info('✅ Redis client initialized for caching');
      } else {
        strapi.log.warn('⚠️ Redis client could not be initialized - caching disabled');
      }
    } catch (error) {
      strapi.log.error('❌ Failed to initialize Redis:', error);
    }
  },

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap({ strapi }) {
    // Subscribe to lifecycle events to invalidate cache
    strapi.db.lifecycles.subscribe({
      models: [], // Empty array means all models

      async afterCreate(event) {
        const { model } = event;
        const apiPath = `/api/${model.collectionName}`;
        await invalidateCacheByRoute(apiPath);
        strapi.log.debug(`🔄 Cache invalidated for ${apiPath} after create`);
      },

      async afterUpdate(event) {
        const { model } = event;
        const apiPath = `/api/${model.collectionName}`;
        await invalidateCacheByRoute(apiPath);
        strapi.log.debug(`🔄 Cache invalidated for ${apiPath} after update`);
      },

      async afterDelete(event) {
        const { model } = event;
        const apiPath = `/api/${model.collectionName}`;
        await invalidateCacheByRoute(apiPath);
        strapi.log.debug(`🔄 Cache invalidated for ${apiPath} after delete`);
      },

      async afterCreateMany(event) {
        const { model } = event;
        const apiPath = `/api/${model.collectionName}`;
        await invalidateCacheByRoute(apiPath);
        strapi.log.debug(`🔄 Cache invalidated for ${apiPath} after createMany`);
      },

      async afterUpdateMany(event) {
        const { model } = event;
        const apiPath = `/api/${model.collectionName}`;
        await invalidateCacheByRoute(apiPath);
        strapi.log.debug(`🔄 Cache invalidated for ${apiPath} after updateMany`);
      },

      async afterDeleteMany(event) {
        const { model } = event;
        const apiPath = `/api/${model.collectionName}`;
        await invalidateCacheByRoute(apiPath);
        strapi.log.debug(`🔄 Cache invalidated for ${apiPath} after deleteMany`);
      },
    });

    strapi.log.info('✅ Cache invalidation lifecycle hooks registered');
  },

  async destroy({ strapi }) {
    // Clean up Redis connection when app shuts down
    await closeRedisConnection();
    strapi.log.info('👋 Redis connection closed');
  },
};
