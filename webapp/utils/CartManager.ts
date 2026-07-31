import JSONModel from "sap/ui/model/json/JSONModel";
import MessageToast from "sap/m/MessageToast";

/**
 * @namespace sap.capire.gameshop.utils
 */
export default class CartManager {

    public static addToCart(oCartModel: JSONModel, sId: string, sTitle: string, fPrice: number, iQtyToAdd: number): void {
        if (!oCartModel) return;    
        const oCartData = oCartModel.getData();
        const aItems = oCartData.items as any[];
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

        this._recalculateTotalsAndRefresh(oCartModel, oCartData, aItems);
        MessageToast.show(`Added ${iQtyToAdd} copy(ies) of "${sTitle}" to cart!`);
    }

    public static updateQuantity(oCartModel: JSONModel, sId: string, iNewQty: number): void {
        if (!oCartModel) return;
        const oCartData = oCartModel.getData();
        const aItems = oCartData.items as any[];

        const oItem = aItems.find(item => item.id === sId);
        if (oItem) {
            oItem.quantity = iNewQty;
            this._recalculateTotalsAndRefresh(oCartModel, oCartData, aItems);
        }
    }

    public static removeFromCart(oCartModel: JSONModel, sId: string): void {
        if (!oCartModel) return;
        const oCartData = oCartModel.getData();
        const aItems = oCartData.items as any[];

        const aUpdatedItems = aItems.filter(item => item.id !== sId);
        oCartData.items = aUpdatedItems;

        this._recalculateTotalsAndRefresh(oCartModel, oCartData, aUpdatedItems);
        MessageToast.show("Item removed from cart");
    }


    private static _recalculateTotalsAndRefresh(oCartModel: JSONModel, oCartData: any, aItems: any[]): void {
        let iTotalItems = 0;
        let fTotalPrice = 0;

        aItems.forEach(item => {
            iTotalItems += item.quantity;
            fTotalPrice += item.price * item.quantity;
        });

        oCartData.totalItems = iTotalItems;
        oCartData.totalPrice = parseFloat(fTotalPrice.toFixed(2));

        oCartModel.setData(oCartData, false);
    }

    public static getQuantityForProduct(oCartModel: JSONModel, sId: string): number {
        if (!oCartModel) return 1;

        const oCartData = oCartModel.getData();
        const aItems = (oCartData && oCartData.items) as any[] || [];

        const oExistingItem = aItems.find(item => item.id === sId);

        return oExistingItem ? oExistingItem.quantity : 1;
    }
}
