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

const { GET } = cds.test(__dirname + '/..', '--in-memory');


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
});
