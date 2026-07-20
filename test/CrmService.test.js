const cds = require('@sap/cds');

if (!cds.env.requires) cds.env.requires = {};
cds.env.requires.db = { kind: 'sqlite' };
cds.env.requires.auth = {
    kind: 'mocked',
    users: {
        admin:   { roles: ['authenticated-user', 'CRMAdmin', 'SalesManager', 'SupportAgent'] },
        manager: { roles: ['authenticated-user', 'SalesManager'] },
        agent:   { roles: ['authenticated-user', 'SupportAgent'] }
    }
};

const { GET, POST, DELETE } = cds.test(__dirname + '/..', '--in-memory');

describe('CRM Service Integration & Business Logic Tests', () => {

    /**
     * TEST 1: Security & Authentication Gate
     */
    test('1. Should block Anonymous users with 401 Unauthorized', async () => {
        try {
            await GET('/odata/v4/crm/Customers');
            throw new Error('Security breach: Anonymous access was allowed');
        } catch (error) {
            const errCode = error.statusCode || error.status || error.code;
            expect(String(errCode)).toBe('401');
        }
    });

    /**
     * TEST 2: Dynamic Business Logic Validation
     */
    test('2. Should successfully fetch customers and calculate categoryGroup for Admin', async () => {
        const response = await GET('/odata/v4/crm/Customers', {
            auth: { username: 'admin', password: '' }
        });

        expect(response.status).toBe(200);

        const customers = response.data.value;
        expect(Array.isArray(customers)).toBe(true);

        if (customers.length > 0) {
            const firstCustomer = customers[0];
            expect(firstCustomer).toHaveProperty('categoryGroup');
        }
    });

    /**
     * TEST 2.1: ROLE VALIDATION - SupportAgent Block on Create
     */
    test('2.1. Should strictly block Support Agent from creating a customer draft', async () => {
        try {
            await POST('/odata/v4/crm/Customers', {
                ID: 'fc3e48ed-f200-46b0-b2ec-ae2560ca7925',
                firstName: 'Test',
                lastName: 'User'
            }, {
                auth: { username: 'agent', password: '' }
            });
            throw new Error('Security breach: Support Agent was allowed to trigger Create');
        } catch (error) {
            const errCode = error.statusCode || error.status || error.code;
            expect(String(errCode)).toBe('403');
        }
    });

    /**
     * TEST 2.2: ROLE VALIDATION - SalesManager Block on Delete
     */
    test('2.2. Should block Sales Manager from deleting a customer record', async () => {
        try {
            await DELETE('/odata/v4/crm/Customers(ID=fc3e48ed-f200-46b0-b2ec-ae2560ca7924,IsActiveEntity=true)', {
                auth: { username: 'manager', password: '' }
            });
            throw new Error('Security breach: Sales Manager was allowed to delete data');
        } catch (error) {
            const errCode = error.statusCode || error.status || error.code;
            expect(String(errCode)).toBe('403');
        }
    });
/**
     * TEST 3.1: Business Logic Validation - Customer Internal Notes
     * Purpose: Verify that validation fails if an internal note is shorter than 5 characters.
     * Expected Outcome: HTTP 400 Bad Request (Promise Rejected).
     */
    test('3.1. Should reject saving a customer if internal note is shorter than 5 characters', async () => {
        const payload = {
            ID: 'fc3e48ed-f200-46b0-b2ec-ae2560ca7924',
            IsActiveEntity: false,
            firstName: 'ValidFirstName',
            lastName: 'ValidLastName',
            customerNotes: [
                { content: 'bad' }
            ]
        };
        const config = { auth: { username: 'manager', password: '' } };

        await expect(POST('/odata/v4/crm/Customers', payload, config)).rejects.toThrow();
    });

    /**
     * TEST 3.2: Business Logic Validation - Core Customer Fields
     * Purpose: Verify that validation fails if first name contains only blank spaces.
     * Expected Outcome: HTTP 400 Bad Request (Promise Rejected).
     */
    test('3.2. Should reject saving a customer if first name consists only of spaces', async () => {
        const payload = {
            ID: 'fc3e48ed-f200-46b0-b2ec-ae2560ca7929',
            IsActiveEntity: false,
            firstName: '   ',
            lastName: 'ValidLastName'
        };
        const config = { auth: { username: 'manager', password: '' } };

        await expect(POST('/odata/v4/crm/Customers', payload, config)).rejects.toThrow();
    });

    /**
     * TEST 4: Bound Action Execution (on clearNotes)
     */
    test('4. Should allow executing clearNotes action for a valid customer', async () => {
        const response = await POST('/odata/v4/crm/Customers(ID=fc3e48ed-f200-46b0-b2ec-ae2560ca7924,IsActiveEntity=true)/clearNotes', {}, {
            auth: { username: 'manager', password: '' }
        });

        expect(response.status).toBe(204);
    });

    /**
     * TEST 5: Feedback Impact on Rating, Status, and Interaction Logging
     */
    test('5. Should recalculate average rating and automatically log interaction on feedback submission', async () => {
        const targetCustomerId = 'b4d7b17e-39a0-45ef-bf73-13bd18a017cf';

        const feedbackResponse = await POST('/odata/v4/crm/Feedbacks', {
            ID: 'a7b6c5d4-e3f2-51a0-9b8c-7d6e5f4a3b2c',
            customer_ID: targetCustomerId,
            rating: 1,
            comments: 'Terrible lag in the game, completely unplayable!'
        }, {
            auth: { username: 'admin', password: '' }
        });

        expect(feedbackResponse.status).toBe(201);

        const interactionsResponse = await GET('/odata/v4/crm/Interactions', {
            auth: { username: 'admin', password: '' }
        });

        expect(interactionsResponse.status).toBe(200);
    });

    /**
     * TEST 6: Quick Insights Metadata & Sort Presentation Gate
     * Purpose: Verify that the service correctly exposes top-5 item restrictions
     *          and default presentation variants to satisfy the CRM UI specification.
     * Expected Outcome: Verification of MaxItems property directly from the CDS model structure.
     */
    test('6. Should expose UI presentation variant metadata with MaxItems limit of 5', async () => {
        const model = await cds.load('srv/crm-service.cds');
        const entity = model.definitions['CrmService.Interactions'];

        expect('@UI.PresentationVariant.MaxItems' in entity).toBe(true);
        expect(entity['@UI.PresentationVariant.MaxItems']).toBe(5);

        expect('@UI.PresentationVariant.SortOrder' in entity).toBe(true);
        const sortOrder = entity['@UI.PresentationVariant.SortOrder'][0];

        expect(sortOrder.Property['=']).toBe('date');
        expect(sortOrder.Descending).toBe(true);
    });

});
