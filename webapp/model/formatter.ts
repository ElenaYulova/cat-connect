import JSONModel from "sap/ui/model/json/JSONModel";
import Control from "sap/ui/core/Control";
import Component from "sap/ui/core/Component";
import { ValueState } from "sap/ui/core/library";

/**
 * @namespace sap.capire.gameshop.model
 */
export default class Formatter {
    public static formatStock( iStock: number | undefined | null): string {
        const oResourceBundle = (sap.ui.getCore().getModel("i18n") as any)?.getResourceBundle();
        if ( iStock === undefined || iStock === null) return oResourceBundle?.getText("formatter.stock.noData") || "No data";
        return iStock > 0 ? iStock. toString() : oResourceBundle?.getText("formatter.stock.outOfStock") || "Out of stock";
    }

    public static formatStockVisible(iStock: number | undefined | null): boolean {
        return typeof iStock === "number" && iStock > 0;
    }

    public static formatOutOfStockVisible(iStock: number | undefined | null): boolean {
        return iStock === undefined || iStock === null || iStock <= 0;
    }

    public static isFieldVisibleInReadMode(this: any, bEditMode: boolean): boolean {
        const oControl = this as Control;
        if (!oControl || typeof oControl.getModel !== "function") return false;

        const oComponent = Component.getOwnerComponentFor(oControl);
        const oRolesModel = (oComponent ? oComponent.getModel("userRoles") : null) as JSONModel | null;
        if (!oRolesModel) return false;

        const bIsCRMAdmin = oRolesModel.getProperty("/isCRMAdmin") as boolean;
        const bIsSupplier = oRolesModel.getProperty("/isSupplier") as boolean;

        return (bIsCRMAdmin || bIsSupplier) && !bEditMode;
    }

    public static isFieldVisibleInEditMode(this: any, bEditMode: boolean): boolean {
        const oControl = this as Control;
        if (!oControl || typeof oControl.getModel !== "function") return false;

        const oComponent = Component.getOwnerComponentFor(oControl);
        const oRolesModel = (oComponent ? oComponent.getModel("userRoles") : null) as JSONModel | null;
        if (!oRolesModel) return false;

        const bIsCRMAdmin = oRolesModel.getProperty("/isCRMAdmin") as boolean;
        const bIsSupplier = oRolesModel.getProperty("/isSupplier") as boolean;

        return (bIsCRMAdmin || bIsSupplier) && bEditMode;
    }

    public static onPriceLiveChange(oEvent: any): void {
        const oInput = oEvent.getSource();
        if (!oInput) return;
        let sValue = oInput.getValue() as string;
        let sCleaned = sValue.replace(/,/g, ".").replace(/\s/g, "").replace(/[^\d.]/g, "");
        if (sValue !== sCleaned) oInput.setValue(sCleaned);
    }

    public static onStockLiveChange(oEvent: any): void {
        const oInput = oEvent.getSource();
        if (!oInput) return;
        let sValue = oInput.getValue() as string;
        let sCleaned = sValue.replace(/\s/g, "").replace(/[^\d]/g, "");
        if (sValue !== sCleaned) oInput.setValue(sCleaned);
    }

    public static formatAddToCartEnabled(bIsLoggedIn: boolean, iCurrentQuantity: number, iStock: number): boolean {
        if (!bIsLoggedIn) return false;
        const iQty = Number(iCurrentQuantity) || 0;
        const iAvailable = Number(iStock) || 0;
        return iQty > 0 && iQty <= iAvailable;
    }

    /**
     * Localized state text mapper
     */
    public static orderStatusText( sStatusCode: string): string {
    const oResourceBundle = (sap.ui.getCore().getModel("i18n") as any)?.getResourceBundle();
        switch ( sStatusCode) {
            case "new":
            case "N": return oResourceBundle?.getText("formatter.orderStatus.new") || "New Request";
            case "in_process":
            case "P": return oResourceBundle?.getText("formatter.orderStatus.inProgress") || "In Progress";
            case "completed":
            case "C": return oResourceBundle?.getText("formatter.orderStatus.completed") || "Completed";
            case "cancelled":
            case "X": return oResourceBundle?.getText("formatter.orderStatus.cancelled") || "Cancelled";
            default: return sStatusCode || oResourceBundle?.getText("formatter.orderStatus.pending") || "Pending";
        }
    }

    public static orderStatusState(sStatusCode: string): ValueState {
        switch (sStatusCode) {
            case "new":
            case "N": return ValueState.Information;
            case "in_process":
            case "P": return ValueState.Warning;
            case "completed":
            case "C": return ValueState.Success;
            case "cancelled":
            case "X": return ValueState.Error;
            default:   return ValueState.None;
        }
    }

    /**
     * Formatter to safely merge customer first and last names
     */
    public static formatCustomerFullName( sFirstName: string | undefined | null, sLastName: string | undefined | null): string {
    const sFirst = sFirstName || "";
    const sLast = sLastName || "";
    const sFullName = `${ sFirst} ${ sLast}`. trim();
    if (!sFullName) {
        const oResourceBundle = (sap.ui.getCore().getModel("i18n") as any)?.getResourceBundle();
        return oResourceBundle?.getText("formatter.customer.anonymous") || "Anonymous Customer";
    }
    return sFullName;
}
}
