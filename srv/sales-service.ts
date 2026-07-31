import cds from '@sap/cds';

export default class SalesOrderService extends cds.ApplicationService {
    async init(): Promise<void> {

        const { SELECT } = cds.ql;

        const Orders: cds.entity = this.entities.Orders;
        const Products: cds.entity = this.entities.Products;

        /**
        * Cross-context discount (before CREATE)
        */
        this.before('CREATE', 'Orders', async (req: cds.Request) => {
            const order = req.data;
            if (!order || !order.items || order.items.length === 0) return;

            // BE validation
            for (const item of order.items) {
                if (!item.game_id) continue;

                const game = await cds.db.run(SELECT.one.from(Products).where({ id: item.game_id }));
                if (!game) {
                    return req.error(404, `Product with ID ${item.game_id} not found.`);
                }

                const requestedQty = item.quantity || 0;
                const availableStock = game.stock || 0;

                if (availableStock < requestedQty) {
                    return req.error(409, `Insufficient stock for game: "${game.title}". Available: ${availableStock}, requested: ${requestedQty}`);
                }
            }

            const calculation = await this._calculateOrderAmounts(order.customer_id, order.items);

            order.totalAmount = calculation.totalAmount;
            order.discountValue = calculation.discountValue;
            order.netAmount = calculation.netAmount;
        });

        /**
        * Warehouse control with duplicate write-off protection (before UPDATE)
        */
        this.before('UPDATE', 'Orders', async (req: cds.Request) => {
            const currentOrder = req.data;
            if (!currentOrder || (currentOrder.status_code !== 'P' && currentOrder.status_code !== 'C')) return;

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
                if (!product || product.productType === 'digital') continue;

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

    private async _calculateOrderAmounts(
        customer_id: string | undefined | null,
        items: Array<{ game_id: string, quantity: number }> | undefined | null
    ) {
        const { SELECT } = cds.ql;
        const Products = this.entities.Products;

        const result = { totalAmount: 0, discountValue: 0, netAmount: 0 };
        if (!items || items.length === 0) return result;

        let totalGross = 0;
        for (const item of items) {
            if (!item.game_id) continue;

            const game = await cds.db.run(SELECT.one.from(Products).where({ id: item.game_id }));
            if (game) {
                totalGross += (game.price * (item.quantity || 1));
            }
        }

        result.totalAmount = +totalGross.toFixed(2);

        let fAutoDiscountPercent = 0;
        if (customer_id) {
            const gamerProfile = await cds.db.run(
                SELECT.one.from('SalesOrderService.CustomerInsights')
                    .where({ ID: customer_id })
                    .columns('averageRating')
            );

            if (gamerProfile && gamerProfile.averageRating !== undefined && gamerProfile.averageRating !== null) {
                const fRatingValue = Number(gamerProfile.averageRating);
                if (!isNaN(fRatingValue)) {
                    fAutoDiscountPercent = fRatingValue / 100;
                }
            }
        }

        let fCalculatedAmount = totalGross;
        if (fAutoDiscountPercent > 0) {
            fCalculatedAmount = fCalculatedAmount * (1 - fAutoDiscountPercent);
        }

        result.netAmount = +fCalculatedAmount.toFixed(2);
        result.discountValue = +(result.totalAmount - result.netAmount).toFixed(2);

        return result;
    }
}
