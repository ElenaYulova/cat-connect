import JSONModel from "sap/ui/model/json/JSONModel";
import MessageToast from "sap/m/MessageToast";
import MessageBox from "sap/m/MessageBox";
import View from "sap/ui/core/mvc/View";
import ODataModel from "sap/ui/model/odata/v4/ODataModel";

/**
 * @namespace sap.capire.gameshop.utils
 */
export default class CartManager {

    public static getQuantityForProduct(oCartModel: JSONModel, sProductId: string): number {
        if (!oCartModel) return 1;
        const oCartData = oCartModel.getData();
        const aItems = (oCartData && oCartData.items) as any[] || [];
        const oItem = aItems.find(item => item.id === sProductId);
        return oItem ? oItem.quantity : 1;
    }

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

    public static triggerRefresh(oCartModel: JSONModel): void {
        if (!oCartModel) return;
        const oCartData = oCartModel.getData();
        const aItems = (oCartData && oCartData.items) as any[] || [];
        this._recalculateTotalsAndRefresh(oCartModel, oCartData, aItems);
    }

    private static _recalculateTotalsAndRefresh(oCartModel: JSONModel, oCartData: any, aItems: any[]): void {
        let iTotalItems = 0;
        let fTotalPrice = 0;

        aItems.forEach(item => {
            iTotalItems += item.quantity;
            fTotalPrice += item.price * item.quantity;
        });

        oCartModel.setProperty("/totalItems", iTotalItems);
        oCartModel.setProperty("/totalPrice", parseFloat(fTotalPrice.toFixed(2)));

        const sSavedUserJson = window.localStorage.getItem("catConnect_userProfile");
        let fDiscountPercent = 0;

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

        const fEstimatedTotal = fTotalPrice * (1 - fDiscountPercent);
        oCartModel.setProperty("/estimatedTotal", parseFloat(fEstimatedTotal.toFixed(2)));

        oCartModel.refresh(true);
    }


    public static submitOrder(oView: View, oODataModel: ODataModel, oCartModel: JSONModel): void {
        interface CartItem {
            id: string;
            quantity: number | string;
        }

        interface BackendOrderResponse {
            netAmount?: number;
        }

        const aCartItems = (oCartModel.getProperty("/items") as CartItem[]) || [];

        if (aCartItems.length === 0) {
            MessageToast.show("Your cart is empty.");
            return;
        }

        const sSavedUserJson = window.localStorage.getItem("catConnect_userProfile");
        let oUserData: { id?: string } | null = null;
        if (sSavedUserJson) {
            try {
                oUserData = JSON.parse(sSavedUserJson);
            } catch (e) {
                oUserData = null;
            }
        }

        oView.setBusy(true);

        const oOrdersListBinding = oODataModel.bindList("/Orders");

        const oOrderContext = oOrdersListBinding.create({
            currency_code: "USD",
            customer_ID: oUserData && oUserData.id ? oUserData.id : null,
            items: aCartItems.map((oItem: CartItem) => ({
                game_ID: oItem.id,
                quantity: typeof oItem.quantity === "string" ? parseInt(oItem.quantity, 10) : oItem.quantity || 1
            }))
        });

        if (!oOrderContext) {
            oView.setBusy(false);
            MessageBox.error("Failed to initialize OData context for the new order.");
            return;
        }

        const oCreatedPromise = oOrderContext.created();

        if (!oCreatedPromise) {
            oView.setBusy(false);
            MessageBox.error("OData creation promise is not available.");
            return;
        }

        oCreatedPromise.then(() => {
            oView.setBusy(false);

            const oCreatedData = oOrderContext.getObject() as BackendOrderResponse | undefined;
            const fFinalAmount = oCreatedData && typeof oCreatedData.netAmount === "number" 
                ? oCreatedData.netAmount 
                : oCartModel.getProperty("/totalPrice");

            oCartModel.setProperty("/items", []);
            oCartModel.setProperty("/totalItems", 0);
            oCartModel.setProperty("/totalPrice", 0.00);
            oCartModel.setProperty("/estimatedTotal", 0.00);
            oCartModel.updateBindings(true);

            MessageBox.success(`Order has been successfully submitted! Final amount with rating discount: ${fFinalAmount} USD`);
        }).catch((oError: Error) => {
            oView.setBusy(false);
            MessageBox.error(oError.message || "Failed to submit order due to database constraints.");
        });
    }

}
