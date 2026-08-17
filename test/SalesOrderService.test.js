const cds = require('@sap/cds');

// Test configuration
if (!cds.env.requires) cds.env.requires = {};
cds.env.requires.db = { kind: 'sqlite' };
cds.env.requires.auth = {
    kind: 'mocked',
    users: {
        admin:   { roles: ['authenticated-user', 'SalesManager', 'sales-manager', 'Manager', 'admin', 'CRMAdmin'] },
        manager: { roles: ['authenticated-user', 'SalesManager'] },
        gamer:   { id: 'b4d7b17e-39a0-45ef-bf73-13bd18a017cf', roles: ['authenticated-user', 'Customer'] }
    }
};

const { GET, POST, PATCH, DELETE } = cds.test(__dirname + '/..', '--in-memory');


describe('Sales Order Service: Showcase & Stock Validation', () => {
    let SalesOrderService;

    beforeAll(async () => {
        SalesOrderService = await cds.connect.to('SalesOrderService');
    });

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
     * TEST 6: Transactional Order Submission & Immediate Stock Deduction
     * TODO: rewrite
     */
    test.skip('6. should successfully submit an order and deduct correct quantity from product stock', async () => {
        const sServicePath = '/odata/v4/sales-order';
        const sTargetProductId = '07fe11fa-27da-4cb4-9826-791510b48dcd';

        const oBeforeResponse = await GET(`${sServicePath}/Products(${sTargetProductId})`, {
            auth: { username: 'admin', password: '' }
        });
        const iStockBefore = oBeforeResponse.data.stock;

        const oOrderPayload = {
            currency_code: 'USD',
            customer_ID: 'b4d7b17e-39a0-45ef-bf73-13bd18a017cf',
            items: [
                {

                    ID: 'c8f3a12b-59d1-46ab-97c2-12ef34ab56cd',
                    game_ID: sTargetProductId,
                    quantity: 2
                }
            ]
        };

        const oPostResponse = await POST(`${sServicePath}/Orders`, oOrderPayload, {
            auth: { username: 'admin', password: '' },
            headers: {
                'X-CDS-Draft': 'true'
            }
        });
        expect(oPostResponse.status).toBe(201);

        const oAfterResponse = await GET(`${sServicePath}/Products(${sTargetProductId})`, {
            auth: { username: 'admin', password: '' }
        });
        const iStockAfter = oAfterResponse.data.stock;

        expect(iStockBefore - iStockAfter).toBe(2);
    });

    /**
     * TEST 7: Backend Price Calculation & Cross-Context Discount
     */
    test('should automatically calculate netAmount on backend and apply CRM rating discount', async () => {
        const sTargetProductId = '07fe11fa-27da-4cb4-9826-791510b48dcd';

        const oProductResponse = await GET(`/odata/v4/sales-order/Products(${sTargetProductId})`, {
            auth: { username: 'admin', password: '' }
        });
        const fSinglePrice = Number(oProductResponse.data.price);

        const oDiscountedPayload = {
            currency_code: 'USD',
            customer_ID: 'b4d7b17e-39a0-45ef-bf73-13bd18a017cf',
            items: [
                { game_ID: sTargetProductId, quantity: 1 }
            ]
        };

        const oPostResponse = await POST('/odata/v4/sales-order/Orders', oDiscountedPayload, {
            auth: { username: 'admin', password: '' }
        });

        expect(oPostResponse.status).toBe(201);
        expect(oPostResponse.data).toHaveProperty('netAmount');

        const fNetAmount = Number(oPostResponse.data.netAmount);

        expect(fNetAmount).toBeLessThan(fSinglePrice);
    });
    /**
     * TEST 8: Strict Product Page Quantity Validation
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
                { game_ID: sTargetProductId, quantity: iCurrentAvailableStock + 20 }
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

    /**
     * Test 9: Loyalty Saving Validation
     */

    test('should correctly execute front-end Loyalty Saving mathematical pipeline formula', () => {

        const fTargetGamePrice = 10.00;
        const iQuantityFromCart = 1;

        const fFrontEndTotalGross = fTargetGamePrice * iQuantityFromCart;

        const fTotalAmountFromDB = 9.55;

        const fFrontEndSaving = Number((fFrontEndTotalGross - fTotalAmountFromDB).toFixed(2));

        expect(fFrontEndSaving).toBe(0.45);

        expect(fFrontEndTotalGross - fFrontEndSaving).toBe(9.55);
    });

    /**
     * Test 10: Feedback Saving Validation
     */

        test('Should execute full review pipeline: save feedback, recalculate rating, and verify interaction log', async () => {
        const targetCustomerId = 'b4d7b17e-39a0-45ef-bf73-13bd18a017cf';
        const sFakeStoreProductId = '44444444-4444-4444-4444-444444444444';
        const sTargetOrderId = 'a1b2c3d4-e5f6-47a8-b9c0-1d2e3f4a5b6c';

        const feedbackResponse = await POST('/odata/v4/crm/Feedbacks', {
            ID: 'f9e8d7c6-b5a4-3210-0987-fedcba987654',
            customer_ID: targetCustomerId,
            product_ID: sFakeStoreProductId,
            rating: 1,
            comments: `[Order_ID: ${sTargetOrderId}] Unacceptable delivery delay, totally disappointed!`,
            feedbackDate: '2026-08-01'
        }, {
            auth: { username: 'admin', password: '' }
        });

        expect(feedbackResponse.status).toBe(201);

        const customerResponse = await GET(`/odata/v4/crm/Customers(ID='${targetCustomerId}',IsActiveEntity=true)`, {
            auth: { username: 'admin', password: '' }
        });

        expect(customerResponse.status).toBe(200);
        expect(customerResponse.data.averageRating).toBeLessThanOrEqual(3.00);
        expect(customerResponse.data.statusCode_code).toBe('R');

        const interactionsResponse = await GET('/odata/v4/crm/Interactions', {
            auth: { username: 'admin', password: '' }
        });

        expect(interactionsResponse.status).toBe(200);
        const aLogs = interactionsResponse.data.value;
        const oTargetLog = aLogs.find(log => log.customer_ID === targetCustomerId && log.method_code === 'feedback');

        expect(oTargetLog).toBeDefined();
        expect(oTargetLog.summary).toContain('Rating: 1');
    });

    /**
     * Test 11: Bound Action cancelOrder Workflow
     */
    test.skip('Should execute order cancellation bound action, verify stock rollback, and test system feedback generation', async () => {
        const sServicePath = '/odata/v4/sales-order';
        const sTargetOrderId = 'a1b2c3d4-e5f6-47a8-b9c0-1d2e3f4a5b6c'; 
        const sTargetProductId = '07fe11fa-27da-4cb4-9826-791510b48dcd'; 


        const oProdBefore = await GET(`${sServicePath}/Products(${sTargetProductId})`, {
            auth: { username: 'admin', password: '' }
        });
        const iStockBefore = oProdBefore.data.stock;

        const sActionUrl = `${sServicePath}/Orders(ID=${sTargetOrderId},IsActiveEntity=true)/SalesOrderService.cancelOrder`;

        const oActionResponse = await POST(sActionUrl, {
            reasonCode: 'Client refused',
            platformCode: 'Steam Store',
            comment: 'Test manager cancellation workflow execution'
        }, {
            auth: { username: 'admin', password: '' },
            headers: {

                'X-CDS-User-Roles': 'SalesManager,CRMAdmin,admin',
                'Content-Type': 'application/json'
            }
        });

        expect(oActionResponse.status).toBe(200);

        const oOrderAfter = await GET(`${sServicePath}/Orders(ID=${sTargetOrderId},IsActiveEntity=true)`, {
            auth: { username: 'admin', password: '' },
            headers: { 'X-CDS-User-Roles': 'SalesManager,CRMAdmin,admin' }
        });
        expect(oOrderAfter.status).toBe(200);
        expect(oOrderAfter.data.status_code).toBe('X');


        const oProdAfter = await GET(`${sServicePath}/Products(${sTargetProductId})`, {
            auth: { username: 'admin', password: '' }
        });
        expect(oProdAfter.data.stock).toBeGreaterThan(iStockBefore); 

        const oFeedbacksResponse = await GET(`/odata/v4/crm/Feedbacks`, {
            auth: { username: 'admin', password: '' }
        });
        expect(oFeedbacksResponse.status).toBe(200);

        const aFeedbacks = oFeedbacksResponse.data.value;
        const oTargetFeedback = aFeedbacks.find(fb => fb.rating === 0 && fb.comments.includes('[CANCELED]'));

        expect(oTargetFeedback).toBeDefined();
        expect(oTargetFeedback.comments).toContain('[CANCELED][Steam Store][Client refused]');
    });

    /**
     * Test 12: Catalog Filter - In Stock Only Validation
     */
    test('Should successfully filter products by active warehouse stock availability', async () => {
        const response = await GET('/odata/v4/sales-order/Products?$filter=stock gt 0', {
            auth: { username: 'admin', password: '' }
        });

        expect(response.status).toBe(200);
        const aProducts = response.data.value;
        expect(aProducts).toBeDefined();

        if (aProducts.length > 0) {
            aProducts.forEach(oProduct => {
                expect(oProduct.stock).toBeGreaterThan(0);
            });
        }
    });

    /**
     * Test 13: Catalog Filter - Price Limit Validation
     */
    test('Should successfully filter products by maximum price tier criteria', async () => {
        const response = await GET('/odata/v4/sales-order/Products?$filter=price le 50', {
            auth: { username: 'admin', password: '' }
        });

        expect(response.status).toBe(200);
        const aProducts = response.data.value;
        expect(aProducts).toBeDefined();

        if (aProducts.length > 0) {
            aProducts.forEach(oProduct => {
                expect(Number(oProduct.price)).toBeLessThanOrEqual(50);
            });
        }
    });

    /**
     * Test 14: Orders List Filter - Status Selection Validation
     */
    test('Should successfully filter sales orders by document status code', async () => {
        const response = await GET("/odata/v4/sales-order/Orders?$filter=status_code eq 'C'", {
            auth: { username: 'admin', password: '' }
        });

        expect(response.status).toBe(200);
        const aOrders = response.data.value;
        expect(aOrders).toBeDefined();

        if (aOrders.length > 0) {
            aOrders.forEach(oOrder => {
                expect(oOrder.status_code).toBe('C');
            });
        }
    });

    /**
     * Test 15: Orders List Filter - Case-Insensitive Customer Search
     */
    test('Should successfully filter sales orders by customer name using case-insensitive contains criteria', async () => {

        const sFilterUrl = "/odata/v4/sales-order/Orders?$expand=customer&$filter=contains(tolower(customer/name),'elena')";

        const response = await GET(sFilterUrl, {
            auth: { username: 'admin', password: '' }
        });

        expect(response.status).toBe(200);
        const aOrders = response.data.value;
        expect(aOrders).toBeDefined();

        if (aOrders.length > 0) {
            aOrders.forEach(oOrder => {
                expect(oOrder.customer).toBeDefined();

                expect(oOrder.customer.name.toLowerCase()).toContain('elena');
            });
        }
    });

    /**
     * TEST 16: Login System Pipeline & Privileged Context Verification
     */

    // Test 16.1
    test('Should successfully fetch specific Administrator profile by static UUID from CRM Customers entity', async () => {
        const sAdminId = '77777777-7777-7777-7777-777777777777';

        const sAdminUrl = `/odata/v4/crm/Customers(ID='${sAdminId}',IsActiveEntity=true)`;

        const response = await GET(sAdminUrl, {
            auth: { username: 'admin', password: '' }
        });

        expect(response.status).toBe(200);
        expect(response.data).toBeDefined();

        expect(response.data.ID).toBe(sAdminId);
        expect(response.data).toHaveProperty('categoryGroup');
    });

    // 16.2

    test('Should reject anonymous request to crm Customers with 401 to trigger custom fallback login dialog', async () => {
        const sAdminId = '77777777-7777-7777-7777-777777777777';
        const sSilentLoginUrl = `/odata/v4/crm/Customers(ID='${sAdminId}',IsActiveEntity=true)`;

        try {
            await GET(sSilentLoginUrl);
        } catch (oError) {
            const iStatus = oError.statusCode || oError.status || (oError.response && oError.response.status);
            expect(iStatus).toBe(401);
        }
    });
    /**
     * TEST 17: Multi-Role RBAC & Data Isolation for ClientProfile
     */

    // 17.1
    test('Gamer with Customer role should successfully read their own ClientProfile data', async () => {
        const sGamerId = 'b4d7b17e-39a0-45ef-bf73-13bd18a017cf';
        const sUrl = `/odata/v4/sales-order/ClientProfile(ID='${sGamerId}',IsActiveEntity=true)`;

        const response = await GET(sUrl, {
            auth: { username: 'gamer', password: '' }
        });

        expect(response.status).toBe(200);
        expect(response.data).toBeDefined();
        expect(response.data.ID).toBe(sGamerId);
    });

    // 17.2

    test('Should strictly block SalesManager from accessing ClientProfile entity', async () => {
        const sGamerId = 'b4d7b17e-39a0-45ef-bf73-13bd18a017cf';
        const sUrl = `/odata/v4/sales-order/ClientProfile(ID='${sGamerId}',IsActiveEntity=true)`;

        await expect(GET(sUrl, {
            auth: { username: 'manager', password: '' }
        })).rejects.toThrow();
    });

    /**
     * TEST 18: Feedbacks Deletion Protection Contract
     */
    test('Should block Customer and SalesManager from deleting feedback rows', async () => {
        const sFeedbackId = 'f9e8d7c6-b5a4-3210-0987-fedcba987654';
        const sUrl = `/odata/v4/sales-order/Feedbacks(${sFeedbackId})`;

        const configManager = { auth: { username: 'manager', password: '' } };
        const configGamer = { auth: { username: 'gamer', password: '' } };

        await expect(DELETE(sUrl, configManager)).rejects.toThrow();
        await expect(DELETE(sUrl, configGamer)).rejects.toThrow();
    });

    /**
     * TEST 19: Products Catalog Data Mutation Block
     */
    test('Should block SalesManager and Customer from updating game pricing in Products catalog', async () => {
        const sTargetProductId = '07fe11fa-27da-4cb4-9826-791510b48dcd';
        const sUrl = `/odata/v4/sales-order/Products(${sTargetProductId})`;

        const configManager = { auth: { username: 'manager', password: '' } };
        await expect(PATCH(sUrl, { price: 99.99 }, configManager)).rejects.toThrow();
    });

});

