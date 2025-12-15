/**
 * support-page controller
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::support-page.support-page' as any, ({ strapi }) => ({
  async find(ctx) {
    // Populate categories and their nested FAQs
    ctx.query = {
      ...ctx.query,
      populate: {
        categories: {
          populate: ['faqs']
        }
      }
    };

    const { data, meta } = await super.find(ctx);
    return { data, meta };
  }
}));
