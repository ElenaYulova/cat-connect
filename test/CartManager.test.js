const CartManager = {
    addToCart: (oCartModel, sId, sTitle, fPrice, iQtyToAdd) => {
        if (!oCartModel) return;
        const oCartData = oCartModel.getData();
        const aItems = oCartData.items;
        const oExistingItem = aItems.find(item => item.id === sId);

        if (oExistingItem) {
            oExistingItem.quantity += iQtyToAdd;
        } else {
            aItems.push({ id: sId, title: sTitle, price: fPrice, quantity: iQtyToAdd });
        }

        CartManager._recalculateTotals(oCartData, aItems, oCartModel);
    },

    updateQuantity: (oCartModel, sId, iNewQty) => {
        if (!oCartModel) return;
        const oCartData = oCartModel.getData();
        const aItems = oCartData.items;
        const oItem = aItems.find(item => item.id === sId);
        if (oItem) {
            oItem.quantity = iNewQty;
            CartManager._recalculateTotals(oCartData, aItems, oCartModel);
        }
    },

    getQuantityForProduct: (oCartModel, sId) => {
        if (!oCartModel) return 1;
        const oCartData = oCartModel.getData();
        const aItems = (oCartData && oCartData.items) || [];
        const oExistingItem = aItems.find(item => item.id === sId);
        return oExistingItem ? oExistingItem.quantity : 1;
    },

    _recalculateTotals: (oCartData, aItems, oCartModel) => {
        let iTotalItems = 0;
        let fTotalPrice = 0;
        aItems.forEach(item => {
            iTotalItems += item.quantity;
            fTotalPrice += item.price * item.quantity;
        });
        oCartData.totalItems = iTotalItems;
        oCartData.totalPrice = parseFloat(fTotalPrice.toFixed(2));

        let fDiscountPercent = 0;
        if (typeof window !== "undefined" && window.localStorage) {
            const sSavedUserJson = window.localStorage.getItem("catConnect_userProfile");
            if (sSavedUserJson) {
                try {
                    const oUserData = JSON.parse(sSavedUserJson);
                    if (oUserData && oUserData.averageRating) {
                        const fRatingValue = parseFloat(oUserData.averageRating);
                        if (!isNaN(fRatingValue)) {
                            fDiscountPercent = fRatingValue / 100;
                        }
                    }
                } catch (e) {
                    fDiscountPercent = 0;
                }
            }
        }

        const fEstimatedTotal = fTotalPrice * (1 - fDiscountPercent);
        oCartData.estimatedTotal = parseFloat(fEstimatedTotal.toFixed(2));

        oCartModel.setData(oCartData);
        if (typeof oCartModel.refresh === "function") {
            oCartModel.refresh(true);
        }
    }
};

class MockJSONModel {
    constructor(oData) { this.oData = oData; }
    getData() { return this.oData; }
    setData(oNewData) { this.oData = oNewData; }
    refresh(bForce) { this.bRefreshed = bForce; }
}

