import JSONModel from "sap/ui/model/json/JSONModel";
import ObjectAttribute from "sap/m/ObjectAttribute";
import Button from "sap/m/Button";
import RatingIndicator from "sap/m/RatingIndicator";
import Text from "sap/m/Text";
import TextArea from "sap/m/TextArea";
import MessageBox from "sap/m/MessageBox";
import ODataModel from "sap/ui/model/odata/v4/ODataModel";
import ODataListBinding from "sap/ui/model/odata/v4/ODataListBinding";
import Controller from "sap/ui/core/mvc/Controller";
import SelectDialog from "sap/m/SelectDialog";
import StandardListItem from "sap/m/StandardListItem";
import Input from "sap/m/Input";

export default class OrderManager {

    /**
     * TODO: Add feature with Loyalty Saving Sums in next releases.
     */
    public static calculateLoyaltySaving(oOrder: any, oDiscountAttr: ObjectAttribute | undefined): void {
        if (!oDiscountAttr) return;
        if (!oOrder || !oOrder.items) {
            oDiscountAttr.setText("");
            return;
        }

        let fTotalGross = 0;
        oOrder.items.forEach((oItem: any) => {
            const fPrice = oItem.game?.price || 0;
            const iQty = oItem.quantity || 0;
            fTotalGross += (fPrice * iQty);
        });

        const fTotalAmount = oOrder.totalAmount || 0;
        const fSaving = +(fTotalGross - fTotalAmount).toFixed(2);
        const oBundle = (sap.ui.getCore().getModel("i18n") as any)?.getResourceBundle();

        if (fSaving > 0) {
            oDiscountAttr.setText(oBundle?.getText("orderManager.label.loyaltySaving", [fSaving]) || `Your Loyalty Saving: ${fSaving} USD`);
        } else {
            oDiscountAttr.setText("");
        }
    }

    public static updateCancelButtonVisibility(oCancelBtn: Button | undefined, oOrderData: any, oUserRoles: JSONModel | undefined): void {
        if (!oCancelBtn || !oOrderData) return;

        const sStatus = oOrderData.status_code;
        const bIsSupplier = oUserRoles?.getProperty("/isSupplier") === true;
        const bVisible = !bIsSupplier && (sStatus === "new" || sStatus === "N" || sStatus === "in_process" || sStatus === "P");
        oCancelBtn.setVisible(bVisible);
    }

    public static enforceSecurityShield(oController: Controller, oOrderData: any, oUserRoles: JSONModel | undefined): void {
        if (!oOrderData) return;

        const oBundle = (sap.ui.getCore().getModel("i18n") as any)?.getResourceBundle();
        const sSavedUserJson = window.localStorage.getItem("catConnect_userProfile");

        if (sSavedUserJson) {
            try {
                const oUserData = JSON.parse(sSavedUserJson) as { id?: string, isCRMAdmin?: boolean, isSalesManager?: boolean };

                if (oUserData.isCRMAdmin === true || oUserData.isSalesManager === true) {
                    return;
                }

                if (oOrderData.customer_ID !== oUserData.id) {
                    MessageBox.error(oBundle?.getText("orderManager.message.accessDenied") || "Access Denied: You cannot view other customers' orders.", {
                        onClose: () => {
                            if (typeof (oController as any).onNavBack === "function") {
                                (oController as any).onNavBack();
                            }
                        }
                    });
                }
            } catch (e) {
                console.error("[AUTODEV SEC-SHIELD CRASH]: Failed to parse local session token.");
            }
        }
    }


