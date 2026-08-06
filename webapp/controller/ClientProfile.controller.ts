import Controller from "sap/ui/core/mvc/Controller";
import JSONModel from "sap/ui/model/json/JSONModel";
import UIComponent from "sap/ui/core/UIComponent";
import { Route$PatternMatchedEvent } from "sap/ui/core/routing/Route";
import NavigationManager from "../utils/NavigationManager";
import CustomerManager from "../utils/CustomerManager";
import MessageBox from "sap/m/MessageBox";
import Context from "sap/ui/model/odata/v4/Context";

/**
 * @namespace sap.capire.gameshop.controller
 */
export default class ClientProfile extends Controller {
    public onInit(): void {
        const oOwnerComponent = this.getOwnerComponent() as UIComponent | undefined;

        oOwnerComponent?.getRouter().getRoute("ClientProfile")?.attachPatternMatched(this._onProfileMatched, this);

        const oLocalModel = new JSONModel({ isEditMode: false });
        this.getView()?.setModel(oLocalModel, "localView");
    }

    public onNavBack(): void {
        NavigationManager.navBack(this, "SalesOrder");
    }

    private async _onProfileMatched(oEvent: Route$PatternMatchedEvent): Promise<void> {
        const oView = this.getView();
        if (!oView) return;

        try {
            oView.setBusy(true);
            await CustomerManager.bindProfileView(oView, () => this.onNavBack());
        } catch (oError: any) {
            const oResourceBundle = (this.getOwnerComponent()?.getModel("i18n") as any)?.getResourceBundle();
            MessageBox.error(oResourceBundle?.getText("clientProfile.message.initFailed", [oError.message]) || `Profile initialization failed: ${oError.message}`);
        } finally {
            oView.setBusy(false);
        }
    }

    public onEditPress(): void {
    const oLocalModel = this.getView()?.getModel("localView") as JSONModel | undefined;
    oLocalModel?.setProperty("/isEditMode", true);
}

    public onCancelPress(): void {
        const oView = this.getView();
        const oLocalModel = oView?.getModel("localView") as JSONModel | undefined;

        oLocalModel?.setProperty("/isEditMode", false);

        const oBindingContext = oView?.getBindingContext() as Context | undefined;
        if (oBindingContext?.getBinding().hasPendingChanges()) {
            oBindingContext.getBinding().resetChanges();
        }
    }
}
