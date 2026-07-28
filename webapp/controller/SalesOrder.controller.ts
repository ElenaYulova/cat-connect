import Controller from "sap/ui/core/mvc/Controller";
import Control from "sap/ui/core/Control";
import Filter from "sap/ui/model/Filter";
import FilterOperator from "sap/ui/model/FilterOperator";
import ODataListBinding from "sap/ui/model/odata/v4/ODataListBinding";
import UIComponent from "sap/ui/core/UIComponent";
import { SearchField$SearchEvent } from "sap/m/SearchField";
import Event from "sap/ui/base/Event";
import ColumnListItem from "sap/m/ColumnListItem";
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
    public onNavToGenericDetails(oEvent: Event): void {
        const oControl = oEvent.getSource() as ColumnListItem;
        const sTargetRoute = oControl.data("targetRoute") as string;
        const oCtx = oControl.getBindingContext();
        if (!sTargetRoute) {
            console.error("Architectural error: customData:targetRoute was forgotten in the fragment!");
            return;
        }

        if (oCtx) {
            const sEntityId = oCtx.getProperty("ID") as string;
            const sPath = oCtx.getPath(); // Returns "/Item(UUID)"

            const sCleanPath = sPath.startsWith("/") ? sPath.substring(1) : sPath;
            const sEntityName = sCleanPath.split("(")[0];

            const oRouteParams: Record<string, string> = {};
            const sParamName = sEntityName.toLowerCase().replace(/s$/, "") + "Id";
            oRouteParams[sParamName] = sEntityId;

            const oRouter = UIComponent.getRouterFor(this);
            oRouter.navTo(sTargetRoute, oRouteParams);
        }
    }
}