    public static async checkAndPrepareReviewContainer(oController: any, oOrderData: any): Promise<void> {
        const oView = oController.getView();
        const oLocalModel = oView?.getModel("localView") as JSONModel | undefined;
        if (!oView || !oLocalModel || !oOrderData) return;

        const oBundle = (sap.ui.getCore().getModel("i18n") as any)?.getResourceBundle();

        const sStatus = oOrderData.status_code;
        const sOrderId = oOrderData.ID;
        const sCustomerId = oOrderData.customer?.ID || oOrderData.customer_ID;

        const bIsCompleted = (sStatus === "completed" || sStatus === "C");
        const bIsCanceled = (sStatus === "canceled" || sStatus === "X");

        // TODO: Refactor UI layout for canceled state to completely hide unused labels (Your Rating/Comment)
        // and shift to a dedicated encapsulated fragments block before final mentor review.
        if (bIsCanceled) {
            oLocalModel.setProperty("/isReviewLocked", false);
            oLocalModel.setProperty("/isReviewFormVisible", false);
            oLocalModel.setProperty("/isReviewReadOnlyVisible", true);
        } else if (!bIsCompleted) {
            oLocalModel.setProperty("/isReviewLocked", true);
            oLocalModel.setProperty("/isReviewFormVisible", false);
            oLocalModel.setProperty("/isReviewReadOnlyVisible", false);
            return;
        } else {
            oLocalModel.setProperty("/isReviewLocked", false);
        }

        const oODataModel = oView.getModel() as ODataModel;
        oView.setBusy(true);

        try {

            let sFilterQuery = `customer_ID eq ${sCustomerId} and product_ID eq 44444444-4444-4444-4444-444444444444 and contains(comments,'${sOrderId}')`;

            if (bIsCanceled) {
                sFilterQuery = `customer_ID eq ${sCustomerId} and contains(comments,'[CANCELED]') and contains(comments,'${sOrderId}')`;
            }

            const oListBinding = oODataModel.bindList("/Feedbacks", undefined, undefined, undefined, {
                $filter: sFilterQuery
            }) as ODataListBinding;

            const aContexts = await oListBinding.requestContexts(0, 1);
            oView.setBusy(false);

            if (aContexts && aContexts.length > 0) {
                const oSavedReview = aContexts[0].getObject() as { rating: number, comments: string };

                if (oSavedReview.rating === 0 || oSavedReview.comments.includes("[CANCELED]")) {
                    oLocalModel.setProperty("/isReviewFormVisible", false);
                    oLocalModel.setProperty("/isReviewReadOnlyVisible", true);

                    const sCleanComment = oSavedReview.comments
                        .replace("[CANCELED]", oBundle?.getText("orderManager.status.canceled") || "🛑 STATUS: CANCELED |")
                        .replace(/\[/g, " ")
                        .replace(/\]/g, " |");

                    (oView.byId("savedRatingIndicator") as RatingIndicator)?.setValue(0);
                    (oView.byId("savedRatingIndicator") as RatingIndicator)?.setVisible(false);
                    (oView.byId("savedCommentText") as Text)?.setText(sCleanComment);
                } else {

                    oLocalModel.setProperty("/isReviewFormVisible", false);
                    oLocalModel.setProperty("/isReviewReadOnlyVisible", true);
                    (oView.byId("savedRatingIndicator") as RatingIndicator)?.setVisible(true);

                    const sCleanComment = oSavedReview.comments.replace(`[Order_ID: ${sOrderId}]`, "").trim();
                    (oView.byId("savedRatingIndicator") as RatingIndicator)?.setValue(oSavedReview.rating);
                    (oView.byId("savedCommentText") as Text)?.setText(sCleanComment);
                }
            } else {
                if (bIsCanceled) {
                    oLocalModel.setProperty("/isReviewFormVisible", false);
                    oLocalModel.setProperty("/isReviewReadOnlyVisible", true);
                    (oView.byId("savedRatingIndicator") as RatingIndicator)?.setVisible(false);
                    (oView.byId("savedCommentText") as Text)?.setText(oBundle?.getText("orderManager.log.revoked") || "🛑 System Log: This digital key contract has been revoked and canceled.");
                } else {
                    oLocalModel.setProperty("/isReviewFormVisible", true);
                    oLocalModel.setProperty("/isReviewReadOnlyVisible", false);
                    (oView.byId("savedRatingIndicator") as RatingIndicator)?.setVisible(true);
                }
            }
        } catch (oError) {
            oView.setBusy(false);
            oLocalModel.setProperty("/isReviewFormVisible", true);
        }
    }


    public static async submitOrderReview(oController: any, oOrderData: any): Promise<void> {
        const oView = oController.getView();
        if (!oView || !oOrderData) return;

        const oRatingCtrl = oView.byId("feedbackRatingIndicator") as RatingIndicator | undefined;
        const oTextCtrl = oView.byId("feedbackTextArea") as TextArea | undefined;
        const oODataModel = oView.getModel() as ODataModel;

        const oBundle = (sap.ui.getCore().getModel("i18n") as any)?.getResourceBundle();

        const iRating = Math.max(1, oRatingCtrl?.getValue() || 5);
        const sComment = oTextCtrl?.getValue()?.trim() || "";

        if (!sComment) {
            MessageBox.warning(oBundle?.getText("orderManager.message.reviewWarning") || "Please enter your review text before submitting.");
            return;
        }

        oView.setBusy(true);
        try {
            const sFakeStoreProductId = "44444444-4444-4444-4444-444444444444";
            const sMaskedComment = `[Order_ID: ${oOrderData.ID}] ${sComment}`;
            const sCleanDate = new Date().toISOString().split("T")[0];

            const oListBinding = oODataModel.bindList("/Feedbacks") as ODataListBinding;

            await oListBinding.create({
                customer_ID: oOrderData.customer_ID,
                product_ID: sFakeStoreProductId,
                rating: iRating,
                comments: sMaskedComment,
                feedbackDate: sCleanDate
            }, true);

            OrderManager._toggleReviewUIState(oView, iRating, sComment);

            MessageBox.success(oBundle?.getText("orderManager.message.reviewSuccess") || "Thank you! Your store review has been successfully submitted and factored into your loyalty profile.");
        } catch (oError: any) {
            MessageBox.error(oError?.message || oBundle?.getText("orderManager.message.reviewError") || "Failed to save your review.");
        } finally {
            oView.setBusy(false);
        }
    }

