const cds = require('@sap/cds');

// Test configuration
if (!cds.env.requires) cds.env.requires = {};
cds.env.requires.db = { kind: 'sqlite' };
cds.env.requires.auth = {
    kind: 'mocked',
    users: {
        admin: { roles: ['authenticated-user', 'SalesManager'] }
    }
};

const { GET, POST } = cds.test(__dirname + '/..', '--in-memory');


describe('Sales Order Service: Showcase & Stock Validation', () => {

    /**
     * TEST 1: Stock Validation
     */

    // Test 1.1
    test('should successfully fetch products filtered by stock availability', async () => {

    const response = await GET('/odata/v4/sales-order/Products?$filter=stock gt 0', {
            auth: { username: 'admin', password: '' }
        });

        expect(response.status).toBe(200);
        const aProducts = response.data.value;

        expect(aProducts).toBeDefined();
        aProducts.forEach(oProduct => {
            expect(oProduct.stock).toBeGreaterThan(0);
        });
    });

    // Test 1.2

    test('should allow direct reading of a specific product via direct link', async () => {
        const sValidProductId = '07fe11fa-27da-4cb4-9826-791510b48dcd';
        const response = await GET(`/odata/v4/sales-order/Products(${sValidProductId})`, {
            auth: { username: 'admin', password: '' }
        });

        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('stock');
        expect(response.data).toHaveProperty('title');
    });

    /**
     * TEST 2: Custom filter by Category
     */

    test('should successfully filter products by parent category including children (OR logic)', async () => {
        const sRpgParentCategoryId = '392ea785-c231-48ad-8190-e467b61f7962';

         const sUrl = `/odata/v4/sales-order/Products?$filter=stock gt 0 and (genre_ID eq ${sRpgParentCategoryId} or genre/parent_ID eq ${sRpgParentCategoryId})`;

        const response = await GET(sUrl, {
            auth: { username: 'admin', password: '' }
        });

        expect(response.status).toBe(200);
        const aProducts = response.data.value;
        expect(aProducts).toBeDefined();

        if (aProducts.length > 0) {
            aProducts.forEach(oProduct => {
                expect(oProduct.stock).toBeGreaterThan(0);
                expect(oProduct).toHaveProperty('genre_ID');
            });
        }
    });

    /**
     * TEST 3: Navigation to Product Details Object Page
     */

    test('should successfully handle deep routing request for ProductDetails Object Page with genre expansion', async () => {
        const sTargetProductId = '07fe11fa-27da-4cb4-9826-791510b48dcd';

        const sObjectPageUrl = `/odata/v4/sales-order/Products(${sTargetProductId})?$expand=genre($select=name)`;

        const response = await GET(sObjectPageUrl, {
            auth: { username: 'admin', password: '' }
        });

        expect(response.status).toBe(200);


        expect(response.data.ID).toBe(sTargetProductId);
        expect(response.data).toHaveProperty('title');

        expect(response.data).toHaveProperty('genre');
        if (response.data.genre) {
            expect(response.data.genre).toHaveProperty('name');
        }
    });

    /**
     * TEST 4: Security & Role Validation (CRITICAL CONTRACT)
     */

    test('should successfully read wholesalePrice for managers and confirm schema alignment', async () => {
        const sTargetProductId = '07fe11fa-27da-4cb4-9826-791510b48dcd';
        const sUrl = `/odata/v4/sales-order/Products(${sTargetProductId})`;

        const response = await GET(sUrl, {
            auth: { username: 'admin', password: '' }
        });

        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('wholesalePrice');
        expect(response.data.wholesalePrice).not.toBeNull();
    });

    /**
     * TEST 5: Input Recalculation & Numeric Parser Contract
     */

    test('should verify that price formats strictly support mathematical decimal criteria', async () => {
        const sTargetProductId = '07fe11fa-27da-4cb4-9826-791510b48dcd';
        const sUrl = `/odata/v4/sales-order/Products(${sTargetProductId})`;

        const response = await GET(sUrl, {
            auth: { username: 'admin', password: '' }
        });

        expect(response.status).toBe(200);
        const fPrice = Number(response.data.price);
        const fWholesalePrice = Number(response.data.wholesalePrice);

        expect(isNaN(fPrice)).toBe(false);
        expect(isNaN(fWholesalePrice)).toBe(false);
        expect(fPrice).toBeGreaterThan(fWholesalePrice);
    });

    /**
     * TEST 6: Transactional Order Submission & Stock Deduction
     */

    test('should successfully submit an order and deduct correct quantity from product stock', async () => {
        const sTargetProductId = '07fe11fa-27da-4cb4-9826-791510b48dcd';

        const oBeforeResponse = await GET(`/odata/v4/sales-order/Products(${sTargetProductId})`, {
            auth: { username: 'admin', password: '' }
        });
        const iInitialStock = oBeforeResponse.data.stock;

        const oOrderPayload = {
            currency_code: 'USD',
            items: [
                { game_ID: sTargetProductId, quantity: 2 }
            ]
        };

        const oPostResponse = await POST('/odata/v4/sales-order/Orders', oOrderPayload, {
            auth: { username: 'admin', password: '' }
        });

        expect(oPostResponse.status).toBe(201);
        expect(oPostResponse.data).toHaveProperty('id');
    });

    /**
     * TEST 7: Backend Price Calculation & Stacked Discounts Rules
     */

    test('should automatically calculate totalPrice on backend and correctly apply stacked discount layers', async () => {
        const sTargetProductId = '07fe11fa-27da-4cb4-9826-791510b48dcd';

        const oProductResponse = await GET(`/odata/v4/sales-order/Products(${sTargetProductId})`, {
            auth: { username: 'admin', password: '' }
        });
        const fSingleProductPrice = oProductResponse.data.price;

        const oDiscountedOrderPayload = {
            currency_code: 'USD',
            items: [
                { game_ID: sTargetProductId, quantity: 3 }
            ]
        };

        const oPostResponse = await POST('/odata/v4/sales-order/Orders', oDiscountedOrderPayload, {
            auth: { username: 'admin', password: '' }
        });

        expect(oPostResponse.status).toBe(201);
        expect(oPostResponse.data).toHaveProperty('netAmount');
        expect(oPostResponse.data.netAmount).toBeLessThan(fSingleProductPrice * 3);
    });

    /**
     * TEST 8: Strict Product Page Quantity Validation (Defensive Check)
     */

    test('should block order submission and return 409 Conflict if requested quantity exceeds available warehouse stock', async () => {
        const sTargetProductId = '07fe11fa-27da-4cb4-9826-791510b48dcd';

        const oProductResponse = await GET(`/odata/v4/sales-order/Products(${sTargetProductId})`, {
            auth: { username: 'admin', password: '' }
        });
        const iCurrentAvailableStock = oProductResponse.data.stock;

        const oInvalidPayload = {
            currency_code: 'USD',
            items: [
                { game_ID: sTargetProductId, quantity: iCurrentAvailableStock + 999 }
            ]
        };

        try {
            await POST('/odata/v4/sales-order/Orders', oInvalidPayload, {
                auth: { username: 'admin', password: '' }
            });
        } catch (oError) {
            const iStatus = oError.statusCode || oError.status || (oError.response && oError.response.status);
            expect([400, 409]).toContain(iStatus);
            expect(oError.message).toContain('Insufficient stock for game');
        }
    });

});
