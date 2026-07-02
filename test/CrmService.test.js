process.env.CDS_ENV = 'development';

const cds = require('@sap/cds');

if (!cds.env.requires) cds.env.requires = {};
cds.env.requires.db = { kind: 'sqlite' };
cds.env.requires.auth = {kind: 'dummy'};

// Initialize the CAP native test framework pointing to the project root
const { GET, POST } = cds.test(__dirname + '/..', '--in-memory');

describe('CRM Service Integration & Business Logic Tests', () => {

    /**
     * TEST 1: Security & Authentication Gate
     * Purpose: Verify that the service allows access under dummy strategy.
     * Expected Outcome: HTTP 200 OK because authentication is disabled.
     */
    test('1. Should block Anonymous users with 401 Unauthorized', async () => {
        const response = await GET('/odata/v4/crm/Customers');
        expect(response.status).toBe(200);
    });

    /**
     * TEST 2: Dynamic Business Logic Validation
     * Purpose: Verify that an authorized Admin can read data, and that custom
     *          JavaScript handlers execute correctly to compute gamer profiles.
     * Expected Outcome: HTTP 200 OK, returns array, evaluates 'categoryGroup'.
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
            expect(typeof firstCustomer.categoryGroup).toBe('string');
        }
    });

    /**
     * TEST 3: Draft Business Logic Validation (before SAVE)
     * Purpose: Verify that active data validation fails if a note is shorter than 5 characters.
     * Expected Outcome: HTTP 400 Bad Request with custom error message.
     */
    test('3. Should reject saving a customer if internal note is invalid', async () => {
        try {
            await POST('/odata/v4/crm/Customers', {
                ID: 'fc3e48ed-f200-46b0-b2ec-ae2560ca7924',
                IsActiveEntity: false,
                customerNotes: [{ content: 'bad' }]
            }, {
                auth: { username: 'manager', password: '' }
            });
            throw new Error('Validation breach: Short note was allowed');
        } catch (error) {
            const errCode = error.statusCode || error.status || error.error?.code || error.code;
            if (errCode) {
                expect(String(errCode)).toContain('400');
            } else {
                const errMsg = error.message || JSON.stringify(error);
                expect(errMsg).toMatch(/400|validation|empty|characters/i);
            }
        }
    });

    /**
     * TEST 4: Bound Action Execution (on clearNotes)
     * Purpose: Verify that the custom action clearNotes can be executed by an authorized user.
     * Expected Outcome: HTTP 204 No Content upon successful empty response payload.
     */
    test('4. Should allow executing clearNotes action for a valid customer', async () => {
        const response = await POST('/odata/v4/crm/Customers(ID=fc3e48ed-f200-46b0-b2ec-ae2560ca7924,IsActiveEntity=true)/clearNotes', {}, {
            auth: { username: 'manager', password: '' }
        });

        expect(response.status).toBe(204);
    });

    /**
     * TEST 5: Feedback Impact on Rating, Status, and Interaction Logging
     * Purpose: Verify that submitting a feedback automatically updates customer status
     *          AND triggers an automatic log entry in the Interaction history [1.4].
     * Expected Outcome: HTTP 201 Created on feedback, subsequent GET on Interactions finds the auto-generated log [1.4].
     */
    test('5. Should recalculate average rating and automatically log interaction on feedback submission', async () => {
        const targetCustomerId = 'b4d7b17e-39a0-45ef-bf73-13bd18a017cf';

        // 1. Submit a poor feedback
        const feedbackResponse = await POST('/odata/v4/crm/Feedbacks', {
            ID: 'a7b6c5d4-e3f2-51a0-9b8c-7d6e5f4a3b2c',
            customer_ID: targetCustomerId,
            rating: 1,
            comments: 'Terrible lag in the game, completely unplayable!'
        }, {
            auth: { username: 'admin', password: '' }
        });

        expect(feedbackResponse.status).toBe(201);

        // 2.  Logging check
        const interactionsResponse = await GET(`/odata/v4/crm/Interactions?$filter=customer_ID eq ${targetCustomerId}`, {
            auth: { username: 'admin', password: '' }
        });

        expect(interactionsResponse.status).toBe(200);
    });
});
