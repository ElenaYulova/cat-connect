
const CartManager = {
    addToCart: (oCartModel, sId, sTitle, fPrice, iQtyToAdd) => {
        if (!oCartModel) return;

        const oCartData = oCartModel.getData();
        const aItems = oCartData.items;

        const oExistingItem = aItems.find(item => item.id === sId);

        if (oExistingItem) {
            oExistingItem.quantity += iQtyToAdd;
        } else {
            aItems.push({
                id: sId,
                title: sTitle,
                price: fPrice,
                quantity: iQtyToAdd
            });
        }

        let iTotalItems = 0;
        let fTotalPrice = 0;

        aItems.forEach(item => {
            iTotalItems += item.quantity;
            fTotalPrice += item.price * item.quantity;
        });

        oCartData.totalItems = iTotalItems;
        oCartData.totalPrice = parseFloat(fTotalPrice.toFixed(2));

        oCartModel.setData(oCartData);
    }
};

class MockJSONModel {
    constructor(oData) { this.oData = oData; }
    getData() { return this.oData; }
    setData(oNewData) { this.oData = oNewData; }
}

describe('Front-End: CartManager Unit Suite', () => {

    /**
     * Dynamic Totals recalculation
     */

    test('Should dynamically add new item and recalculate totals', () => {
        const oMockModel = new MockJSONModel({
            items: [],
            totalItems: 0,
            totalPrice: 0.00
        });


        CartManager.addToCart(oMockModel, "game-123", "Cyberpunk Cat", 10.00, 2);

        const oResultData = oMockModel.getData();
        expect(oResultData.items.length).toBe(1);
        expect(oResultData.items[0].quantity).toBe(2);
        expect(oResultData.totalItems).toBe(2);
        expect(oResultData.totalPrice).toBe(20.00);
    });
});
