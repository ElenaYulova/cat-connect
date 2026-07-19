import cds from '@sap/cds';

export default class SalesOrderService extends cds.ApplicationService {
    async init(): Promise<void> {

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

                const game = await cds.db.run(SELECT.one.from('SalesOrderService.Products').where({ id: item.game_id }));
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
            const previousState = await cds.db.run(SELECT.one.from('SalesOrderService.Orders').where({ id: currentOrder.id }).columns('status_code'));
            if (previousState && (previousState.status_code === 'P' || previousState.status_code === 'C')) {
                return;
            }

            // Draft tables support
            const draftOrder = await cds.db.run(
                SELECT.one.from(req.target as any)
                    .where({ id: currentOrder.id })
                    .columns( (o: any) => { o.items((i: any) => { i('*') }) })
            );

            if (!draftOrder || !draftOrder.items || draftOrder.items.length === 0) return;

            for (const item of draftOrder.items) {
                if (!item.game_id) continue;

                const product = await cds.db.run(SELECT.one.from('SalesOrderService.Products').where({ id: item.game_id }));
                if (!product) continue;

                if (product.productType === 'digital') continue;

                const requestedQty = item.quantity || 0;
                const availableStock = product.stock || 0;

                if (availableStock < requestedQty) {
                    return req.error(409, `Insufficient stock for game: "${product.title}". Available: ${availableStock}, requested: ${requestedQty}`);
                }
                await cds.db.run(
                    cds.update('SalesOrderService.Products')
                        .where({ id: item.game_id })
                        .with({ stock: availableStock - requestedQty })
                );
            }
        });

        return super.init();
    }
}
