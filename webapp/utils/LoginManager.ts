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

interface UserProfile {
    isLoggedIn: boolean;
    id: string;
    username: string;
    welcomeText: string;
    averageRating: string;
    isCustomer: boolean;
    isSalesManager: boolean;
    isSupplier: boolean;
    isCRMAdmin: boolean;
}

interface UserApiUserInfo {
    name: string;
    firstname?: string;
    lastname?: string;
}

/**
 * @namespace sap.capire.gameshop.utils
 */
export default class LoginManager {

    // Cashing
    private static _saveProfile(oProfile: UserProfile, oRoleModel: JSONModel, sSuccessMsg?: string): void {
        window.localStorage.setItem("catConnect_userProfile", JSON.stringify(oProfile));
        oRoleModel.setData(oProfile, false);
        if (sSuccessMsg) {
            MessageBox.success(sSuccessMsg);
        }
    }

    private static _buildProfile(sId: string, sUsername: string, oData?: CustomerData): UserProfile {
        const sGroup = oData?.categoryGroup || "";
        const bIsAdmin = sGroup === "CRMAdmin" || sUsername === "admin";

        return {
            isLoggedIn: true,
            id: sId || oData?.ID || "00000000-0000-0000-0000-000000000000",
            username: sUsername,
            welcomeText: `Welcome, ${oData?.firstName || sUsername}${!oData && bIsAdmin ? " (Fallback Mode)" : ""}!`,
            averageRating: oData?.averageRating ? String(oData.averageRating) : "0.00",
            isCustomer: ["Customer", "VIP", "Premium"].includes(sGroup),
            isSalesManager: sGroup === "SalesManager",
            isSupplier: sGroup === "Supplier",
            isCRMAdmin: bIsAdmin
        };
    }
    /**
     * Silent Auto-Login
     */
    public static checkSilentLogin(oView: View, oODataModel: ODataModel, oRoleModel: JSONModel): void {

        const sSavedUserJson: string | null = window.localStorage.getItem("catConnect_userProfile");
        if (sSavedUserJson) {
            try {
                const oUserProfile = JSON.parse(sSavedUserJson) as UserProfile;
                if (oUserProfile && oUserProfile.isLoggedIn) {
                    oRoleModel.setData(oUserProfile, false);
                    console.log("[AUTODEV LOG]: Session successfully restored from local cache.");
                    return;
                }
            } catch (e) {
                console.error("[AUTODEV LOG]: Failed to parse user profile session from localStorage.");
            }
        }

        const sHostname = window.location.hostname;
        if (sHostname === "localhost" || sHostname === "127.0.0.1") {
            console.log("[AUTODEV LOG]: Localhost environment detected. Skipping AppRouter network ping. Application initialized in Guest mode.");
            return;
        }

        const oUserApiModel = new JSONModel();
        const oLoadPromise = oUserApiModel.loadData("/user-api/currentUser", undefined, true, "GET");

        if (oLoadPromise) {
            oLoadPromise.then(() => {
                const oRawData: unknown = oUserApiModel.getData();

                if (oRawData && typeof oRawData === "object" && "name" in oRawData) {
                    const oUserInfo = oRawData as Record<string, unknown>;
                    const sSessionUsername = oUserInfo.name as string;

                    if (!sSessionUsername) {
                        console.log("[AUTODEV LOG]: Empty user name in session. Staying in Guest mode.");
                        return;
                    }

                    console.log("[AUTODEV LOG]: Active session detected for user: " + sSessionUsername);

                    let sUserId = "";
                    if (sSessionUsername === "admin") {
                        sUserId = "77777777-7777-7777-7777-777777777777";
                    }

                    if (sUserId) {
                        oView.setBusy(true);
                        const oBinding = oODataModel.bindContext(`/CustomerInsights('${sUserId}')`);

                        oBinding.requestObject()
                            .then((oCustomerData: unknown) => {
                                const oProfile = this._buildProfile(sUserId, sSessionUsername, oCustomerData as CustomerData);
                                this._saveProfile(oProfile, oRoleModel);
                                console.log("[AUTODEV LOG]: Silent Auto-Login successful. Client cache filled.");
                            })
                            .catch((oError: unknown) => {
                                console.error("[AUTODEV ODATA CRASH LOG]:", oError);
                                const oFallbackProfile = this._buildProfile(sUserId, sSessionUsername);
                                this._saveProfile(oFallbackProfile, oRoleModel);
                            })
                            .finally(() => {
                                oView.setBusy(false);
                            });
                    }
                } else {
                    console.log("[AUTODEV LOG]: Invalid data structure received from user-api.");
                }
            }).catch(() => {
                console.log("[AUTODEV LOG]: AppRouter endpoint is unavailable.");
            });
        }
    }

    /**
     * Manual login
     */
    public static runLoginDialog(oView: View, oODataModel: ODataModel, oRoleModel: JSONModel): void {
        const oInput = new Input({ placeholder: "Enter username" });

        const oDialog = new Dialog({
            title: "Log In",
            content: [new Label({ text: "Username", labelFor: oInput.getId() }), oInput],
            beginButton: new Button({
                text: "OK",
                press: () => {
                    const sUser: string = oInput.getValue().trim();
                    oDialog.close();

                    if (!sUser) {
                        MessageBox.error("Username cannot be empty.");
                        return;
                    }
                    if (sUser !== "admin") {
                        MessageBox.error(`Login context for user "${sUser}" is not configured.`);
                        return;
                    }

                    const sAdminId = "77777777-7777-7777-7777-777777777777";
                    oView.setBusy(true);

                    const oBinding = oODataModel.bindContext(`/CustomerInsights('${sAdminId}')`);
                    oBinding.requestObject()
                        .then((oCustomerData: unknown) => {
                            const oProfile = this._buildProfile(sAdminId, sUser, oCustomerData as CustomerData);
                            this._saveProfile(oProfile, oRoleModel, `Welcome back, ${sUser}!`);
                        })
                        .catch((oError: unknown) => {
                            console.error("[AUTODEV ODATA CRASH LOG]:", oError);
                            const oFallbackProfile = this._buildProfile(sAdminId, sUser);
                            this._saveProfile(oFallbackProfile, oRoleModel, `Welcome back, ${sUser}!`);
                        })
                        .finally(() => {
                            oView.setBusy(false);
                        });
                }
            }),
            endButton: new Button({ text: "Cancel", press: () => oDialog.close() }),
            afterClose: () => oDialog.destroy()
        });

        oDialog.open();
    }
}
