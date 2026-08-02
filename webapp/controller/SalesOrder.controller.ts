import Controller from "sap/ui/core/mvc/Controller";
import Control from "sap/ui/core/Control";
import Filters from "../utils/Filters";
import ODataListBinding from "sap/ui/model/odata/v4/ODataListBinding";
import Event from "sap/ui/base/Event";
import Sorter from "sap/ui/model/Sorter";
import Button from "sap/m/Button";
import JSONModel from "sap/ui/model/json/JSONModel";
import ComboBox from "sap/m/ComboBox";
import CategorySorter from "../utils/Filters";
import CartManager from "../utils/CartManager";
import NavigationManager from "../utils/NavigationManager";

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


    // Image placeholder for the game list
        public onImageLoadError(oEvent: Event): void {
            NavigationManager.onImageLoadError(oEvent);
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

    public onCatalogFiltersTrigger(): void {
        Filters.executeCatalogFiltration(this);
    }

    // Navigation method

    public onNavToGenericDetails(oEvent: Event): void {
        NavigationManager.navToGenericDetails(this, oEvent);
    }

    // Quick add to Cart
    public onQuickAddToCart(oEvent: Event): void {
        const oButton = oEvent.getSource() as Button;
        const oContext = oButton.getBindingContext();
        if (!oContext) return;

        const sId = oContext.getProperty("ID") as string;
        const sTitle = oContext.getProperty("title") as string;
        const fPrice = oContext.getProperty("price") as number;

        const oCartModel = this.getOwnerComponent()?.getModel("cart") as JSONModel;

        CategorySorter.initAndLoad;
        CartManager.addToCart(oCartModel, sId, sTitle, fPrice, 1);
    }
}
