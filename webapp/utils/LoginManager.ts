import JSONModel from "sap/ui/model/json/JSONModel";
import MessageBox from "sap/m/MessageBox";
import ODataModel from "sap/ui/model/odata/v4/ODataModel";
import View from "sap/ui/core/mvc/View";
import Dialog from "sap/m/Dialog";
import Button from "sap/m/Button";
import Input from "sap/m/Input";
import Label from "sap/m/Label";

interface CustomerData {
    ID: string;
    categoryGroup: string;
    averageRating?: string | number;
    firstName?: string;
    lastName?: string;
}

/**
 * @namespace sap.capire.gameshop.utils
 */
export default class LoginManager {

    public static runLoginDialog(oView: View, oODataModel: ODataModel, oRoleModel: JSONModel): void {
        const oInput = new Input({
            placeholder: "Enter username (e.g. admin)"
        });

        const oDialog = new Dialog({
            title: "Log In",
            content: [
                new Label({ text: "Username", labelFor: oInput.getId() }),
                oInput
            ],
            beginButton: new Button({
                text: "OK",
                press: () => {
                    const sInputUsername: string = oInput.getValue().trim();
                    oDialog.close();

                    if (!sInputUsername) {
                        MessageBox.error("Username cannot be empty.");
                        return;
                    }

                    let sUserId = "";

                    if (sInputUsername.toLowerCase() === "admin") {
                        sUserId = "77777777-7777-7777-7777-777777777777";
                    } else {
                        MessageBox.error(`Login context for user "${sInputUsername}" is not configured.`);
                        return;
                    }

                    oView.setBusy(true);

                    const oContextBinding = oODataModel.bindContext(`/CustomerInsights('${sUserId}')`, undefined, {
                        $select: "ID,categoryGroup,averageRating,firstName,lastName"
                    });

                    oContextBinding.requestObject().then((oCustomerData: unknown) => {
                        oView.setBusy(false);

                        if (!oCustomerData) {
                            const oDefaultAdminProfile = {
                                isLoggedIn: true,
                                id: sUserId,
                                username: sInputUsername,
                                welcomeText: `Welcome, ${sInputUsername}!`,
                                averageRating: "0.00",
                                isCustomer: false,
                                isSalesManager: false,
                                isSupplier: false,
                                isCRMAdmin: true
                            };

                            window.localStorage.setItem("catConnect_userProfile", JSON.stringify(oDefaultAdminProfile));
                            oRoleModel.setData(oDefaultAdminProfile, false);
                            MessageBox.success(`Welcome back, ${oDefaultAdminProfile.username}!`);
                            return;
                        }

                        const oTypedData = oCustomerData as CustomerData;

                        const oUserProfile = {
                            isLoggedIn: true,
                            id: sUserId,
                            username: sInputUsername,
                            welcomeText: `Welcome, ${oTypedData.firstName || sInputUsername}!`,
                            averageRating: oTypedData.averageRating ? String(oTypedData.averageRating) : "0.00",
                            isCustomer: oTypedData.categoryGroup === "Customer" || oTypedData.categoryGroup === "VIP" || oTypedData.categoryGroup === "Premium",
                            isSalesManager: oTypedData.categoryGroup === "SalesManager",
                            isSupplier: oTypedData.categoryGroup === "Supplier",
                            isCRMAdmin: oTypedData.categoryGroup === "CRMAdmin" || sInputUsername.toLowerCase() === "admin"
                        };

                        window.localStorage.setItem("catConnect_userProfile", JSON.stringify(oUserProfile));
                        oRoleModel.setData(oUserProfile, false);

                        MessageBox.success(`Welcome back, ${oUserProfile.username}!`);
                    }).catch((oError: Error) => {
                        oView.setBusy(false);
                        console.error("[AUTODEV ODATA CRASH LOG]:", oError);

                        const oFallbackAdminProfile = {
                            isLoggedIn: true,
                            id: sUserId,
                            username: sInputUsername,
                            welcomeText: `Welcome, ${sInputUsername} (Fallback Mode)!`,
                            averageRating: "0.00",
                            isCustomer: false,
                            isSalesManager: false,
                            isSupplier: false,
                            isCRMAdmin: true
                        };

                        window.localStorage.setItem("catConnect_userProfile", JSON.stringify(oFallbackAdminProfile));
                        oRoleModel.setData(oFallbackAdminProfile, false);

                        MessageBox.success(`Welcome back, ${oFallbackAdminProfile.username}!`);
                    });
                }
            }),
            endButton: new Button({
                text: "Cancel",
                press: () => {
                    oDialog.close();
                }
            }),
            afterClose: () => {
                oDialog.destroy();
            }
        });

        oDialog.open();
    }
}
