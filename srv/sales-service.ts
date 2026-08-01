import cds from '@sap/cds';
import OrderCalculator from './utils/OrderCalculator';

export default class SalesOrderService extends cds.ApplicationService {
    async init(): Promise<void> {
        const { SELECT } = cds.ql;

        const Orders = this.entities.Orders!;
        const Products = this.entities.Products!;

        /**
        * Calculator launcher
        */

        this.before('CREATE', Orders, async (req: cds.Request) => {
            await OrderCalculator.calculateAndDeductStock(req, this.entities);
        });

        /**
        * Warehouse control with duplicate write-off protection (before UPDATE)
        */
        this.before('UPDATE', Orders, async (req: cds.Request) => {
            const currentOrder = req.data;
            if (!currentOrder || (currentOrder.status_code !== 'P' && currentOrder.status_code !== 'C')) return;

            const previousState = await cds.db.run(
                SELECT.one.from(Orders).where({ id: currentOrder.id }).columns('status_code')
            );

            if (previousState && (previousState.status_code === 'P' || previousState.status_code === 'C')) {
                return;
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
                SELECT.from('SalesOrderService.OrderItems').where({ parent_ID: orderId }).columns('quantity')
            );
            const totalQty = items.reduce((sum: number, item: { quantity?: number }) => sum + (item.quantity || 0), 0);

            return totalQty >= bulkThreshold;
        });

        /**
        * Feedbacks BE handling
        */
this.after('CREATE', 'Feedbacks', async (data: any, req: cds.Request) => {
            try {
                const oRemoteCrmService = await cds.connect.to('CRMService');

                await oRemoteCrmService.run(
                    INSERT.into('sap.capire.gameshop.crm.Feedbacks').entries({
                        customer_ID: data.customer_ID,
                        product_ID: data.product_ID,
                        rating: data.rating,
                        comments: data.comments,
                        feedbackDate: data.feedbackDate
                    })
                );
            } catch (oError: any) {
                console.error("🔒 CRM Service Mesh Failure: Cannot forward review to remote container ->", oError.message);
            }
        });

        return super.init();
    }

    private async _calculateOrderAmounts(
        customer_ID: string | undefined | null,
        items: Array<{ game_ID: string, quantity: number }> | undefined | null
    ) {
        const { SELECT } = cds.ql;
        const Products = this.entities.Products;

        const result = { totalAmount: 0, discountValue: 0, netAmount: 0 };
        if (!items || items.length === 0) return result;

        let totalGross = 0;
        for (const item of items) {

            if (!item.game_ID) continue;

            const game = await cds.db.run(SELECT.one.from(Products).where({ ID: item.game_ID }));
            if (game) {
                totalGross += (game.price * (item.quantity || 1));
            }
        }

        result.totalAmount = +totalGross.toFixed(2);

        let fAutoDiscountPercent = 0;
        if (customer_ID) {
            const gamerProfile = await cds.db.run(
                SELECT.one.from('SalesOrderService.CustomerInsights')
                    .where({ ID: customer_ID })
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
