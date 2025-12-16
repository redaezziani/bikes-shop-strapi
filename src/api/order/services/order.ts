/**
 * order service
 */
import { factories } from '@strapi/strapi';

interface OrderItem {
  item_type: 'bike' | 'accessory';
  product?: {
    id: number;
    documentId: string;
  };
  accessory?: {
    id: number;
    documentId: string;
  };
  quantity: number;
  unit_price: number;
  color_name?: string;
  color_hex?: string;
}

interface CreateOrderWithItemsParams {
  customerEmail: string;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  customerCity?: string;
  customerCountry?: string;
  note?: string;
  agreedToTerms: boolean;
  items: OrderItem[];
}

export default factories.createCoreService(
  'api::order.order',
  ({ strapi }) => ({
    /**
     * Decrement product inventory after successful payment
     */
    async decrementInventory(orderId: number) {
      try {
        console.log(`Decrementing inventory for order ${orderId}`);

        // Fetch order with items
        const orders = await strapi.documents('api::order.order').findMany({
          filters: { id: { $eq: orderId } },
          populate: ['items', 'items.product', 'items.accessory'],
        });

        if (orders.length === 0) {
          throw new Error(`Order ${orderId} not found`);
        }

        const order = orders[0];

        // Process each order item
        for (const item of order.items || []) {
          if (item.item_type === 'bike' && item.product && item.color_name) {
            // Get the full product with colors
            const product = await strapi
              .documents('api::product.product')
              .findOne({
                documentId: item.product.documentId,
                populate: ['colors'],
              });

            if (!product || !product.colors) {
              console.warn(
                `Product ${item.product.documentId} not found or has no colors`,
              );
              continue;
            }

            // Find the specific color and decrement its quantity
            const updatedColors = product.colors.map((color: any) => {
              if (color.name === item.color_name) {
                const newQuantity = Math.max(0, (color.quantity || 0) - item.quantity);
                console.log(
                  `Product ${product.name}, Color ${color.name}: ${color.quantity} -> ${newQuantity}`,
                );
                return {
                  ...color,
                  quantity: newQuantity,
                };
              }
              return color;
            });

            // Update the product with new color quantities
            await strapi.documents('api::product.product').update({
              documentId: product.documentId,
              data: {
                colors: updatedColors,
              },
            });

            console.log(
              `✓ Decremented ${item.quantity} units of ${product.name} (${item.color_name})`,
            );
          } else if (item.item_type === 'accessory' && item.accessory) {
            // For accessories, you might want to add quantity tracking in the future
            console.log(
              `Accessory inventory management not implemented: ${item.accessory.title}`,
            );
          }
        }

        console.log(`✓ Inventory decremented successfully for order ${orderId}`);
      } catch (error) {
        console.error('Error decrementing inventory:', error);
        throw error;
      }
    },

    async createOrderWithItems(params: CreateOrderWithItemsParams) {
      const {
        customerEmail,
        customerName,
        customerPhone,
        customerAddress,
        customerCity,
        customerCountry,
        note,
        agreedToTerms,
        items,
      } = params;

      try {
        console.log('Creating order with items:', {
          customerEmail,
          customerName,
          itemCount: items.length,
        });

        // Calculate total amount
        const totalAmount = items.reduce(
          (sum, item) => sum + item.unit_price * item.quantity,
          0,
        );

        // Create order
        const order = await strapi.documents('api::order.order').create({
          data: {
            customer_email: customerEmail,
            customer_name: customerName,
            customer_phone: customerPhone,
            customer_address: customerAddress,
            customer_city: customerCity,
            customer_country: customerCountry,
            note: note,
            agreed_to_terms: agreedToTerms,
            total_amount: totalAmount,
            currency: 'usd',
            payment_status: 'pending',
          },
        });

        console.log('Order created:', {
          id: order.id,
          documentId: order.documentId,
        });

        // Create order items
        for (const item of items) {
          const subtotal = item.unit_price * item.quantity;

          const orderItem: any = {
            item_type: item.item_type,
            quantity: item.quantity,
            unit_price: item.unit_price,
            subtotal: subtotal,
            order: order.documentId,
          };

          // Add product or accessory relation
          if (item.item_type === 'bike' && item.product) {
            // Handle both object and string formats
            const productId =
              typeof item.product === 'string'
                ? item.product
                : item.product.documentId;

            // Verify product exists before creating relation
            try {
              const product = await strapi
                .documents('api::product.product')
                .findOne({
                  documentId: productId,
                  status: 'published',
                });

              if (product) {
                orderItem.product = productId;
                console.log('Adding product to order item:', { productId });
              } else {
                console.error(`Product ${productId} not found or not published`);
                throw new Error(`Product ${productId} not available`);
              }
            } catch (err) {
              console.error(`Error verifying product ${productId}:`, err);
              throw new Error(`Product ${productId} not available`);
            }
          } else if (item.item_type === 'accessory' && item.accessory) {
            // Handle both object and string formats
            const accessoryId =
              typeof item.accessory === 'string'
                ? item.accessory
                : item.accessory.documentId;

            // Verify accessory exists before creating relation
            try {
              const accessory = await strapi
                .documents('api::accessory.accessory')
                .findOne({
                  documentId: accessoryId,
                  status: 'published',
                });

              if (accessory) {
                orderItem.accessory = accessoryId;
                console.log('Adding accessory to order item:', { accessoryId });
              } else {
                console.error(`Accessory ${accessoryId} not found or not published`);
                throw new Error(`Accessory ${accessoryId} not available`);
              }
            } catch (err) {
              console.error(`Error verifying accessory ${accessoryId}:`, err);
              throw new Error(`Accessory ${accessoryId} not available`);
            }
          }

          // Add color info if available
          if (item.color_name) {
            orderItem.color_name = item.color_name;
          }
          if (item.color_hex) {
            orderItem.color_hex = item.color_hex;
          }

          const createdItem = await strapi
            .documents('api::order-item.order-item')
            .create({
              data: orderItem,
            });

          console.log('Order item created:', {
            id: createdItem.id,
            itemType: item.item_type,
          });
        }

        // Return order with calculated ID
        return {
          id: order.id,
          documentId: order.documentId,
          total_amount: totalAmount,
          ...order,
        };
      } catch (error) {
        console.error('Error creating order with items:', error);
        throw error;
      }
    },
  }),
);