    private static _toggleReviewUIState(oView: any, iRating: number, sComment: string): void {
        const oLocalModel = oView.getModel("localView") as JSONModel | undefined;
        if (!oLocalModel) return;

        oLocalModel.setProperty("/isReviewFormVisible", false);
        oLocalModel.setProperty("/isReviewReadOnlyVisible", true);

        (oView.byId("savedRatingIndicator") as RatingIndicator)?.setValue(iRating);
        (oView.byId("savedCommentText") as Text)?.setText(sComment);
    }

    public static async executeOrderCancellation(oController: any, oCancelDialog: any): Promise<void> {
        const oView = oController.getView();
        const oODataModel = oView?.getModel() as any;
        const oBindingContext = oView?.getBindingContext();

        if (!oView || !oODataModel || !oBindingContext || !oCancelDialog) return;

        const oBundle = (sap.ui.getCore().getModel("i18n") as any)?.getResourceBundle();

        const sReason = (oView.byId("reasonInput") as any).getValue().trim();
        const sPlatform = (oView.byId("destinationInput") as any).getValue().trim();
        const sComment = (oView.byId("cancelCommentArea") as any).getValue().trim();

        if (!sReason || !sPlatform) {
            MessageBox.error(oBundle?.getText("orderManager.message.cancelValidation") || "Please select both Cancellation Reason and License Platform using Search Helps.");
            return;
        }

        oView.setBusy(true);
        oCancelDialog.setBusy(true);

        try {
            const oActionContext = oODataModel.bindContext(`${oBindingContext.getPath()}/SalesOrderService.cancelOrder(...)`);

            oActionContext.setParameter("reasonCode", sReason);
            oActionContext.setParameter("platformCode", sPlatform);
            oActionContext.setParameter("comment", sComment);

            await oActionContext.execute();

            oCancelDialog.setBusy(false);
            oCancelDialog.close();

            oView.setBusy(false);

            const oViewBinding = oView.getBindingContext()?.getBinding();
            if (oViewBinding && typeof oViewBinding.refresh === "function") {
                oViewBinding.refresh();
            }

            MessageBox.success(oBundle?.getText("orderManager.message.cancelSuccess") || "Order has been successfully canceled!");

        } catch (oError: any) {
            oCancelDialog.setBusy(false);
            oView.setBusy(false);
            MessageBox.error(oError?.message || oBundle?.getText("orderManager.message.cancelError") || "Fatal error during order cancellation transaction.");
        }
    }

    public static openValueHelp(
        oController: any,
        oInput: Input | undefined,
        sTitleKey: string,
        sAggregationPath: string
    ): void {
        const oView = oController.getView();
        const oModel = oView?.getModel("valueHelps");
        const oI18nModel = oView?.getModel("i18n");

        if (!oView || !oInput || !oModel) return;

        const oResourceBundle = (oI18nModel as any)?.getResourceBundle();
        const sTitle = oResourceBundle?.getText(sTitleKey) || "Select Option";

        const oSelectDialog = new SelectDialog({
            title: sTitle,
            confirm: (oEvent: any) => {
                const oSelectedItem = oEvent.getParameter("selectedItem");
                if (oSelectedItem) {
                    oInput.setValue(oSelectedItem.getTitle());
                }
            }
        });

        oSelectDialog.setModel(oModel, "valueHelps");

        oSelectDialog.bindAggregation("items", {
            path: sAggregationPath,
            factory: (sId: string, oContext: any) => {
                const sRawCode = oContext.getProperty("code") || "";
                const sRawText = oContext.getProperty("text") || "";

                const sCleanCodeKey = sRawCode.replace("{i18n>", "").replace("}", "");
                const sCleanTextKey = sRawText.replace("{i18n>", "").replace("}", "");

                const sTranslatedTitle = oResourceBundle?.getText(sCleanCodeKey) || sRawCode;
                const sTranslatedDesc = oResourceBundle?.getText(sCleanTextKey) || sRawText;

                return new StandardListItem(sId, {
                    title: sTranslatedTitle,
                    description: sTranslatedDesc
                });
            }
        });

        oSelectDialog.open("");
    }
}
