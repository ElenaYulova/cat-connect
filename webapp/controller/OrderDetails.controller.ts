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

/**
 * @namespace sap.capire.gameshop.controller
 */
export default class OrderDetails extends Controller {

    public formatter: typeof Formatter = Formatter;

    public onInit(): void {
        const oOwnerComponent = this.getOwnerComponent() as UIComponent | undefined;
        oOwnerComponent?.getRouter().getRoute("OrderDetails")?.attachPatternMatched(this._onOrderMatched, this);

        const oLocalModel = new JSONModel({
            isReviewLocked: false,
            isReviewFormVisible: false,
            isReviewReadOnlyVisible: false
        });
        this.getView()?.setModel(oLocalModel, "localView");
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
        const oBindingContext = oView?.getBindingContext() as ODataContext | undefined;
        if (!oBindingContext) return;

        MessageBox.confirm("Are you sure you want to cancel this sales order?", {
            onClose: async (sAction: string | null) => {
                if (sAction !== MessageBox.Action.OK) return;

                try {
                    oView!.setBusy(true);
                    await oBindingContext.setProperty("status_code", "X");
                    oView!.setBusy(false);

                    const oOrderData = oBindingContext.getObject();

                    const oDiscountAttr = this.byId("discountAttribute") as ObjectAttribute | undefined;
                    const oCancelBtn = this.byId("cancelOrderButton") as Button | undefined;
                    const oUserRoles = oView!.getModel("userRoles") as JSONModel | undefined;

                    OrderManager.calculateLoyaltySaving(oOrderData, oDiscountAttr);
                    OrderManager.updateCancelButtonVisibility(oCancelBtn, oOrderData, oUserRoles);
                    await OrderManager.checkAndPrepareReviewContainer(this, oOrderData);

                    MessageBox.success("Order has been successfully cancelled.");
                } catch (oError: any) {
                    oView!.setBusy(false);
                    MessageBox.error(oError?.message || "Failed to cancel order due to database constraints.");
                }
            }
        });
    }

    public onDeleteOrder(): void {
        const oView = this.getView();
        const oBindingContext = oView?.getBindingContext() as ODataContext | undefined;
        if (!oBindingContext) return;

        MessageBox.warning("CRITICAL: Are you sure you want to PERMANENTLY DELETE this order from the system database?", {
            actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
            emphasizedAction: MessageBox.Action.CANCEL,
            onClose: async (sAction: string | null) => {
                if (sAction !== MessageBox.Action.OK) return;

                try {
                    oView!.setBusy(true);
                    await oBindingContext.delete();
                    oView!.setBusy(false);
                    MessageBox.success("Order has been permanently purged from database.", {
                        onClose: () => this.onNavBack()
                    });
                } catch (oError: any) {
                    oView!.setBusy(false);
                    MessageBox.error(oError?.message || "Failed to purge database records.");
                }
            }
        });
    }
}
