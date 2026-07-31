import Controller from "sap/ui/core/mvc/Controller";
import History from "sap/ui/core/routing/History";
import JSONModel from "sap/ui/model/json/JSONModel";
import UIComponent from "sap/ui/core/UIComponent";
import CartManager from "../utils/CartManager";

export default class Cart extends Controller {

    public onInit(): void {
        const oOwnerComponent = this.getOwnerComponent() as UIComponent | undefined;
        oOwnerComponent?.getRouter().getRoute("Cart")?.attachPatternMatched(this._onCartMatched, this);
    }

    private _onCartMatched(): void {
        const oCartModel = this.getView()?.getModel("cart") as JSONModel | undefined;
        if (oCartModel) {
            CartManager.triggerRefresh(oCartModel);
        }
    }

    public onNavBack(): void {
        const oHistory = History.getInstance();
        if (oHistory.getPreviousHash() !== undefined) {
            window.history.go(-1);
        } else {
            UIComponent.getRouterFor(this).navTo("SalesOrder", {}, true);
        }
    }

    public onQuantityChange(oEvent: any): void {
        const oStepInput = oEvent.getSource();
        const iNewValue = oStepInput.getValue();
        const oContext = oStepInput.getParent().getBindingContext("cart");
        if (!oContext) return;

        CartManager.updateQuantity(this.getView()?.getModel("cart") as JSONModel, oContext.getProperty("id"), iNewValue);
    }

    public onRemoveItem(oEvent: any): void {
        const oContext = oEvent.getSource().getParent().getBindingContext("cart");
        if (oContext) {
            CartManager.removeFromCart(this.getView()?.getModel("cart") as JSONModel, oContext.getProperty("id"));
        }
    }

    public onSubmitOrder(): void {
        const oView = this.getView();
        const oCartModel = oView?.getModel("cart") as JSONModel | undefined;
        const oODataModel = oView?.getModel() as any;

        if (oView && oCartModel && oODataModel) {
            CartManager.submitOrder(oView, oODataModel, oCartModel);
        }
    }
}
