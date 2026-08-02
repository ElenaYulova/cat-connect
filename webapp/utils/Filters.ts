import Item from "sap/ui/core/Item";
import ComboBox from "sap/m/ComboBox";
import ODataListBinding from "sap/ui/model/odata/v4/ODataListBinding";
import Context from "sap/ui/model/odata/v4/Context";
import Filter from "sap/ui/model/Filter";
import FilterOperator from "sap/ui/model/FilterOperator";
import Control from "sap/ui/core/Control";
import SearchField from "sap/m/SearchField";
import CheckBox from "sap/m/CheckBox";
import Switch from "sap/m/Switch";
import Select from "sap/m/Select";
import DateRangeSelection from "sap/m/DateRangeSelection";

/**
 * @namespace sap.capire.gameshop.utils
 */
export default class Filters {

    /**
     * Homepage Category Sorter
     */
    public static initAndLoad(oComboBox: ComboBox): void {
        if (!oComboBox) return;
        oComboBox.bindItems({
            path: "/Categories",
            parameters: { "$select": "ID,name,parent_ID", "$expand": "parent($select=name)" },
            template: new Item({ key: "{ID}", text: "{name}" }),
            events: {
                dataReceived: () => {
                    const oBinding = oComboBox.getBinding("items") as ODataListBinding;
                    if (!oBinding) return;
                    const aRaw = oBinding.getContexts().map((oCtx: Context) => oCtx.getObject()).filter(oObj => !!oObj);
                    Filters.rebuildItems(oComboBox, aRaw);
                }
            }
        });
    }

    private static rebuildItems(oComboBox: ComboBox, aRawCategories: any[]): void {
        const aParents = aRawCategories.filter((c: any) => !c.parent_ID).sort((a: any, b: any) => a.name.localeCompare(b.name));
        const aResult = [...aParents];
        const aChildren = aRawCategories.filter((c: any) => !!c.parent_ID).sort((a: any, b: any) => a.name.localeCompare(b.name));

        aChildren.forEach((oChild: any) => {
            const iParentIndex = aResult.findIndex((c: any) => c.ID === oChild.parent_ID);
            if (iParentIndex !== -1) {
                let iInsertIndex = iParentIndex + 1;
                while (iInsertIndex < aResult.length && aResult[iInsertIndex].parent_ID === oChild.parent_ID) { iInsertIndex++; }
                aResult.splice(iInsertIndex, 0, oChild);
            } else { aResult.push(oChild); }
        });

        oComboBox.destroyItems();
        aResult.forEach((oCat: any) => {
            const sFormattedText = oCat.parent_ID ? `    └── ${oCat.name}` : oCat.name;
            oComboBox.addItem(new Item({ key: oCat.ID, text: sFormattedText }));
        });
    }

    /**
     * Centralized Homepage Filter State
     */
    public static executeCatalogFiltration(oController: any): void {
        const oView = oController.getView();
        const oTable = oView?.byId("gamesTable") as Control;
        const oBinding = oTable?.getBinding("items") as ODataListBinding;
        if (!oBinding) return;

        const oSearchField = oView.byId("searchTitleField") as SearchField;
        const oSelect = oView.byId("categorySelect") as ComboBox;
        const oCheckBox = oView.byId("parentCategoryCheckBox") as CheckBox;
        const oStockSwitch = oView.byId("stockFilterSwitch") as Switch;
        const oPriceCombo = oView.byId("priceFilterCombo") as ComboBox;

        const aFilters: Filter[] = [];

        // Filter by Name
       const sQuery = oSearchField ? oSearchField.getValue().trim() : "";
        if (sQuery) {
            aFilters.push(new Filter({
                path: "title",
                operator: FilterOperator.Contains,
                value1: sQuery,
                caseSensitive: false
            }));
        }

        // Filter by Stock
        const bInStockOnly = oStockSwitch ? oStockSwitch.getState() : false;
        if (bInStockOnly) {
            aFilters.push(new Filter("stock", FilterOperator.GT, 0));
        }

        // Filter by Price Limit
        const sPriceKey = oPriceCombo ? oPriceCombo.getSelectedKey() : "all";
        if (sPriceKey && sPriceKey !== "all") {
            aFilters.push(new Filter("price", FilterOperator.LE, Number(sPriceKey)));
        }

        // Filter by Category
        const sSelectedCategoryId = oSelect ? oSelect.getSelectedKey() : "";
        if (sSelectedCategoryId) {
            const oCurrentCategoryFilter = new Filter("genre_ID", FilterOperator.EQ, sSelectedCategoryId);

            if (oCheckBox && oCheckBox.getSelected()) {
                const oSelectedItem = oSelect.getSelectedItem();
                const oContext = oSelectedItem ? oSelectedItem.getBindingContext() : null;
                const sParentId = oContext ? oContext.getProperty("parent_ID") as string : null;

                if (sParentId) {
                    aFilters.push(new Filter({
                        filters: [oCurrentCategoryFilter, new Filter("genre_ID", FilterOperator.EQ, sParentId)],
                        and: false
                    }));
                } else {
                    aFilters.push(new Filter({
                        filters: [oCurrentCategoryFilter, new Filter("genre/parent_ID", FilterOperator.EQ, sSelectedCategoryId)],
                        and: false
                    }));
                }
            } else {
                aFilters.push(oCurrentCategoryFilter);
            }
        }

        oBinding.filter(aFilters.length > 0 ? new Filter({ filters: aFilters, and: true }) : []);
    }


    /**
     * Centralized Order page Filter State
     */
    public static executeOrdersListFiltration(oController: any): void {
        const oView = oController.getView();
        const oTable = oView?.byId("ordersTable") as any;
        const oBinding = oTable?.getBinding("items") as any;
        if (!oBinding || !oView) return;

        const aFilters: Filter[] = [];

        const oSearchField = oView.byId("filterOrderNumber") as SearchField | undefined;
        const sSearchValue = oSearchField?.getValue()?.trim();
        if (sSearchValue) {
            aFilters.push(new Filter({
                filters: [
                    new Filter("orderNumber", FilterOperator.Contains, sSearchValue),
                    new Filter({
                        path: "customer/name",
                        operator: FilterOperator.Contains,
                        value1: sSearchValue,
                        caseSensitive: false
                    })
                ],
                and: false
            }));
        }

        // Filter by Status
        const oSelect = oView.byId("filterStatus") as Select | undefined;
        const sStatusKey = oSelect?.getSelectedKey();
        if (sStatusKey && sStatusKey !== "ALL") {
            aFilters.push(new Filter("status_code", FilterOperator.EQ, sStatusKey));
        }

        // Filter by DAta Range
        const oDateRange = oView.byId("filterDateRange") as DateRangeSelection | undefined;
        const oFromDate = oDateRange?.getDateValue();
        const oToDate = oDateRange?.getSecondDateValue();

        if (oFromDate && oToDate) {
            const oToDateEnd = new Date(oToDate);
            oToDateEnd.setHours(23, 59, 59, 999);
            aFilters.push(new Filter("createdAt", FilterOperator.BT, oFromDate.toISOString(), oToDateEnd.toISOString()));
        }

        oBinding.filter(aFilters);
    }

}
