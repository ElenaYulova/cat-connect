import cds from '@sap/cds';

export default class SalesOrderService extends cds.ApplicationService {
    async init(): Promise<void> {

        // Extract query builders from CAP QL
        const { SELECT } = cds.ql;

        // Strictly type service entities using native cds.entity
        const Orders: cds.entity = this.entities.Orders;
        const Products: cds.entity = this.entities.Products;

        /**
        * Cross-context discount (before CREATE / UPDATE)
        */

        this.before(['CREATE', 'UPDATE'], 'Orders', async (req: cds.Request) => {
            const order = req.data;
            if (!order || !order.items || order.items.length === 0) return;

            let totalGross = 0;

            // Gross total of card
            for (const item of order.items) {
                if (!item.game_id) continue;

                const game = await cds.db.run(SELECT.one.from(Products).where({ id: item.game_id }));
                if (game) {
                    totalGross += (game.price * (item.quantity || 1));
                }
            }

            order.totalAmount = +totalGross.toFixed(2);

            // customer status from CRM
            if (order.customer_id) {
                const gamerProfile = await cds.db.run(
                    SELECT.one.from('SalesOrderService.CustomerInsights')
                        .where({ ID: order.customer_id })
                        .columns('customerStatus', 'averageRating')
                );

                if (gamerProfile && gamerProfile.customerStatus === 'A' && Number(gamerProfile.averageRating) >= 4.0) {
                    order.discountValue = +(totalGross * 0.15).toFixed(2);
                } else {
                    order.discountValue = 0;
                }
            } else {
                order.discountValue = 0;
            }

            order.netAmount = +(order.totalAmount - order.discountValue).toFixed(2);
        });

        /**
        * Warehouse control with duplicate write-off protection.
        */

        this.before('UPDATE', 'Orders', async (req: cds.Request) => {
            const currentOrder = req.data;
            if (!currentOrder) return;

            if (currentOrder.status_code !== 'P' && currentOrder.status_code !== 'C') return;

            // Check prev state
            const previousState = await cds.db.run(SELECT.one.from(Orders).where({ id: currentOrder.id }).columns('status_code'));
            if (previousState && (previousState.status_code === 'P' || previousState.previousState === 'C')) {
                return;
            }

            // Draft tables support
            const draftOrder = await cds.db.run(
                SELECT.one.from(req.target.name)
                    .where({ id: currentOrder.id })
                    .columns('id', 'items')
            );

            if (!draftOrder || !draftOrder.items || draftOrder.items.length === 0) return;

            for (const item of draftOrder.items) {
                if (!item.game_id) continue;

                const product = await cds.db.run(SELECT.one.from(Products).where({ id: item.game_id }));
                if (!product) continue;

                if (product.productType === 'digital') continue;

                const requestedQty = item.quantity || 0;
                const availableStock = product.stock || 0;

                if (availableStock < requestedQty) {
                    return req.error(409, `Insufficient stock for game: "${product.title}". Available: ${availableStock}, requested: ${requestedQty}`);
                }

                await cds.db.run(
                    cds.update(Products)
                        .where({ id: item.game_id })
                        .with({ stock: availableStock - requestedQty })
                );
            }
        });

        /**
        * Custom backend filter for VIP Orders (on READ)
        */

        this.on('READ', 'Orders', async (req: cds.Request, next) => {
            const queryStr = JSON.stringify(req.query.SELECT?.where || {});

            if (queryStr.includes('VIP_FILTER_ACTIVE')) {
                const vipOrders = await cds.db.run(
                    SELECT.from(Orders).where({
                        'customer/statusCode/code': 'A',
                        'customer/averageRating': { '>=': 4.5 }
                    })
                );
                return vipOrders;
            }

            return next();
        });

        /**
        * Custom bound function for bulk eligibility check (on action)
        */

        this.on('checkBulkEligibility', 'Orders', async (req: cds.Request) => {
            const { id: orderId } = req.params as { id?: string };
            const { qty: bulkThreshold } = req.data as { qty?: number };

            if (!orderId || !bulkThreshold) return false;

            const items = await cds.db.run(
                SELECT.from('SalesOrderService.OrderItems').where({ parent_id: orderId }).columns('quantity')
            );
            const totalQty = items.reduce((sum: number, item: { quantity?: number }) => sum + (item.quantity || 0), 0);

            return totalQty >= bulkThreshold;
        });

        return super.init();
    }
}
