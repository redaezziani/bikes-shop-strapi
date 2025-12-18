/**
 * order-item service
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreService(
  'api::order-item.order-item',
  ({ strapi }) => ({
    /**
     * Generate a unique SKU for an order item
     * Format: ORD{orderId}-{productSlug}-{color}-{timestamp}
     * Example: ORD123-MOUNTAIN-BIKE-RED-LC2K3F
     * Example: ORD123-HELMET-BASIC-LC2K3G
     */
    generateSKU(
      orderId: number,
      itemType: 'bike' | 'accessory',
      productName: string,
      colorName?: string,
    ): string {
      const timestamp = Date.now().toString(36).toUpperCase();

      // Convert product name to clean slug format (uppercase, no spaces, max 20 chars)
      const productSlug = productName
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 20);

      // Convert color name to clean format (uppercase, no spaces, max 10 chars)
      const colorSlug = colorName
        ? colorName
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '')
            .substring(0, 10)
        : 'NOCOLOR';

      return `ORD${orderId}-${productSlug}-${colorSlug}-${timestamp}`;
    },

    /**
     * Create an order item with auto-generated SKU
     */
    async createWithSKU(data: any) {
      const orderId = data.order?.id || data.order;
      const itemType = data.item_type;
      const productName = data.productName;
      const colorName = data.color_name;

      if (!orderId || !itemType || !productName) {
        throw new Error('Order ID, item type, and product name are required to generate SKU');
      }

      // Generate unique SKU with product and color info
      let sku = this.generateSKU(orderId, itemType, productName, colorName);
      let isUnique = false;
      let attempts = 0;
      const maxAttempts = 10;

      // Ensure SKU is unique
      while (!isUnique && attempts < maxAttempts) {
        const existing = await strapi.documents('api::order-item.order-item').findMany({
          filters: { sku: { $eq: sku } },
        });

        if (existing.length === 0) {
          isUnique = true;
        } else {
          // Regenerate if collision detected (add random suffix)
          sku = this.generateSKU(orderId, itemType, productName, colorName) +
                `-${Math.random().toString(36).substring(2, 4).toUpperCase()}`;
          attempts++;
        }
      }

      if (!isUnique) {
        throw new Error('Failed to generate unique SKU after multiple attempts');
      }

      // Remove productName from data before creating (it's not a field in the schema)
      const { productName: _, ...itemData } = data;

      // Create the order item with the generated SKU
      const createdItem: any = await strapi.documents('api::order-item.order-item').create({
        data: itemData,
      });

      // Manually set the SKU using update since it might not be in the create response
      await strapi.documents('api::order-item.order-item').update({
        documentId: createdItem.documentId,
        data: { sku },
      });

      return { ...createdItem, sku };
    },
  }),
);
