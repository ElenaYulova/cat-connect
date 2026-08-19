const cds = require('@sap/cds');

module.exports = cds.service.impl(async function () {
    const { Customers, Feedbacks, Interactions, OrderItems, UserCategories, CustomerNotes } = this.entities;

    /**
    * Integrated empty inputs validator
    */
    this.before(['CREATE', 'UPDATE'], [Customers, Customers.drafts], async (req) => {
        const customerId = req.data.ID;
        const { firstName, lastName, customerNotes } = req.data;

        if (firstName !== undefined && (!firstName || !firstName.trim())) {
            return req.error(400, 'Customer first name cannot be empty.', 'firstName');
        }
        if (lastName !== undefined && (!lastName || !lastName.trim())) {
            return req.error(400, 'Customer last name cannot be empty.', 'lastName');
        }

        if (customerNotes && customerNotes.length > 0) {
            for (const note of customerNotes) {
                if (!note.content || note.content.trim().length < 5) {
                    return req.error(400, 'A corporate internal note must contain at least 5 characters.', 'customerNotes');
                }
            }
        }

        const draftNotes = await cds.run(SELECT.from(CustomerNotes.drafts).where({ customer_ID: customerId }));
        if (draftNotes && draftNotes.length > 0) {
            for (const note of draftNotes) {
                if (!note.content || note.content.trim().length < 5) {
                    return req.error(400, 'A corporate internal note must contain at least 5 characters.', 'customerNotes');
                }
            }
        }
    });

    /**
    * Check for mock roles on localhost
    */
    this.before(['READ', 'CREATE', 'UPDATE', 'DELETE', 'draftEdit', 'draftActivate', 'draftPrepare'], 'Customers', async (req) => {
        const user = req.user;
        const isAdmin = user.has('CRMAdmin');
        const isManager = user.has('SalesManager');
        const isAgent = user.has('SupportAgent');

        if (isAdmin) return;

        if (user.is('SupportAgent') && req.event !== 'READ') {
            return req.error(403, 'Access Denied: Support Agents are restricted to Read-Only mode.');
        }
        if (isManager && req.event === 'DELETE') {
            return req.error(403, 'Forbidden: Sales Managers cannot delete customers.');
        }

        if (!(isAdmin || isManager || isAgent)) {
            return req.error(403, 'Forbidden: Invalid or missing CRM role.');
        }
    });

    /**
    *  Custom Action: Clear Notes
    */
    this.on('clearNotes', 'Customers', async (req) => {
        const customerId = req.params[0]?.ID || req.data?.ID;
        if (!customerId || typeof customerId !== 'string') {
            return req.error(400, 'Cannot identify target Customer UUID.');
        }

        await cds.run(DELETE.from(CustomerNotes).where({ customer_ID: customerId }));
        await cds.run(DELETE.from(CustomerNotes.drafts).where({ customer_ID: customerId }));

        return req.reply(await this.read(Customers, customerId));
    });

    /**
    * Average Rating Calculation and "At Risk" Status Auto-Update
    */
     this.after(['CREATE', 'UPDATE'], 'Feedbacks', async (data, req) => {
        const customer_ID = data?.customer_ID || req.data?.customer_ID;
        if (!customer_ID) return;

        const lastOrder = await SELECT.one.from('sap.capire.gameshop.salesorder.Orders')
            .columns('createdAt')
            .where({ customer_ID, status_code: { '!=': 'C' } })
            .orderBy('createdAt desc');

        if (lastOrder && lastOrder.createdAt) {
            const refDate = new Date(lastOrder.createdAt);
            if (!isNaN(refDate.getTime()) && (new Date() - refDate) / (1000 * 3600 * 24) > 180) {
                await UPDATE(Customers, customer_ID).with({ statusCode_code: 'I' });
                return;
            }
        }

        const result = await SELECT.one.from(Feedbacks)
            .columns('avg(rating) as avgRating')
            .where({
                customer_ID,
                rating: { '>': 0 }
            });

        if (!result || result.avgRating === null) return;

        const avg = parseFloat(result.avgRating.toFixed(2));
        const currentRating = (data && data.rating !== undefined) ? data.rating : (req.data?.rating ?? 0);

        let status = 'A';
        if (currentRating === 0) {
            status = (avg > 0 && avg < 3) ? 'R' : 'A';
        } else {
            status = (currentRating < 3 || (avg > 0 && avg < 3)) ? 'R' : 'A';
        }

        await UPDATE(Customers, customer_ID).with({ averageRating: avg, statusCode_code: status });
    });

    /**
    * Interaction Logging for Standard Feedback Submissions
    */
    this.after('CREATE', 'Feedbacks', async (data, req) => {
        const customer_ID = data.customer_ID || req.data?.customer_ID;
        if (!customer_ID) return;

        if (data.comments && data.comments.includes('[CANCELED]')) return;

        const rating = data.rating ?? req.data?.rating;
        await INSERT.into(Interactions).entries({
            customer_ID: customer_ID,
            date: new Date().toISOString(),
            method_code: 'F',
            summary: `Review logged. Rating: ${rating}`
        });
    });

    /**
    * Cleaned Customer Category calculation (STRICTLY ONE HOOK)
    */
    this.after('READ', 'Customers', async (each) => {
        if (!each) return;
        const customers = Array.isArray(each) ? each : [each];

        for (const customer of customers) {
            let favoriteCode = 'NEW_PLAYER';

            const boughtCategories = await cds.run(
                SELECT.from(OrderItems)
                    .columns('game.genre.userType_code')
                    .where({ 'parent.customer_ID': customer.ID })
            );

            if (boughtCategories && boughtCategories.length > 0) {
                const stats = boughtCategories.reduce((acc, item) => {
                    const code = item.userType_code || item.game_genre_userType_code || Object.values(item)[0];
                    if (code) acc[code] = (acc[code] || 0) + 1;
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

    /**
    * Live Interactions Hook
    */
        this.after('READ', 'Interactions', async (each, req) => {
        if (!each) return;

        let sCustomerId = undefined;
        const sUrl = req._?.req?.url || "";
        const oMatch = sUrl.match(/Customers\(ID=([^,)]+)/);
        
        if (oMatch && oMatch[1]) {
            sCustomerId = oMatch[1].replace(/['"]/g, "");
        }

        if (!sCustomerId && req.params) {
            sCustomerId = req.params.ID || (typeof req.params === 'string' ? req.params : undefined);
        }

        if (!sCustomerId) return;

        try {
            const oSalesService = await cds.connect.to('SalesOrderService');
            const aInteractions = Array.isArray(each) ? each : [each];

            for (const interaction of aInteractions) {
                if (interaction.method_code === 'F' && !interaction.method) {
                    interaction.method = { code: 'F', name: 'Feedback', criticality: 1 };
                }
            }

            const aOrders = await oSalesService.run(
                SELECT.from('Orders')
                    .where({ customer_ID: sCustomerId, status_code: { '!=': 'C' } })
                    .columns('orderNumber', 'createdAt', 'totalAmount', 'currency_code')
            );

            if (aOrders && aOrders.length > 0) {
                for (const order of aOrders) {
                    aInteractions.push({
                        ID: cds.utils.uuid(),
                        customer_ID: sCustomerId,
                        date: order.createdAt ? order.createdAt.replace('Z', '').split('.')[0] : new Date().toISOString().replace('Z', '').split('.')[0],
                        method_code: 'O',
                        method: { code: 'O', name: 'Order', criticality: 3 },
                        summary: `Order No.${order.orderNumber} placed for ${order.totalAmount} ${order.currency_code}`
                    });
                }
            }

            if (each && each.$count !== undefined) {
                each.$count = aInteractions.length;
            }

        } catch (oError) {
            console.error("CRM Mesh Failure:", oError.message);
        }
    });

    /**
    * Feedbacks range guard bypass
    */
        this.before('CREATE', 'Feedbacks', async (req) => {
        const { rating, comments } = req.data;
        if (rating < 1 || rating > 5) {
            if (comments && comments.includes('[CANCELED]')) return;
            if (!comments || comments.trim().length < 5) {
                return req.error(400, 'Feedback comment must be at least 5 characters long.');
            }
        }
    });

    /**
     * Internal helper to fetch and map sales data directly from SalesOrderService
     */

    async function _fetchVirtualOrders(sCustomerId) {
        try {
            const oSalesService = await cds.connect.to('SalesOrderService');

            const aOrders = await oSalesService.run(
                SELECT.from('Orders')
                    .where({ customer_ID: sCustomerId, status_code: { '!=': 'C' } })
                    .columns('orderNumber', 'createdAt', 'totalAmount', 'currency_code')
            );

            if (!aOrders || aOrders.length === 0) return [];

            return aOrders.map(order => ({
                ID: cds.utils.uuid(),
                customer_ID: sCustomerId,
                date: order.createdAt ? new Date(order.createdAt).toISOString() : new Date().toISOString(),
                method_code: 'O',
                method: { code: 'O', name: 'Order', criticality: 3 },
                summary: `Order No.${order.orderNumber} placed for ${order.totalAmount} ${order.currency_code}`
            }));
        } catch (oError) {
            console.error("CRM Mesh: Failed to read virtual order history:", oError.message);
            return [];
        }
    }
});
