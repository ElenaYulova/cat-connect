import Controller from "sap/ui/core/mvc/Controller";
import UIComponent from "sap/ui/core/UIComponent";
import History from "sap/ui/core/routing/History";
import Table from "sap/m/Table";
import Filter from "sap/ui/model/Filter";
import FilterOperator from "sap/ui/model/FilterOperator";
import SearchField from "sap/m/SearchField";
import Select from "sap/m/Select";
import Sorter from "sap/ui/model/Sorter";
import DateRangeSelection from "sap/m/DateRangeSelection";
import ODataListBinding from "sap/ui/model/odata/v4/ODataListBinding";
import { ValueState } from "sap/ui/core/library";
import ColumnListItem from "sap/m/ColumnListItem";
import NavigationManager from "../utils/NavigationManager";


/**
 * @namespace sap.capire.gameshop.controller
 */
export default class OrdersList extends Controller {

    /**
     * Forcibly triggers OData v4 model context synchronization reload
     */
    public onRefreshOrders(): void {
        const oTable = this.byId("ordersTable") as Table | undefined;
        const oBinding = oTable?.getBinding("items") as ODataListBinding | undefined;
        if (oBinding) {
            oBinding.refresh();
        }
    }

    /**
     * Formatter to convert technical state codes into user-friendly localized names
     */
    public formatStatusText(sStatusCode: string): string {
        switch (sStatusCode) {
            case "N": return "New Request";
            case "P": return "In Progress";
            case "C": return "Completed";
            case "X": return "Cancelled";
            case "R": return "Refunded";
            default:  return sStatusCode || "Pending";
        }
    }

    /**
     * Formatter to map enterprise state codes to UI ValueState palettes
     */
    public formatStatusState(sStatusCode: string): ValueState {
        switch (sStatusCode) {
            case "N": return ValueState.Information;
            case "P": return ValueState.Warning;
            case "C": return ValueState.Success;
            case "X": return ValueState.Error;
            case "R": return ValueState.Error;
            default:  return ValueState.None;
        }
    }

    /**
     * Resets all filter components back to default factory states
     */

    public onApplyFilters(): void {
        const oTable = this.byId("ordersTable") as Table | undefined;
        const oBinding = oTable?.getBinding("items") as ODataListBinding | undefined;
        if (!oBinding) return;

        const aFilters: Filter[] = [];

        // Filter by Order Number OR Customer Name
        const oSearchField = this.byId("filterOrderNumber") as SearchField | undefined;
        const sSearchValue = oSearchField?.getValue()?.trim();
        if (sSearchValue) {
            aFilters.push(new Filter({
                filters: [
                    new Filter("orderNumber", FilterOperator.Contains, sSearchValue),
                    new Filter("customer/name", FilterOperator.Contains, sSearchValue)
                ],
                and: false
            }));
        }


        // Filter by Status Code
        const oSelect = this.byId("filterStatus") as Select | undefined;
        const sStatusKey = oSelect?.getSelectedKey();
        if (sStatusKey && sStatusKey !== "ALL") {
            aFilters.push(new Filter("status_code", FilterOperator.EQ, sStatusKey));
        }

        // Filter by Date Range Selection
        const oDateRange = this.byId("filterDateRange") as DateRangeSelection | undefined;
        const oFromDate = oDateRange?.getDateValue();
        const oToDate = oDateRange?.getSecondDateValue();

        if (oFromDate && oToDate) {

            const oToDateEnd = new Date(oToDate);
            oToDateEnd.setHours(23, 59, 59, 999);

            aFilters.push(new Filter("createdAt", FilterOperator.BT, oFromDate.toISOString(), oToDateEnd.toISOString()));
        }

        oBinding.filter(aFilters);
    }

    /**
     * Resets all filter components back to default factory states
     */
    public onResetFilters(): void {
        const oSearchField = this.byId("filterOrderNumber") as SearchField | undefined;
        const oSelect = this.byId("filterStatus") as Select | undefined;
        const oDateRange = this.byId("filterDateRange") as DateRangeSelection | undefined;

        if (oSearchField) oSearchField.setValue("");
        if (oSelect) oSelect.setSelectedKey("ALL");
        if (oDateRange) oDateRange.setValue("");

        this.onApplyFilters();
    }

    private _bSortOrderDescending: boolean = false;
    private _bSortAmountDescending: boolean = false;
    private _bSortDateDescending: boolean = false;
    private _bSortStatusDescending: boolean = false;

    /**
     * Sorters
     */
    public onSortOrderNumber(): void {
        const oTable = this.byId("ordersTable") as Table | undefined;
        const oBinding = oTable?.getBinding("items") as ODataListBinding | undefined;
        if (oBinding) {
            this._bSortOrderDescending = !this._bSortOrderDescending;
            const oSorter = new Sorter("orderNumber", this._bSortOrderDescending);
            oBinding.sort(oSorter);
        }
    }

    public onSortTotalAmount(): void {
        const oTable = this.byId("ordersTable") as Table | undefined;
        const oBinding = oTable?.getBinding("items") as ODataListBinding | undefined;
        if (oBinding) {
            this._bSortAmountDescending = !this._bSortAmountDescending;
            const oSorter = new Sorter("totalAmount", this._bSortAmountDescending);
            oBinding.sort(oSorter);
        }
    }

    public onSortCreatedAt(): void {
        const oTable = this.byId("ordersTable") as Table | undefined;
        const oBinding = oTable?.getBinding("items") as ODataListBinding | undefined;
        if (oBinding) {
            this._bSortDateDescending = !this._bSortDateDescending;
            const oSorter = new Sorter("createdAt", this._bSortDateDescending);
            oBinding.sort(oSorter);
        }
    }

    public onSortStatus(): void {
        const oTable = this.byId("ordersTable") as Table | undefined;
        const oBinding = oTable?.getBinding("items") as ODataListBinding | undefined;
        if (oBinding) {
            this._bSortStatusDescending = !this._bSortStatusDescending;
            const oSorter = new Sorter("status_code", this._bSortStatusDescending);
            oBinding.sort(oSorter);
        }
    }
    public onNavBack(): void {
        NavigationManager.navBack(this, "SalesOrder");
    }

     public onOrderDetailsPress(oEvent: any): void {
        const oItem = oEvent.getSource() as ColumnListItem;
        const oBindingContext = oItem.getBindingContext();
        if (!oBindingContext) return;
        const sOrderId = oBindingContext.getProperty("ID") as string;

        NavigationManager.navTo(this, "OrderDetails", { orderId: sOrderId });
    }
}
