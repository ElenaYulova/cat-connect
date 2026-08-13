import Controller from "sap/ui/core/mvc/Controller";
import JSONModel from "sap/ui/model/json/JSONModel";
import Event from "sap/ui/base/Event";
import MessageBox from "sap/m/MessageBox";
import ODataContext from "sap/ui/model/odata/v4/Context";
import UIComponent from "sap/ui/core/UIComponent";
import { Route$PatternMatchedEvent } from "sap/ui/core/routing/Route";
import NavigationManager from "../utils/NavigationManager";
import OrderManager from "../utils/OrderManager";
import ObjectAttribute from "sap/m/ObjectAttribute";
import Button from "sap/m/Button";
import Formatter from "../model/formatter";
import Fragment from "sap/ui/core/Fragment";
import Dialog from "sap/m/Dialog";
import SelectDialog from "sap/m/SelectDialog";
import StandardListItem from "sap/m/StandardListItem";
import Input from "sap/m/Input";
import TextArea from "sap/m/TextArea";

/**
 * @namespace sap.capire.gameshop.controller
 */
export default class OrderDetails extends Controller {

    public formatter: typeof Formatter = Formatter;
    private _oCancelDialog: Dialog | null = null;

    public onInit(): void {
        const oOwnerComponent = this.getOwnerComponent() as UIComponent | undefined;
        oOwnerComponent?.getRouter().getRoute("OrderDetails")?.attachPatternMatched(this._onOrderMatched, this);

        const oLocalModel = new JSONModel({
            isReviewLocked: false,
            isReviewFormVisible: false,
            isReviewReadOnlyVisible: false
        });
        this.getView()?.setModel(oLocalModel, "localView");

        const oValueHelpsModel = new JSONModel();
        oValueHelpsModel.loadData("model/valueHelps.json");
        this.getView()?.setModel(oValueHelpsModel, "valueHelps");
    }

    public onImageLoadError(oEvent: Event): void {
        NavigationManager.onImageLoadError(oEvent);
    }

    public onNavBack(): void {
        NavigationManager.navBack(this, "OrdersList");
    }

    private _onOrderMatched(oEvent: Route$PatternMatchedEvent): void {
        const oArgs = oEvent.getParameter("arguments") as { orderId?: string };
        const sOrderId = oArgs?.orderId;

        const oView = this.getView();
        if (!oView || !sOrderId) return;

        oView.bindElement({
            path: `/Orders(ID=${sOrderId},IsActiveEntity=true)`,
            parameters: {
                $expand: "customer,items($expand=game)"
            },
            events: {
                dataRequested: () => oView.setBusy(true),
                dataReceived: async () => {
                    oView.setBusy(false);

                    const oBindingContext = oView.getBindingContext() as ODataContext | undefined;
                    const oOrderData = oBindingContext?.getObject() as any;

                    const oDiscountAttr = this.byId("discountAttribute") as ObjectAttribute | undefined;
                    const oCancelBtn = this.byId("cancelOrderButton") as Button | undefined;
                    const oUserRoles = oView.getModel("userRoles") as JSONModel | undefined;

                    OrderManager.calculateLoyaltySaving(oOrderData, oDiscountAttr);
                    OrderManager.updateCancelButtonVisibility(oCancelBtn, oOrderData, oUserRoles);
                    OrderManager.enforceSecurityShield(this, oOrderData, oUserRoles);
                    await OrderManager.checkAndPrepareReviewContainer(this, oOrderData);
                }
            }
        });
    }

    public async onSubmitReview(): Promise<void> {
        const oBindingContext = this.getView()?.getBindingContext() as ODataContext | undefined;
        const oOrderData = oBindingContext?.getObject();
        await OrderManager.submitOrderReview(this, oOrderData);
    }

    public async onCancelOrder(): Promise<void> {
        const oView = this.getView();
        if (!oView) return;

        if (!this._oCancelDialog) {
            this._oCancelDialog = await Fragment.load({
                id: oView.getId(),
                name: "sap.capire.gameshop.view.fragments.ActionDialog",
                controller: this
            }) as Dialog;
            oView.addDependent(this._oCancelDialog);
        }

        (oView.byId("reasonInput") as Input).setValue("");
        (oView.byId("destinationInput") as Input).setValue("");
        (oView.byId("cancelCommentArea") as TextArea).setValue("");

        this._oCancelDialog.open();
    }

    public onReasonValueHelp(): void {
        const oInput = this.getView()?.byId("reasonInput") as Input;
        OrderManager.openValueHelp(
            this,
            oInput,
            "orderDetails.dialog.cancelReason.title",
            "valueHelps>/cancellationReasons"
        );
    }

    public onDestinationValueHelp(): void {
        const oInput = this.getView()?.byId("destinationInput") as Input;
        OrderManager.openValueHelp(
            this,
            oInput,
            "orderDetails.dialog.licensePlatform.title",
            "valueHelps>/licensePlatforms"
        );
    }


    public async onConfirmOrderCancellation(): Promise<void> {

        await OrderManager.executeOrderCancellation(this, this._oCancelDialog);
    }

    public onCloseCancelDialog(): void {
        this._oCancelDialog?.close();
    }

    public onDeleteOrder(): void {
        const oView = this.getView();
        const oBindingContext = oView?.getBindingContext() as ODataContext | undefined;
        if (!oBindingContext) return;

        const oResourceBundle = (this.getOwnerComponent()?.getModel("i18n") as any)?.getResourceBundle();
        MessageBox.warning(oResourceBundle?.getText("orderDetails.message.deleteConfirm") || "", {
            actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
            emphasizedAction: MessageBox.Action.CANCEL,
            onClose: async (sAction: string | null) => {
                if (sAction !== MessageBox.Action.OK) return;

                try {
                    oView!.setBusy(true);
                    await oBindingContext.delete();
                    oView!.setBusy(false);
                    MessageBox.success(oResourceBundle?.getText("orderDetails.message.deleteSuccess") || "", {
                        onClose: () => this.onNavBack()
                    });
                } catch (oError: any) {
                    oView!.setBusy(false);
                    MessageBox.error(oError?.message || oResourceBundle?.getText("orderDetails.message.deleteError") || "");
                }
            }
        });
    }
}
