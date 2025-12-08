/**
 * along-care-page router
 * Read-only API - only allows GET requests
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::along-care-page.along-care-page' as any, {
  only: ['find'],
});
