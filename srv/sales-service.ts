import cds from '@sap/cds';
import OrderCalculator from './utils/OrderCalculator';

export default class SalesOrderService extends cds.ApplicationService {
    async init(): Promise<void> {
        const { SELECT } = cds.ql;

        const Orders = this.entities.Orders!;

        /**
         * Calculator launcher for active orders
         */
        this.before(['CREATE', 'UPDATE'], Orders, async (req: cds.Request) => {
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
        * Bulk Discount Availability
        */

        this.on('getCartEligibilities', async (req: cds.Request) => {
            const { customer_ID } = req.data as { customer_ID?: string };

            const oDefaultResponse = { isBulkAvailable: false, averageRating: 0.00 };
            if (!customer_ID || customer_ID === "undefined" || customer_ID.length !== 36) {
                return oDefaultResponse;
            }

            try {
                const oEnvSettings = (cds.env as any).settings || {};
                const fBulkPercent = oEnvSettings.bulkDiscountPercent || 0.10;
                const iBulkMinQty = oEnvSettings.bulkMinQuantity || 10;
                const fMinRating = oEnvSettings.minRatingForBulk || 4.0;
                const aIgnoredStatuses = oEnvSettings.ignoredStatusesForOrderHistory || ["X", "canceled"];

                // TODO: Create entity in db for CRM configuration matrix
                const oCustomerCRM = await cds.db.run(
                    SELECT.one.from('sap.capire.gameshop.crm.Customers')
                        .where({ ID: customer_ID })
                        .columns('averageRating')
                ) as { averageRating?: number } | null;

                const fFreshRating = oCustomerCRM && oCustomerCRM.averageRating ? parseFloat(oCustomerCRM.averageRating as any) : 0.00;

                const aPastOrders = await cds.db.run(
                    SELECT.from(Orders)
                        .where({ customer_ID: customer_ID, status_code: { 'not in': aIgnoredStatuses } })
                        .columns('ID')
                ) as any[];

                const iPastOrdersCount = aPastOrders ? aPastOrders.length : 0;


                const bBulkEligible = fFreshRating >= fMinRating && iPastOrdersCount > 0;

                return {
                    isBulkAvailable: bBulkEligible,
                    averageRating: +fFreshRating.toFixed(2),
                    bulkDiscountPercent: fBulkPercent,
                    bulkMinQuantity: iBulkMinQty
                };

            } catch (oError: any) {
                req.error(500, `Failed to resolve cart eligibilities: ${oError.message}`);
                return oDefaultResponse;
            }
        });

        // Customers' order list

        this.on('READ', 'Orders', async (req: any, next) => {
            const sCustomUserId = req.context?.http?.req?.headers?.['x-user-id']
                || req.http?.req?.headers?.['x-user-id'];

            if (req.user.is('Customer') && sCustomUserId) {
                req.query.where({ customer_ID: sCustomUserId });
            }

            return next();
        });

        /**
        * Cancelling handling
        */

        this.on('cancelOrder', Orders, async (req: cds.Request) => {
            const { reasonCode, platformCode, comment } = req.data as { reasonCode: string, platformCode: string, comment: string };
            const aParams = req.params as Array<{ ID: string }>;
            const oParamObj = aParams[0];

            const sCleanOrderId = typeof oParamObj === "object" ? oParamObj.ID : oParamObj;

            const { OrderItems, Products, Feedbacks } = this.entities;

            try {

                const oOrder = await cds.db.run(
                    SELECT.one.from(Orders).where({ ID: sCleanOrderId }).columns('ID', 'status_code', 'customer_ID')
                ) as { ID: string, status_code: string, customer_ID: string } | null;

                if (!oOrder) return req.error(404, `Order with ID ${sCleanOrderId} not found.`);
                if (oOrder.status_code === 'X') return req.error(400, "This order is already canceled.");

                const aOrderItems = await cds.db.run(
                    SELECT.from(OrderItems).where({ parent_ID: sCleanOrderId }).columns('game_ID', 'quantity')
                ) as { game_ID: string, quantity: number }[];

                await cds.run(
                    UPDATE(Orders).set({ status_code: 'X' }).where({ ID: sCleanOrderId })
                );

                for (const item of aOrderItems) {
                    await cds.run(
                        UPDATE(Products)
                            .set({ stock: { '+=': item.quantity } })
                            .where({ ID: item.game_ID })
                    );

                    const sPackedComment = `[CANCELED][${platformCode}][${reasonCode}] ${comment || 'No comment provided'}`;

                    await cds.run(
                        INSERT.into(Feedbacks).entries({
                            ID: cds.utils.uuid(),
                            rating: 0,
                            comments: sPackedComment,
                            feedbackDate: new Date().toISOString().split('T')[0],
                            customer_ID: oOrder.customer_ID,
                            product_ID: item.game_ID
                        })
                    );
                }

                return true;

            } catch (oError: any) {
                return req.error(500, `Failed to execute order cancellation pipeline: ${oError.message}`);
            }
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
                console.error("CRM Service Mesh Failure: Cannot forward review to remote container ->", oError.message);
            }
        });

        return super.init();
    }
}
