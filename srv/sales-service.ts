import cds from '@sap/cds';
import OrderCalculator from './utils/OrderCalculator';

export default class SalesOrderService extends cds.ApplicationService {
    async init(): Promise<void> {
        const { SELECT } = cds.ql;

        const Orders = this.entities.Orders!;

        /**
         * Order Number Auto Generation
         */

        this.before('CREATE', 'Orders', async (req: cds.Request) => {
        const currentYear = new Date().getFullYear();
        
        const OrdersEntity = cds.entities('sap.capire.gameshop.salesorder').Orders as any;

        const lastOrder = await cds.db.run(
            SELECT.one.from(OrdersEntity)
            .where({ orderNumber: { 'like': `${currentYear}-%` } })
            .orderBy('createdAt desc')
            .columns('orderNumber')
        ) as { orderNumber?: string } | null;

        let nextSequence = 1;

        if (lastOrder && lastOrder.orderNumber) {
            const parts = lastOrder.orderNumber.split('-');
            if (parts.length === 2) {
            const currentSequence = parseInt(parts[1], 10);
            if (!isNaN(currentSequence)) {
                nextSequence = currentSequence + 1;
            }
            }
        }

        const formattedSequence = String(nextSequence).padStart(3, '0');

        req.data.orderNumber = `${currentYear}-${formattedSequence}`;
        });

        /**
         * Calculator launcher for active orders
         */
        this.before(['CREATE', 'UPDATE'], Orders, async (req: cds.Request) => {
            await OrderCalculator.calculateAndDeductStock(req, this.entities);
        });

        /**
         * Warehouse control with duplicate write-off protection (before UPDATE)
         * TODO: check for possible bugs
         */
        this.before('UPDATE', Orders, async (req: cds.Request) => {
            const currentOrder = req.data;
            if (!currentOrder || !currentOrder.ID) return;
            if (currentOrder.status_code !== 'P' && currentOrder.status_code !== 'C') return;

            const previousState = await cds.db.run(
                SELECT.one.from(Orders).where({ ID: currentOrder.ID }).columns('status_code')
            );

            if (previousState && (previousState.status_code === 'P' || previousState.status_code === 'C')) {
                return req.reject(400, 'ORDER_ALREADY_PROCESSED', undefined, [currentOrder.ID]);
            }
        });

        /**
         * Document Number Range Generator (before CREATE & SAVE active entities)
         * Triggered strictly once upon final draft activation or direct database insertion
         */
        this.before(['CREATE', 'SAVE'], 'Orders', async (req: cds.Request) => {
        if (req.data.orderNumber && req.data.orderNumber.includes('-')) return;

        const currentYear = new Date().getFullYear();
        const { Orders } = this.entities;
        
        const lastOrder = await cds.db.run(
            SELECT.one.from(Orders)
            .where({ orderNumber: { 'like': `${currentYear}-%` } })
            .orderBy('createdAt desc')
            .columns('orderNumber')
        ) as { orderNumber?: string } | null;

        let nextSequence = 1;

        if (lastOrder && lastOrder.orderNumber) {
            const parts = lastOrder.orderNumber.split('-');
            if (parts.length === 2) {
            const currentSequence = parseInt(parts[1], 10);
            if (!isNaN(currentSequence)) {
                nextSequence = currentSequence + 1;
            }
            }
        }

        const formattedSequence = String(nextSequence).padStart(3, '0');
        req.data.orderNumber = `${currentYear}-${formattedSequence}`;
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
            let sCustomUserId = req.context?.http?.req?.headers?.['x-user-id']
                || req.http?.req?.headers?.['x-user-id'];

            const bIsDev = cds.env.profiles.includes('development') || !cds.env.profiles.includes('production');

            if (bIsDev && (!sCustomUserId || sCustomUserId === 'undefined') && req.user.id === 'user') {
                // TODO: delete for final production version:  only for testing on localhost
                sCustomUserId = '12fa7731-b782-4078-bb3f-588869eb5fe0';
            }

            const bShouldFilter = (req.user.is('Customer') || bIsDev) && sCustomUserId && sCustomUserId !== 'undefined';

            if (bShouldFilter) {
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

                    await this._forwardFeedbackToCrm(
                        oOrder.customer_ID,
                        item.game_ID,
                        0,
                        sPackedComment,
                        new Date().toISOString().split('T')[0]
                    );
                }

                return true;

            } catch (oError: any) {
                return req.error(500, `Failed to execute order cancellation pipeline: ${oError.message}`);
            }
        });

               /**
        * Feedbacks BE handling (With safe system logs bypass)
        */
        this.after('CREATE', 'Feedbacks', async (data: any) => {
            if (data.comments && data.comments.includes('[CANCELED]')) return;

            await this._forwardFeedbackToCrm(
                data.customer_ID,
                data.product_ID,
                data.rating,
                data.comments,
                data.feedbackDate
            );
        });


        return super.init();
    }

    /**
     * Internal helper to forward feedback and log interaction directly to local CrmService
     */
       private async _forwardFeedbackToCrm(customer_ID: string, product_ID: string, rating: number, comments: string, feedbackDate: any): Promise<void> {
        try {
            const oCrmService = await cds.connect.to('CrmService');
            const sCleanDate = Array.isArray(feedbackDate) ? feedbackDate : feedbackDate;

            await oCrmService.run(INSERT.into('Feedbacks').entries({
                customer_ID,
                product_ID,
                rating,
                comments,
                feedbackDate: sCleanDate
            }));
            const sStrictDateTime = new Date().toISOString().replace('Z', '').split('.')[0];

            await oCrmService.run(INSERT.into('Interactions').entries({
                customer_ID,
                date: sStrictDateTime,
                method_code: 'F',
                summary: `System Log: Order Canceled. ${comments.substring(0, 50)}`
            }));

        } catch (oError: any) {
            console.error("CRM Service Mesh Local Integration Failure:", oError.message);
        }
    }

}
