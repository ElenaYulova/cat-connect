import JSONModel from "sap/ui/model/json/JSONModel";
import MessageToast from "sap/m/MessageToast";
import MessageBox from "sap/m/MessageBox";
import View from "sap/ui/core/mvc/View";
import ODataModel from "sap/ui/model/odata/v4/ODataModel";
import NavigationManager from "./NavigationManager";
import ResourceModel from "sap/ui/model/resource/ResourceModel";

/**
 * @namespace sap.capire.gameshop.utils
 */
export default class CartManager {

    private static _oBundle = new ResourceModel({
        bundleName: "sap.capire.gameshop.i18n.i18n"
    }).getResourceBundle() as any;

    public static getQuantityForProduct(oCartModel: JSONModel, sProductId: string): number {
        if (!oCartModel) return 1;
        const oCartData = oCartModel.getData();
        const aItems = (oCartData && oCartData.items) as any[] || [];
        const oItem = aItems.find(item => item.id === sProductId);
        return oItem ? oItem.quantity : 1;
    }

    public static addToCart(oCartModel: JSONModel, sId: string, sTitle: string, fPrice: number, iQtyToAdd: number): void {
        if (!oCartModel) return;
        const oBundle = (sap.ui as any).core?.Component?.getOwnerComponentFor(sap.ui.getCore().getStaticAreaRef())?.getModel("i18n")?.getResourceBundle()
            || (sap.ui.getCore().getModel("i18n") as any)?.getResourceBundle();
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
         MessageToast.show(this._oBundle?.getText("cartManager.message.addedToCart", [iQtyToAdd, sTitle]) || "...");
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
        const oBundle = (sap.ui as any).core?.Component?.getOwnerComponentFor(sap.ui.getCore().getStaticAreaRef())?.getModel("i18n")?.getResourceBundle()
            || (sap.ui.getCore().getModel("i18n") as any)?.getResourceBundle();
        const oCartData = oCartModel.getData();
        const aItems = oCartData.items as any[];

        const aUpdatedItems = aItems.filter(item => item.id !== sId);
        oCartData.items = aUpdatedItems;

        this._recalculateTotalsAndRefresh(oCartModel, oCartData, aUpdatedItems);
        MessageToast.show(this._oBundle?.getText("cartManager.message.itemRemoved") || "...");
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

        const fClientDiscountAmount = CartManager._calculateClientDiscount(fTotalPrice, iTotalItems);
        oCartModel.setProperty("/clientDiscount", fClientDiscountAmount);

        const fEstimatedTotal = fTotalPrice - fClientDiscountAmount;
        oCartModel.setProperty("/estimatedTotal", parseFloat(fEstimatedTotal.toFixed(2)));

        oCartModel.refresh(true);
    }

