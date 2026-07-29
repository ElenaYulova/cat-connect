import Controller from "sap/ui/core/mvc/Controller";
import Control from "sap/ui/core/Control";
import Filter from "sap/ui/model/Filter";
import FilterOperator from "sap/ui/model/FilterOperator";
import ODataListBinding from "sap/ui/model/odata/v4/ODataListBinding";
import UIComponent from "sap/ui/core/UIComponent";
import { SearchField$SearchEvent } from "sap/m/SearchField";
import Event from "sap/ui/base/Event";
import ColumnListItem from "sap/m/ColumnListItem";
import Sorter from "sap/ui/model/Sorter";
import Image from "sap/m/Image";
import Select from "sap/m/Select";
import CheckBox from "sap/m/CheckBox";
import Button from "sap/m/Button";
import MessageToast from "sap/m/MessageToast";
import SearchField from "sap/m/SearchField";
import ComboBox from "sap/m/ComboBox";
import CategorySorter from "../utils/CategorySorter";

/**
 * @namespace sap.capire.gameshop.controller
 */
export default class SalesOrder extends Controller {
    private _bSortTitleDescending: boolean = false;
    private _bSortPriceDescending: boolean = false;

    public onInit(): void {
        const oSelect = this.byId("categorySelect") as ComboBox;

        CategorySorter.initAndLoad(oSelect);
    }


    // Image placeolder for the game list
    public onImageLoadError(oEvent: Event): void {
        const oImageCtrl = oEvent.getSource() as Image;
        if (oImageCtrl) {
            oImageCtrl.setSrc("./assets/img/logo.png");
        }
    }

    // Interactive sorting by Title
    public onSortTitle(): void {
        const oTable = this.byId("gamesTable") as Control;
        const oBinding = oTable?.getBinding("items") as ODataListBinding;

        if (oBinding) {
            this._bSortTitleDescending = !this._bSortTitleDescending;
            const oSorter = new Sorter("title", this._bSortTitleDescending);
            oBinding.sort(oSorter);
        }
    }

    // Interactive sorting by Price
    public onSortPrice(): void {
        const oTable = this.byId("gamesTable") as Control;
        const oBinding = oTable?.getBinding("items") as ODataListBinding;

        if (oBinding) {
            this._bSortPriceDescending = !this._bSortPriceDescending;
            const oSorter = new Sorter("price", this._bSortPriceDescending);
            oBinding.sort(oSorter);
        }
    }

    // Games filtration by Title

    public onSearch(oEvent: SearchField$SearchEvent): void {
        const sQuery = oEvent.getParameter("query") || "";
        const oTable = this.byId("gamesTable") as Control;
        const oBinding = oTable.getBinding("items") as ODataListBinding;

        if (!oBinding) return;

        const oSelect = this.byId("categorySelect") as Select;
        const sSelectedCategoryId = oSelect.getSelectedKey();

        const aFilters: Filter[] = [new Filter("stock", FilterOperator.GT, 0)];

        if (sQuery) {
            aFilters.push(new Filter("title", FilterOperator.Contains, sQuery));
        }

        if (sSelectedCategoryId) {
            aFilters.push(new Filter("genre_ID", FilterOperator.EQ, sSelectedCategoryId));
        }

        oBinding.filter(new Filter({ filters: aFilters, and: true }));
    }


    public onCategoryChange(): void {
        const oTable = this.byId("gamesTable") as Control;
        const oBinding = oTable?.getBinding("items") as ODataListBinding;

        if (!oBinding) return;

        const oSelect = this.byId("categorySelect") as ComboBox;
        const oCheckBox = this.byId("parentCategoryCheckBox") as CheckBox;
        const sSelectedCategoryId = oSelect.getSelectedKey();

        const aRootFilters: Filter[] = [new Filter("stock", FilterOperator.GT, 0)];

        if (sSelectedCategoryId) {
            const oCurrentCategoryFilter = new Filter("genre_ID", FilterOperator.EQ, sSelectedCategoryId);

            if (oCheckBox.getSelected()) {
                const oSelectedItem = oSelect.getSelectedItem();
                const oContext = oSelectedItem ? oSelectedItem.getBindingContext() : null;
                const sParentId = oContext ? oContext.getProperty("parent_ID") as string : null;

                if (sParentId) {

                    aRootFilters.push(new Filter({
                        filters: [
                            oCurrentCategoryFilter,
                            new Filter("genre_ID", FilterOperator.EQ, sParentId)
                        ],
                        and: false
                    }));
                } else {

                    aRootFilters.push(new Filter({
                        filters: [
                            oCurrentCategoryFilter,
                            new Filter("genre/parent_ID", FilterOperator.EQ, sSelectedCategoryId)
                        ],
                        and: false
                    }));
                }
            } else {
                aRootFilters.push(oCurrentCategoryFilter);
            }
        }

        const oSearchField = this.byId("searchTitleField") as SearchField;
        const sQuery = oSearchField ? oSearchField.getValue() : "";
        if (sQuery) {
            aRootFilters.push(new Filter("title", FilterOperator.Contains, sQuery));
        }

        oBinding.filter(new Filter({ filters: aRootFilters, and: true }));
    }

    // Navigation method

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
            const sPath = oCtx.getPath();

            const sCleanPath = sPath.startsWith("/") ? sPath.substring(1) : sPath;
            const sEntityName = sCleanPath.split("(")[0];

            const oRouteParams: Record<string, string> = {};
            const sParamName = sEntityName.toLowerCase().replace(/s$/, "") + "Id";
            oRouteParams[sParamName] = sEntityId;

            const oRouter = UIComponent.getRouterFor(this);
            oRouter.navTo(sTargetRoute, oRouteParams);
        }
    }

    // Quick add to Cart
    public onQuickAddToCart(oEvent: Event): void {
        const oButton = oEvent.getSource() as Button;
        const oContext = oButton.getBindingContext();
        const sProductTitle = oContext?.getProperty("title") as string;

        MessageToast.show(`Quick add triggered for: ${sProductTitle}`);
    }
}
