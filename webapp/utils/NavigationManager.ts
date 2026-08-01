import UIComponent from "sap/ui/core/UIComponent";
import History from "sap/ui/core/routing/History";
import Controller from "sap/ui/core/mvc/Controller";
import Event from "sap/ui/base/Event";
import Image from "sap/m/Image";

export default class NavigationManager {

    /**
     * Standard back navigation handler returning user back to the previous view state safely
     */
    public static navBack(oController: Controller, sDefaultRoute: string = "SalesOrder"): void {
        const oHistory = History.getInstance();
        const sPreviousHash = oHistory.getPreviousHash();

        if (sPreviousHash !== undefined) {
            window.history.go(-1);
        } else {
            const oOwnerComponent = oController.getOwnerComponent() as UIComponent | undefined;
            oOwnerComponent?.getRouter().navTo(sDefaultRoute, {}, true);
        }
    }

    /**
     * Triggers forward routing navigation to a specified target route with parameters
     */
    public static navTo(oController: Controller, sRouteName: string, oParameters: object = {}): void {
        const oOwnerComponent = oController.getOwnerComponent() as UIComponent | undefined;
        oOwnerComponent?.getRouter().navTo(sRouteName, oParameters);
    }

    public static navToGenericDetails(oController: Controller, oEvent: Event, sDefaultRoute: string = "ProductDetails"): void {
        const oControl = oEvent.getSource() as any;
        if (!oControl) return;

        const sTargetRoute = (oControl.data("targetRoute") as string) || sDefaultRoute;
        const oCtx = oControl.getBindingContext();

        if (oCtx) {
            const sEntityId = oCtx.getProperty("ID") as string;
            const sPath = oCtx.getPath();

            const sCleanPath = sPath.startsWith("/") ? sPath.substring(1) : sPath;
            const sEntityName = sCleanPath.split("(")[0];

            const oRouteParams: Record<string, string> = {};
            const sParamName = sEntityName.toLowerCase().replace(/s$/, "") + "Id";
            oRouteParams[sParamName] = sEntityId;

            this.navTo(oController, sTargetRoute, oRouteParams);
        }
    }

    public static onImageLoadError(oEvent: Event): void {
        const oImageCtrl = oEvent.getSource() as Image;
        if (oImageCtrl) {
            oImageCtrl.setSrc("./assets/img/logo.png");
        }
    }
}
