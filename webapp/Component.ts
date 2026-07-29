import UIComponent from "sap/ui/core/UIComponent";
import JSONModel from "sap/ui/model/json/JSONModel";

/**
 * @namespace sap.capire.gameshop
 */
export default class Component extends UIComponent {

    public static metadata = {
        manifest: "json"
    };

    public init(): void {
        super.init();

        this.getRouter().initialize();

        // Cross-cutting Cart

        const oCartModel = new JSONModel({
            items: [],
            totalItems: 0,
            totalPrice: 0.00
        });
        this.setModel(oCartModel, "cart");

        // Global Role model

        const sSavedUserJson = window.localStorage.getItem("catConnect_userProfile");
        let oUserData;

        if (sSavedUserJson) {
            try {
                oUserData = JSON.parse(sSavedUserJson);
            } catch (e) {
                oUserData = null;
            }
        }

        const oRoleModel = new JSONModel({
            isLoggedIn: !!oUserData,
            username: oUserData ? oUserData.username : "Guest",
            welcomeText: oUserData ? `Welcome, ${oUserData.username}!` : "Welcome, Guest!",
            isCRMAdmin: oUserData ? !!oUserData.isCRMAdmin : false,
            isSupplier: oUserData ? !!oUserData.isSupplier : false
        });
        
        this.setModel(oRoleModel, "userRoles");
    }
}
