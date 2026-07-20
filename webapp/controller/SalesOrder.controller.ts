import Controller from "sap/ui/core/mvc/Controller";
import formatter from "../model/formatter";

/**
 * @namespace sap.capire.gameshop.controller
 */
export default class SalesOrder extends Controller {
    public formatter = formatter;

    public onInit(): void {
        console.log("Controller SalesOrder successfully initialized!");
        
        // Test for colors
        const oComponent = this.getOwnerComponent();
        if (oComponent) {
            const oUiModel = oComponent.getModel("ui") as any;
            if (oUiModel) {
                oUiModel.setProperty("/orderCriticality", 2);
            }
        }
    }

    public onTabSelect(oEvent: any): void {
        const sSelectedKey = oEvent.getParameter("key");
        console.log(`Selected tab: ${sSelectedKey}`);
    }
}
