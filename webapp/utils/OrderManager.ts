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

/**
 * Enterprise Sales Order Business Logic Pipeline
 * Centralized utility to encapsulate financial math and transactional UI triggers.
 */
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

        if (fSaving > 0) {
            oDiscountAttr.setText(`Your Loyalty Saving: ${fSaving} USD`);
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
        if (!oUserRoles || !oOrderData) return;

        const bIsAdmin = oUserRoles.getProperty("/isAdmin") === true;
        const bIsCRMAdmin = oUserRoles.getProperty("/isCRMAdmin") === true;
        const bIsManager = oUserRoles.getProperty("/isSalesManager") === true;

        if (bIsAdmin || bIsCRMAdmin || bIsManager) return;

        const sSavedUserJson = window.localStorage.getItem("catConnect_userProfile");
        if (sSavedUserJson) {
            const oUserData = JSON.parse(sSavedUserJson) as { id?: string };
            if (oOrderData.customer_ID !== oUserData.id) {
                MessageBox.error("Access Denied: You cannot view other customers' orders.", {
                    onClose: () => {
                        if (typeof (oController as any).onNavBack === "function") {
                            (oController as any).onNavBack();
                        }
                    }
                });
            }
        }
    }

    public static async checkAndPrepareReviewContainer(oController: any, oOrderData: any): Promise<void> {
        const oView = oController.getView();
        const oLocalModel = oView?.getModel("localView") as JSONModel | undefined;
        if (!oView || !oLocalModel || !oOrderData) return;

        const sStatus = oOrderData.status_code;
        const sOrderId = oOrderData.ID;

        const bIsCompleted = (sStatus === "completed" || sStatus === "C");

        if (!bIsCompleted) {
            oLocalModel.setProperty("/isReviewLocked", true);
            oLocalModel.setProperty("/isReviewFormVisible", false);
            oLocalModel.setProperty("/isReviewReadOnlyVisible", false);
            return;
        }

        oLocalModel.setProperty("/isReviewLocked", false);


        const oODataModel = oView.getModel() as ODataModel;
        const sCustomerId = oOrderData.customer?.ID || oOrderData.customer_ID;
        const sFakeStoreProductId = "44444444-4444-4444-4444-444444444444";

        oView.setBusy(true);
        try {
            const oListBinding = oODataModel.bindList("/Feedbacks", undefined, undefined, undefined, {
                $filter: `customer_ID eq ${sCustomerId} and product_ID eq ${sFakeStoreProductId} and contains(comments,'${sOrderId}')`
            }) as ODataListBinding;

            const aContexts = await oListBinding.requestContexts(0, 1);
            oView.setBusy(false);

            if (aContexts && aContexts.length > 0) {
                const oSavedReview = aContexts[0].getObject() as { rating: number, comments: string };

                oLocalModel.setProperty("/isReviewFormVisible", false);
                oLocalModel.setProperty("/isReviewReadOnlyVisible", true);

                const sCleanComment = oSavedReview.comments.replace(`[Order_ID: ${sOrderId}]`, "").trim();

                (oView.byId("savedRatingIndicator") as RatingIndicator)?.setValue(oSavedReview.rating);
                (oView.byId("savedCommentText") as Text)?.setText(sCleanComment);
            } else {
                const sCurrentDisplayedText = (oView.byId("savedCommentText") as Text)?.getText() || "";
                if (sCurrentDisplayedText.trim()) {
                    oLocalModel.setProperty("/isReviewFormVisible", false);
                    oLocalModel.setProperty("/isReviewReadOnlyVisible", true);
                } else {
                    oLocalModel.setProperty("/isReviewFormVisible", true);
                    oLocalModel.setProperty("/isReviewReadOnlyVisible", false);
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

        const iRating = Math.max(1, oRatingCtrl?.getValue() || 5);
        const sComment = oTextCtrl?.getValue()?.trim() || "";

        if (!sComment) {
            MessageBox.warning("Please enter your review text before submitting.");
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

            MessageBox.success("Thank you! Your store review has been successfully submitted and factored into your loyalty profile.");
        } catch (oError: any) {
            MessageBox.error(oError?.message || "Failed to save your review.");
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
}
