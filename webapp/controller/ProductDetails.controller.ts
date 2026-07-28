import Controller from "sap/ui/core/mvc/Controller";
import UIComponent from "sap/ui/core/UIComponent";
import Event from "sap/ui/base/Event";
import JSONModel from "sap/ui/model/json/JSONModel";
import MessageToast from "sap/m/MessageToast";
import Image from "sap/m/Image";

export default class ProductDetails extends Controller {

    public onInit(): void {
        const oRouter = UIComponent.getRouterFor(this);
        oRouter.getRoute("ProductDetails")?.attachPatternMatched(this._onObjectMatched, this);

        const oRoleModel = new JSONModel({
            isCRMAdmin: true,
            isSupplier: false
        });

        this.getView()?.setModel(oRoleModel, "userRoles");
    }

    private _onObjectMatched(oEvent: Event): void {
        const oUi5Event = oEvent as any;
        const oArgs = oUi5Event.getParameter("arguments");

        if (oArgs && oArgs.productId) {
            const sProductId = oArgs.productId as string;

            this.getView()?.bindElement({
                path: `/Products(${sProductId})`,
                parameters: {
                    $$updateGroupId: "detailsUpdateGroup",
                    "$expand": "genre($select=name)"
                }
            });
        }
    }

    public formatStock(iStock: number | undefined): string {
        if (iStock === undefined || iStock === null) {
            return "No data";
        }
        return iStock > 0 ? iStock.toString() : "Out of stock";
    }

    public onEditProduct(): void {
        MessageToast.show("Editing mode enabled for authorized manager.");
    }

    public onImageLoadError(oEvent: Event): void {
        const oImageCtrl = oEvent.getSource() as Image;
        if (oImageCtrl) {
            oImageCtrl.setSrc("./assets/img/logo.png");
        }
    }
}
