/**
 * guides-stories-page router
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::guides-stories-page.guides-stories-page' as any, {
  only: ['find'],
});
