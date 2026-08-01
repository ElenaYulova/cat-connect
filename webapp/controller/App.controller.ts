import Controller from "sap/ui/core/mvc/Controller";
import UIComponent from "sap/ui/core/UIComponent";
import JSONModel from "sap/ui/model/json/JSONModel";
import ODataModel from "sap/ui/model/odata/v4/ODataModel";
import View from "sap/ui/core/mvc/View";
import LoginManager from "../utils/LoginManager";
import NavigationManager from "../utils/NavigationManager";


export default class App extends Controller {

    public onInit(): void {
        const oView: View | undefined = this.getView();
        if (!oView) return;

        const sSavedUserJson: string | null = window.localStorage.getItem("catConnect_userProfile");
        if (sSavedUserJson) {
            try {
                const oUserProfile = JSON.parse(sSavedUserJson);
                if (oUserProfile && oUserProfile.isLoggedIn) {
                    const oRoleModel = oView.getModel("userRoles") as JSONModel | undefined;
                    if (oRoleModel) {
                        oRoleModel.setData(oUserProfile, false);
                    }
                }
            } catch (e) {
                console.error("Failed to restore user profile session from localStorage.");
            }
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
