import Controller from "sap/ui/core/mvc/Controller";
import UIComponent from "sap/ui/core/UIComponent";
import JSONModel from "sap/ui/model/json/JSONModel";
import ODataModel from "sap/ui/model/odata/v4/ODataModel";
import View from "sap/ui/core/mvc/View";
import LoginManager from "../utils/LoginManager";
import NavigationManager from "../utils/NavigationManager";

/**
 * @namespace sap.capire.gameshop.controller
 */
export default class App extends Controller {

    public onInit(): void {
        const oView: View | undefined = this.getView();
        if (!oView) return;

        const oODataModel = oView.getModel() as ODataModel | undefined;
        const oRoleModel = oView.getModel("userRoles") as JSONModel | undefined;

        // Метод больше не возвращает промис (void), убран ложный .catch()
        if (oODataModel && oRoleModel) {
            LoginManager.checkSilentLogin(oView, oODataModel, oRoleModel);
        }
    }

    public onNavToHome(): void {
        NavigationManager.navTo(this, "SalesOrder");
    }

    public onNavToOrders(): void {
        NavigationManager.navTo(this, "OrdersList");
    }

    public onNavToCart(): void {
        NavigationManager.navTo(this, "Cart");
    }

    public onLoginPress(): void {
        const oView: View | undefined = this.getView();
        const oODataModel = oView?.getModel() as ODataModel | undefined;
        const oRoleModel = oView?.getModel("userRoles") as JSONModel | undefined;

        if (oView && oODataModel && oRoleModel) {
            LoginManager.runLoginDialog(oView, oODataModel, oRoleModel);
        }
    }
}
