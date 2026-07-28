import Controller from "sap/ui/core/mvc/Controller";
import Control from "sap/ui/core/Control";
import Filter from "sap/ui/model/Filter";
import FilterOperator from "sap/ui/model/FilterOperator";
import ODataListBinding from "sap/ui/model/odata/v4/ODataListBinding";
import UIComponent from "sap/ui/core/UIComponent";
import { SearchField$SearchEvent } from "sap/m/SearchField";

/**
 * @namespace sap.capire.gameshop.controller
 */
export default class SalesOrder extends Controller {

    public onInit(): void {

    }

    /**
     * Game filtration
     */
    public onSearch(oEvent: SearchField$SearchEvent): void {
        const sQuery = oEvent.getParameter("query") || "";
        const aFilters: Filter[] = [];

        if (sQuery) {
            aFilters.push(new Filter("title", FilterOperator.Contains, sQuery));
        }

        const oTable = this.byId("gamesTable") as Control;
        const oBinding = oTable.getBinding("items") as ODataListBinding;

        if (oBinding) {
            oBinding.filter(aFilters);
        }
    }

    /**
     * Navigation method
     */
    public onNavToDetails(oEvent: any): void {
        const oItem = oEvent.getSource() as Control;
        const oCtx = oItem.getBindingContext();

        if (oCtx) {
            const sGameId = oCtx.getProperty("ID") as string;

            const oOwnerComponent = this.getOwnerComponent() as UIComponent;
            if (oOwnerComponent) {
                oOwnerComponent.getRouter().navTo("gameDetails", {
                    gameId: sGameId
                });
            }
        }
    }
}
