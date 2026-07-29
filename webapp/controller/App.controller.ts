import Controller from "sap/ui/core/mvc/Controller";
import UIComponent from "sap/ui/core/UIComponent";
import Event from "sap/ui/base/Event";
import JSONModel from "sap/ui/model/json/JSONModel";
import MessageBox from "sap/m/MessageBox";

export default class App extends Controller {

    // Cross-cutting Cart
    public onNavToCart(): void {
        UIComponent.getRouterFor(this).navTo("Cart");
    }

    // Login handler
        public onLoginPress(): void {
        const oRoleModel = this.getView()?.getModel("userRoles") as JSONModel;
        if (!oRoleModel) return;

        const VALID_ROLES = ["Customer", "SalesManager", "Supplier", "CRMAdmin"];


        const oBackendResponse = {
            username: "Administrator",
            roles: ["CRMAdmin", "Hacker"] // TODO: Clear test data
        };

        const oUserProfile: Record<string, any> = {
            isLoggedIn: true,
            username: oBackendResponse.username,
            welcomeText: `Welcome, ${oBackendResponse.username}!`,
            isCustomer: false,
            isSalesManager: false,
            isSupplier: false,
            isCRMAdmin: false
        };

        // Roles validation
        oBackendResponse.roles.forEach((sRole: string) => {
            if (VALID_ROLES.includes(sRole)) {
                oUserProfile[`is${sRole}`] = true;
            } else {
                console.warn(`[SECURITY WARN]: Ignored undefined or untrusted role context: "${sRole}"`);
            }
        });

        window.localStorage.setItem("catConnect_userProfile", JSON.stringify(oUserProfile));

        oRoleModel.setData(oUserProfile, false);

        MessageBox.success(`Welcome back, ${oUserProfile.username}!`);
    }

}
