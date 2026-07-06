const cds = require('@sap/cds');
module.exports = cds.service.impl(async function () {
    const { Customers, Feedbacks, Interactions, Orders, OrderItems, UserCategories, CustomerNotes } = this.entities;
    /**
    * Validation of Customer Notes Length
    */

    this.before('SAVE', 'Customers', async (req) => {
        const customerId = req.data.ID;

        const { CustomerNotes } = this.entities;

        const draftNotes = await cds.run(
            SELECT.from(CustomerNotes.drafts)
                .where({ customer_ID: customerId })
        );

        if (draftNotes && draftNotes.length > 0) {
            for (const note of draftNotes) {
                if (!note.content || note.content.trim().length < 5) {
                    return req.error(400, 'A corporate internal note cannot be empty and must contain at least 5 characters.', 'customerNotes');[1.4]
                }
            }
        }
    });

    /**
    * Check for mock roles on localhost
    */

    this.before(['READ', 'CREATE', 'UPDATE', 'DELETE', 'draftEdit', 'draftActivate', 'draftPrepare'], 'Customers', async (req) => {
        const user = req.user;

        const isAdmin   = user.has('CRMAdmin');
        const isManager = user.has('SalesManager');
        const isAgent   = user.has('SupportAgent');

        if (isAdmin) return;

        if (user.is('SupportAgent') && req.event !== 'READ') {
            return req.error(403, 'Access Denied: Support Agents are restricted to Read-Only mode. Changes cannot be saved.');
        }

        if (isManager && req.event === 'DELETE') {
            return req.error(403, 'Forbidden: Sales Managers cannot delete customers.');
        }

        const hasValidRole = isAdmin || isManager || isAgent;
        if (!hasValidRole) {
            return req.error(403, 'Forbidden: Invalid or missing CRM role.');
        }
    });

    /**
    * Custom Action: Clear Notes
    */

    this.on('clearNotes', 'Customers', async (req) => {
        const customerId = req.params[0]?.ID || req.data?.ID;

        if (!customerId || typeof customerId !== 'string') {
            return req.error(400, 'Cannot identify target Customer UUID for clearing notes.');
        }

        const { CustomerNotes } = this.entities;


        await cds.run(DELETE.from(CustomerNotes).where({ customer_ID: customerId }));
        await cds.run(DELETE.from(CustomerNotes.drafts).where({ customer_ID: customerId }));


        const currentCustomer = await cds.run(
            SELECT.one.from(req.target).where({ ID: customerId })
        );

        return req.reply(currentCustomer);
    });

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
            let favoriteCode = 'NEW_PLAYER'; // Default category

            const boughtCategories = await cds.run(
                SELECT.from(OrderItems)
                    .columns('game.genre.userType_code')
                    .where({ 'parent.customer_ID': customer.ID })
            );

            if (boughtCategories && boughtCategories.length > 0) {
                const stats = boughtCategories.reduce((acc, item) => {
                    const code = item.userType_code || item.game_genre_userType_code || Object.values(item)[0];
                    if (code) {
                        acc[code] = (acc[code] || 0) + 1;
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