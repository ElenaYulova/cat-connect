import cds from '@sap/cds';

export default class OrderCalculator {
    public static async calculateAndDeductStock(req: cds.Request, entities: any): Promise<void> {
        const { SELECT } = cds.ql;
        const order = req.data;
        if (!order || !order.items || (order.items?.length ?? 0) === 0) return;

        const customerId = order.customer_ID;
        const Products = entities.Products;

        let totalGross = 0;
        const tx = cds.db;

        for (const item of order.items) {
            if (!item.game_ID) continue;

            const game = await tx.run(SELECT.one.from(Products).where({ ID: item.game_ID }));
            if (!game) {
                return req.reject(404, `Product with ID ${item.game_ID} not found.`);
            }

            const requestedQty = item.quantity || 1;
            if (game.stock < requestedQty) {
                return req.reject(409, `Insufficient stock for game: "${game.title}". Available: ${game.stock}`);
            }

            totalGross += (game.price * requestedQty);

            await tx.run(
                UPDATE(Products)
                    .set({ stock: game.stock - requestedQty })
                    .where({ ID: item.game_ID })
            );
        }

        let fAutoDiscountPercent = 0;
        if (customerId) {
            const gamerProfile = await cds.db.run(
                SELECT.one.from('SalesOrderService.CustomerInsights').where({ ID: customerId }).columns('averageRating')
            );
            if (gamerProfile && gamerProfile.averageRating) {
                fAutoDiscountPercent = Number(gamerProfile.averageRating) / 100;
            }
        }

        const fNetAmount = +(totalGross * (1 - fAutoDiscountPercent)).toFixed(2);

        order.totalAmount = fNetAmount;
    }
}
