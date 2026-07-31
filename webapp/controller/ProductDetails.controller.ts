import Controller from "sap/ui/core/mvc/Controller";
import UIComponent from "sap/ui/core/UIComponent";
import Event from "sap/ui/base/Event";
import JSONModel from "sap/ui/model/json/JSONModel";
import MessageToast from "sap/m/MessageToast";
import Image from "sap/m/Image";
import Control from "sap/ui/core/Control";
import StepInput from "sap/m/StepInput";
import CartManager from "../utils/CartManager";
import Formatter from "../model/formatter";

export default class ProductDetails extends Controller {

    public formatter = Formatter;

    public onInit(): void {
        const oRouter = UIComponent.getRouterFor(this);
        oRouter.getRoute("ProductDetails")?.attachPatternMatched(this._onObjectMatched, this);
    }

    private _onObjectMatched(oEvent: Event): void {
        const oParameters = oEvent.getParameters() as { arguments?: { productId?: string } } | undefined;
        const oArgs = oParameters?.arguments;
        if (!oArgs || !oArgs.productId) return;

        const sProductId = oArgs.productId;
        const oView = this.getView();
        if (!oView) return;

        const oComponent = this.getOwnerComponent();
        const oCartModel = (oComponent ? oComponent.getModel("cart") : null) as JSONModel | null;
        if (!oCartModel) return;

        const iValidQuantity = CartManager.getQuantityForProduct(oCartModel, sProductId);

        let oViewModel = oView.getModel("view") as JSONModel | undefined;
        if (!oViewModel) {
            oViewModel = new JSONModel();
            oView.setModel(oViewModel, "view");
        }
        oViewModel.setProperty("/currentQuantity", iValidQuantity);
        oViewModel.setProperty("/isEditMode", false);
        oViewModel.setProperty("/isAddToCartEnabled", true);

        oView.bindElement({
            path: `/Products(${sProductId})`,
            parameters: {
                $$updateGroupId: "detailsUpdateGroup",
                "$expand": "genre($select=ID,name)"
            }
        });
    }

    public onQuantityChange(oEvent: Event): void {
        const oControl = oEvent.getSource() as Control;
        if (!oControl) return;
        const oStepInput = oControl as StepInput;
        const oView = this.getView();
        if (!oView) return;

        const oViewModel = oView.getModel("view") as JSONModel | undefined;
        if (oViewModel) {
            const bIsValid = oStepInput.getValueState() !== "Error";
            oViewModel.setProperty("/isAddToCartEnabled", bIsValid);
        }
    }

    public onAddToCart(): void {
        const oView = this.getView();
        const oContext = oView?.getBindingContext();
        if (!oContext) return;

        const sId = oContext.getProperty("ID") as string;
        const sTitle = oContext.getProperty("title") as string;
        const fPrice = oContext.getProperty("price") as number;

        const oCartModel = this.getOwnerComponent()?.getModel("cart") as JSONModel;
        const oViewModel = oView?.getModel("view") as JSONModel;
        if (!oCartModel || !oViewModel) return;

        const iQuantity = oViewModel.getProperty("/currentQuantity") as number || 1;

        CartManager.addToCart(oCartModel, sId, sTitle, fPrice, iQuantity);
    }

    public onEditProduct(): void {
        const oView = this.getView();
        const oRolesModel = oView?.getModel("userRoles") as JSONModel | undefined;
        const oViewModel = oView?.getModel("view") as JSONModel | undefined;
        if (!oRolesModel || !oViewModel) return;

        const bIsLoggedIn = oRolesModel.getProperty("/isLoggedIn") as boolean;
        const bIsCRMAdmin = oRolesModel.getProperty("/isCRMAdmin") as boolean;
        const bIsSupplier = oRolesModel.getProperty("/isSupplier") as boolean;

        if (!bIsLoggedIn || (!bIsCRMAdmin && !bIsSupplier)) {
            MessageToast.show("Access denied. Product editing mode is enabled only for authorized managers or administrators.");
            return;
        }

        oViewModel.setProperty("/isEditMode", true);
        MessageToast.show("Product editing mode has been successfully enabled.");
    }

    public async onSaveChanges(): Promise<void> {
        const oView = this.getView();
        if (!oView) return;

        const oModel = oView.getModel() as any;
        const oViewModel = oView.getModel("view") as JSONModel;

        try {
            await oModel.submitBatch("detailsUpdateGroup");
            oViewModel.setProperty("/isEditMode", false);
            MessageToast.show("Product updates have been successfully saved to the database!");
        } catch (oError) {
            MessageToast.show("Failed to save changes. Please verify database constraints.");
        }
    }

    public onCancelChanges(): void {
        const oView = this.getView();
        const oViewModel = oView?.getModel("view") as JSONModel;
        if (!oView || !oViewModel) return;

        const oModel = oView.getModel() as any;

        oModel.resetChanges("detailsUpdateGroup");
        oViewModel.setProperty("/isEditMode", false);
        MessageToast.show("Changes discarded. Product data reset to previous state.");
    }

    public onPriceLiveChange(oEvent: Event): void {
        Formatter.onPriceLiveChange(oEvent);
    }

    public onStockLiveChange(oEvent: Event): void {
        Formatter.onStockLiveChange(oEvent);
    }

    public onImageLoadError(oEvent: Event): void {
        const oImageCtrl = oEvent.getSource() as Image;
        if (oImageCtrl) {
            oImageCtrl.setSrc("./assets/img/logo.png");
        }
    }
}