    public static submitOrder(oView: View, oODataModel: ODataModel, oCartModel: JSONModel): void {
        interface CartItem {
            id: string;
            quantity: number | string;
        }

        const aCartItems = (oCartModel.getProperty("/items") as CartItem[]) || [];
        const oBundle = (sap.ui.getCore().getModel("i18n") as any)?.getResourceBundle();

        if (aCartItems.length === 0) {
            MessageBox.error(oBundle?.getText("cartManager.message.cartEmpty") || "...");
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

        const oOrderPayload = {
            currency_code: "USD",
            customer_ID: oUserData && oUserData.id ? oUserData.id : null,
            items: aCartItems.map((oItem: CartItem) => ({
                game_ID: oItem.id,
                quantity: typeof oItem.quantity === "string" ? parseInt(oItem.quantity, 10) : oItem.quantity || 1
            }))
        };

        oView.setBusy(true);
        CartManager._createOrderDraft(oView, oODataModel, oCartModel, oOrderPayload);
    }

    private static _createOrderDraft(oView: View, oODataModel: ODataModel, oCartModel: JSONModel, oOrderPayload: any): void {
        const oOrdersListBinding = oODataModel.bindList("/Orders");

        const oOrderContext = oOrdersListBinding.create(oOrderPayload, false);
        const oBundle = (sap.ui.getCore().getModel("i18n") as any)?.getResourceBundle();

        if (!oOrderContext) {
            oView.setBusy(false);
            MessageBox.error(oBundle?.getText("cartManager.message.draftContextError") || "Failed to initialize OData context for the new order draft.");
            return;
        }

        const oCreatedPromise = oOrderContext.created();

        if (oCreatedPromise) {
            oCreatedPromise.then(() => {
                CartManager._activateOrderDraft(oView, oODataModel, oCartModel, oOrderContext);
            }).catch((oError: any) => {
                oView.setBusy(false);
                if (oODataModel.hasPendingChanges()) {
                    oODataModel.resetChanges();
                }
                MessageBox.error(oError?.message || oBundle?.getText("cartManager.message.draftSubmitError") || "Failed to submit draft order due to database constraints.");
            });
        } else {
            oView.setBusy(false);
            MessageBox.error(oBundle?.getText("cartManager.message.pipelineError") || "OData creation pipeline failed to respond.");
        }
    }

    private static async _activateOrderDraft(oView: View, oODataModel: ODataModel, oCartModel: JSONModel, oOrderContext: any): Promise<void> {
        interface BackendOrderResponse {
            netAmount?: number;
        }

        const oBundle = (sap.ui.getCore().getModel("i18n") as any)?.getResourceBundle();

        try {

            const oOperation = oODataModel.bindContext(`${oOrderContext.getPath()}/SalesOrderService.draftActivate(...)`);
            await oOperation.execute();

            oView.setBusy(false);

            if (typeof oOrderContext.destroy === "function") {
                oOrderContext.destroy();
            }

            oCartModel.setProperty("/items", []);
            oCartModel.setProperty("/totalItems", 0);
            oCartModel.setProperty("/clientDiscount", 0.00);
            oCartModel.setProperty("/totalPrice", 0.00);
            oCartModel.setProperty("/estimatedTotal", 0.00);
            oCartModel.updateBindings(true);

            MessageBox.success(oBundle?.getText("cartManager.message.activationSuccess") || "Order has been successfully submitted!", {
                actions: [MessageBox.Action.OK],
                onClose: () => {
                    const oController = oView.getController();
                    if (oController) {
                        NavigationManager.navTo(oController, "OrdersList", {});
                    }
                }
            });

        } catch (oError: any) {
            oView.setBusy(false);
            if (oODataModel.hasPendingChanges()) {
                oODataModel.resetChanges();
            }
            MessageBox.error(oError?.message || oBundle?.getText("cartManager.message.activationError") || "Error during order draft activation.");
        }
    }
    public static async validateBulkEligibility(oView: View, oODataModel: any): Promise<void> {
        if (!oView || !oODataModel) return;

        const sSavedUserJson = window.localStorage.getItem("catConnect_userProfile");
        if (!sSavedUserJson) return;

        let oUserData: {
            id?: string;
            isBulkAvailable?: boolean;
            averageRating?: string | number;
            bulkDiscountPercent?: number;
            bulkMinQuantity?: number;
        } = {};

        try {
            oUserData = JSON.parse(sSavedUserJson);
        } catch (e) {
            return;
        }

        if (!oUserData.id) return;

        oView.setBusy(true);

        try {
            const oOperation = oODataModel.bindContext("/SalesOrderService.getCartEligibilities(...)");
            oOperation.setParameter("customer_ID", oUserData.id);
            await oOperation.execute();


            const oResultContext = oOperation.getBoundContext();
            const oResponseData = oResultContext ? oResultContext.getObject() as {
                isBulkAvailable: boolean;
                averageRating: number;
                bulkDiscountPercent: number;
                bulkMinQuantity: number;
            } : null;

            if (oResponseData) {
                oUserData.isBulkAvailable = oResponseData.isBulkAvailable === true;
                oUserData.averageRating = oResponseData.averageRating;
                oUserData.bulkDiscountPercent = oResponseData.bulkDiscountPercent;
                oUserData.bulkMinQuantity = oResponseData.bulkMinQuantity;

                window.localStorage.setItem("catConnect_userProfile", JSON.stringify(oUserData));
            }
        } catch (oError: any) {
            console.error("Pre-Fetch Pipeline Failure: ", oError?.message || oError);
            oUserData.isBulkAvailable = false;
            oUserData.bulkDiscountPercent = 0.10;
            oUserData.bulkMinQuantity = 10;
            window.localStorage.setItem("catConnect_userProfile", JSON.stringify(oUserData));
        } finally {
            oView.setBusy(false);
        }
    }

    private static _calculateClientDiscount(fTotalPrice: number, iTotalItems: number): number {
        const sSavedUserJson = window.localStorage.getItem("catConnect_userProfile");
        let fBaseDiscountPercent = 0;
        let fBulkDiscountPercent = 0;

        if (sSavedUserJson) {
            try {
                const oUserData = JSON.parse(sSavedUserJson);
                if (oUserData) {

                    if (oUserData.averageRating) {
                        const fRatingValue = parseFloat(oUserData.averageRating);
                        if (!isNaN(fRatingValue)) {
                            fBaseDiscountPercent = fRatingValue / 100;
                        }
                    }

                    const iMinQtyThreshold = typeof oUserData.bulkMinQuantity === "number" ? oUserData.bulkMinQuantity : 10;
                    const fConfiguredBulkPercent = typeof oUserData.bulkDiscountPercent === "number" ? oUserData.bulkDiscountPercent : 0.10;

                    if (iTotalItems >= iMinQtyThreshold && oUserData.isBulkAvailable === true) {
                        fBulkDiscountPercent = fConfiguredBulkPercent;
                    }
                }
            } catch (e) {
                console.error("Failed to parse user profile for dynamic discounts calculation");
            }
        }

        const fTotalDiscountPercent = fBaseDiscountPercent + fBulkDiscountPercent;

        const fCalculatedDiscountAmount = fTotalPrice * fTotalDiscountPercent;

        return parseFloat(fCalculatedDiscountAmount.toFixed(2));
    }

}
