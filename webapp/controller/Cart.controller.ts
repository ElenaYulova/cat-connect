import Controller from "sap/ui/core/mvc/Controller";
import History from "sap/ui/core/routing/History";
import JSONModel from "sap/ui/model/json/JSONModel";
import CartManager from "../utils/CartManager";

export default class Cart extends Controller {

    public onInit(): void {

    }

    public onNavBack(): void {
        const oHistory = History.getInstance();
        const sPreviousHash = oHistory.getPreviousHash();

        if (sPreviousHash !== undefined) {
            window.history.go(-1);
        } else {
            const oRouter = (this.getOwnerComponent() as any).getRouter();
            oRouter.navTo("SalesOrder", {}, true);
        }
    }

    public onQuantityChange(oEvent: any): void {
        const oStepInput = oEvent.getSource();
        const iNewValue = oStepInput.getValue();
        const oContext = oStepInput.getParent().getBindingContext("cart");
        if (!oContext) return;

        const sId = oContext.getProperty("id");
        const oCartModel = this.getView()?.getModel("cart") as JSONModel;

        CartManager.updateQuantity(oCartModel, sId, iNewValue);
    }

    public onRemoveItem(oEvent: any): void {
        const oContext = oEvent.getSource().getParent().getBindingContext("cart");
        if (!oContext) return;

        const sId = oContext.getProperty("id");
        const oCartModel = this.getView()?.getModel("cart") as JSONModel;

        CartManager.removeFromCart(oCartModel, sId);
    }

    public onSubmitOrder(): void {

    }
}
