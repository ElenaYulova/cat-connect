const cds = require('@sap/cds');
module.exports = cds.service.impl(async function () {
    const { Customers, Feedbacks, Interactions, Orders, OrderItems } = this.entities;

    /**
    * Average Rating Calculation and "At Risk" Status Auto-Update
    */

    this.after(['CREATE', 'UPDATE'], 'Feedbacks', async (data, req) => {
        const { customer_ID } = data;
        if (!customer_ID) return;

        // Last Order Date Retrieval
        const lastOrder = await SELECT.one.from(Orders)
            .columns('createdAt')
            .where({ customer_ID })
            .orderBy('createdAt desc');

        let referenceDate;

        if (lastOrder && lastOrder.createdAt) {
            referenceDate = new Date(lastOrder.createdAt);
        } else {
            const customerInfo = await SELECT.one.from(Customers)
                .columns('createdAt')
                .where({ ID: customer_ID });

            referenceDate = customerInfo && customerInfo.createdAt ? new Date(customerInfo.createdAt) : new Date();
        }

        const currentDate = new Date();
        const timeDifference = currentDate.getTime() - referenceDate.getTime();
        const daysDifference = timeDifference / (1000 * 3600 * 24);

        if (daysDifference > 180) {
            await UPDATE(Customers, customer_ID).with({
                statusCode_code: 'I'
            });
            return;
        }

        // Average Rating Calculation (if Customer is active)
        const result = await SELECT.one.from(Feedbacks)
            .columns('avg(rating) as avgRating')
            .where({ customer_ID });

        const computedAverage = result.avgRating ? parseFloat(result.avgRating.toFixed(2)) : 0;

        let targetStatus = 'A';
        if (data.rating < 3 || (computedAverage > 0 && computedAverage < 3.00)) {
            targetStatus = 'R';
        }

        await UPDATE(Customers, customer_ID).with({
            averageRating: computedAverage,
            statusCode_code: targetStatus
        });
    });

    /**
    * Interaction Logging for Feedback Submissions
    */
    // TODO: Implement separate Interaction log for feedback updates
    this.after('CREATE', 'Feedbacks', async (data) => {
        const { customer_ID, rating } = data;
        if (!customer_ID) return;

        await INSERT.into(Interactions).entries({
            customer_ID: customer_ID,
            date: new Date().toISOString(),
            method_code: 'feedback',
            summary: `Customer submitted a feedback with rating: ${rating}`
        });
    });

    /**
     * Customer Category calculation
     */
    // TODO: Replace hardcode categories with variables
    this.after('READ', 'Customers', async (each) => {
        if (!each) return;

        const customers = Array.isArray(each) ? each : [each]; // CAP fix: framework can return object or array

        for (const customer of customers) {
            const boughtCategories = await cds.run(
                SELECT.from(OrderItems)
                    .columns('game.genre.userType_code as typeGroup')
                    .where({ 'parent.customer_ID': customer.ID })
            );

            if (!boughtCategories || boughtCategories.length === 0) {
                let favoriteCode = 'NEW_PLAYER'; // Default for new Customer
                continue;
            }

            if (boughtCategories && boughtCategories.length > 0) {
                const stats = boughtCategories.reduce((acc, item) => {
                    if (item.typeCode) {
                        acc[item.typeCode] = (acc[item.typeCode] || 0) + 1;
                    }
                    return acc;
                }, {});

                let maxCount = 0;
                for (const [code, count] of Object.entries(stats)) {
                    if (count > maxCount) {
                        maxCount = count;
                        favoriteCode = code;
                    }
                }
            }

            const categoryObj = await cds.run(
                SELECT.one.from(UserCategories).columns('name').where({ code: favoriteCode })
            );

             customer.categoryGroup = categoryObj ? categoryObj.name : favoriteCode;
        }
    });
})