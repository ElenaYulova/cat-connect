import JSONModel from "sap/ui/model/json/JSONModel";
import Control from "sap/ui/core/Control";
import Component from "sap/ui/core/Component";

type ValueState = "Success" | "Warning" | "Error" | "None";

/**
 * @namespace sap.capire.gameshop.model
 */
export default class Formatter {

    public static statusState(iCriticality: number): ValueState {
        switch (iCriticality) {
            case 3: return "Success";
            case 2: return "Warning";
            case 1: return "Error";
            default: return "None";
        }
    }

    public static statusIcon(iCriticality: number): string {
        switch (iCriticality) {
            case 3: return "sap-icon://sys-enter-2";
            case 2: return "sap-icon://status-in-process";
            case 1: return "sap-icon://error";
            default: return "sap-icon://document";
        }
    }

    public static formatStock(iStock: number | undefined | null): string {
        if (iStock === undefined || iStock === null) return "No data";
        return iStock > 0 ? iStock.toString() : "Out of stock";
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

        if (sValue !== sCleaned) {
            oInput.setValue(sCleaned);
        }
    }

    public static onStockLiveChange(oEvent: any): void {
        const oInput = oEvent.getSource();
        if (!oInput) return;

        let sValue = oInput.getValue() as string;
        let sCleaned = sValue.replace(/\s/g, "").replace(/[^\d]/g, "");
        if (sValue !== sCleaned) {
            oInput.setValue(sCleaned);
        }
    }
}
