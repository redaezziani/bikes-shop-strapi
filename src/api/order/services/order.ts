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

            orderItem.product = productId;
            console.log('Adding product to order item:', { productId });
          } else if (item.item_type === 'accessory' && item.accessory) {
            // Handle both object and string formats
            const accessoryId =
              typeof item.accessory === 'string'
                ? item.accessory
                : item.accessory.documentId;

            orderItem.accessory = accessoryId;
            console.log('Adding accessory to order item:', { accessoryId });
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
