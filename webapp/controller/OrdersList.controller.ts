import Controller from "sap/ui/core/mvc/Controller";
import Table from "sap/m/Table";
import Sorter from "sap/ui/model/Sorter";
import ODataListBinding from "sap/ui/model/odata/v4/ODataListBinding";
import ColumnListItem from "sap/m/ColumnListItem";
import SearchField from "sap/m/SearchField";
import Select from "sap/m/Select";
import DateRangeSelection from "sap/m/DateRangeSelection";
import Filters from "../utils/Filters";
import NavigationManager from "../utils/NavigationManager";
import Formatter from "../model/formatter";

/**
 * @namespace sap.capire.gameshop.controller
 */
export default class OrdersList extends Controller {

    public formatter: typeof Formatter = Formatter;

    public onInit(): void {

        const oRouter = (this.getOwnerComponent() as any).getRouter();

        oRouter.getRoute("OrdersList")?.attachPatternMatched(this._onRouteMatched, this);
    }

    private _onRouteMatched(): void {
        this.onRefreshOrders();
    }

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

    public onApplyFilters(): void {
        Filters.executeOrdersListFiltration(this);
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
