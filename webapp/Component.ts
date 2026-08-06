import UIComponent from "sap/ui/core/UIComponent";
import JSONModel from "sap/ui/model/json/JSONModel";
import ResourceModel from "sap/ui/model/resource/ResourceModel";
import ResourceBundle from "sap/base/i18n/ResourceBundle";

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

        const oResourceModel = this.getModel("i18n") as ResourceModel;
        const oResourceBundle = oResourceModel.getResourceBundle() as ResourceBundle;

        const oRoleModel = new JSONModel({
            isLoggedIn: !!oUserData,
            username: oUserData ? oUserData.username : "Guest",
            welcomeText: oUserData  ? oResourceBundle.getText("app.welcome.user", [oUserData.username])
        : oResourceBundle.getText("app.welcome.guest"),
            isCRMAdmin: oUserData ? !!oUserData.isCRMAdmin : false,
            isSupplier: oUserData ? !!oUserData.isSupplier : false
        });

        this.setModel(oRoleModel, "userRoles");
    }
}