describe('Front-End: CartManager Unit Suite', () => {

    beforeEach(() => {
        global.window = {
            localStorage: {
                getItem: jest.fn().mockReturnValue(null),
                setItem: jest.fn()
            }
        };
    });

    afterEach(() => {
        delete global.window;
    });

    test('Should dynamically add new item and recalculate totals', () => {
        const oMockModel = new MockJSONModel({
            items: [],
            totalItems: 0,
            totalPrice: 0.00,
            estimatedTotal: 0.00
        });

        CartManager.addToCart(oMockModel, "game-123", "Cyberpunk Cat", 10.00, 2);

        const oResultData = oMockModel.getData();
        expect(oResultData.items.length).toBe(1);
        expect(oResultData.items[0].quantity).toBe(2);
        expect(oResultData.totalItems).toBe(2);
        expect(oResultData.totalPrice).toBe(20.00);
        expect(oResultData.estimatedTotal).toBe(20.00);
    });

    test('Should return correct quantity for existing product and 1 for new product', () => {
        const oMockModel = new MockJSONModel({
            items: [{ id: "game-123", quantity: 5 }]
        });

        expect(CartManager.getQuantityForProduct(oMockModel, "game-123")).toBe(5);
        expect(CartManager.getQuantityForProduct(oMockModel, "game-456")).toBe(1);
    });

    test('Should update quantity and recalculate totals correctly', () => {
        const oMockModel = new MockJSONModel({
            items: [{ id: "game-123", price: 15.00, quantity: 1 }],
            totalItems: 1,
            totalPrice: 15.00,
            estimatedTotal: 15.00
        });

        CartManager.updateQuantity(oMockModel, "game-123", 4);

        const oResultData = oMockModel.getData();
        expect(oResultData.items[0].quantity).toBe(4);
        expect(oResultData.totalItems).toBe(4);
        expect(oResultData.totalPrice).toBe(60.00);
        expect(oResultData.estimatedTotal).toBe(60.00);
    });


    test('Should apply 5% discount for user with averageRating 5.00', () => {
        const oMockAdminProfile = {
            isLoggedIn: true,
            id: "77777777-7777-7777-7777-777777777777",
            averageRating: "5.00"
        };

        global.window.localStorage.getItem = jest.fn().mockReturnValue(JSON.stringify(oMockAdminProfile));

        const oMockModel = new MockJSONModel({
            items: [{ id: "game-777", price: 100.00, quantity: 2 }],
            totalItems: 2,
            totalPrice: 200.00,
            estimatedTotal: 200.00
        });

        CartManager.updateQuantity(oMockModel, "game-777", 2);

        const oResultData = oMockModel.getData();
        expect(oResultData.totalPrice).toBe(200.00);

        expect(oResultData.estimatedTotal).toBe(190.00);
    });

    test('Should apply dynamic 4.5% discount for Premium user with rating 4.50', () => {
        const oMockPremiumProfile = {
            isLoggedIn: true,
            id: "b4d7b17e-39a0-45ef-bf73-13bd18a017cf",
            averageRating: "4.50"
        };

        global.window.localStorage.getItem = jest.fn().mockReturnValue(JSON.stringify(oMockPremiumProfile));

        const oMockModel = new MockJSONModel({
            items: [{ id: "game-123", price: 10.00, quantity: 1 }],
            totalItems: 1,
            totalPrice: 10.00,
            estimatedTotal: 10.00
        });

        CartManager.addToCart(oMockModel, "game-456", "Cyberpunk", 90.00, 1);

        const oResultData = oMockModel.getData();
        expect(oResultData.totalPrice).toBe(100.00);

        expect(oResultData.estimatedTotal).toBe(95.50);
    });

     test('Should combine base rating discount and bulk discount when item quantity triggers threshold', () => {

        const oMockEligibleProfile = {
            id: "user-bulk-true-123",
            averageRating: "4.00",
            isBulkAvailable: true,
            bulkDiscountPercent: 0.10,
            bulkMinQuantity: 10
        };

        global.window.localStorage.getItem = jest.fn().mockReturnValue(JSON.stringify(oMockEligibleProfile));

        const oMockModel = new MockJSONModel({
            items: [{ id: "game-111", price: 10.00, quantity: 5 }],
            totalItems: 5,
            totalPrice: 50.00,
            estimatedTotal: 50.00
        });

        CartManager.updateQuantity(oMockModel, "game-111", 5);
        let oData = oMockModel.getData();
        expect(oData.totalPrice).toBe(50.00);

        expect(oData.estimatedTotal).toBe(48.00);

        CartManager.updateQuantity(oMockModel, "game-111", 10);
        oData = oMockModel.getData();

        expect(oData.totalPrice).toBe(100.00);
        expect(oData.estimatedTotal).toBe(96.00);
    });

    test('Should not apply bulk discount even if quantity is high if isBulkAvailable is false', () => {

        const oMockNotEligibleProfile = {
            id: "user-bulk-false-999",
            averageRating: "5.00",
            isBulkAvailable: false,
            bulkDiscountPercent: 0.10,
            bulkMinQuantity: 10
        };

        global.window.localStorage.getItem = jest.fn().mockReturnValue(JSON.stringify(oMockNotEligibleProfile));

        const oMockModel = new MockJSONModel({
            items: [{ id: "game-222", price: 10.00, quantity: 15 }],
            totalItems: 15,
            totalPrice: 150.00,
            estimatedTotal: 150.00
        });

        CartManager.updateQuantity(oMockModel, "game-222", 15);
        const oData = oMockModel.getData();

        expect(oData.totalPrice).toBe(150.00);
        expect(oData.estimatedTotal).toBe(142.50);
    });
});
