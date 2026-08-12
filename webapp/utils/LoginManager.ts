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
        const oBundle = (sap.ui.getCore().getModel("i18n") as any)?.getResourceBundle();
        const sGroup = oData?.categoryGroup || "";
        const bIsAdmin = sGroup === "CRMAdmin" || sUsername === "admin";

        // 🎯 БРОНЕБОЙНЫЙ ПЕРЕХВАТ ИМЕНИ: Проверяем firstName, полное name, а если всё пусто — берем ник
        const sUserDisplayName = oData?.firstName || (oData as any)?.name || sUsername;

        const sWelcomePattern = !oData && bIsAdmin ? "loginManager.profile.welcomeFallback" : "loginManager.profile.welcome";
        const sWelcomeText = oBundle?.getText(sWelcomePattern, [sUserDisplayName]) || `Welcome, ${sUserDisplayName}!`;

        return {
            isLoggedIn: true,
            id: sId || oData?.ID || "00000000-0000-0000-0000-000000000000",
            username: sUsername,
            welcomeText: sWelcomeText,
            averageRating: oData?.averageRating ? String(oData.averageRating) : "0.00",
            isCustomer: ["Customer", "VIP", "Premium"].includes(sGroup),
            isSalesManager: sGroup === "SalesManager",
            isSupplier: sGroup === "Supplier",
            isCRMAdmin: bIsAdmin
        };
    }

    /**
     * Silent Auto-Login Entry Point
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
        const bIsBasPreview = sHostname.includes("applicationstudio.cloud.sap");

        if (bIsBasPreview) {
            console.log("[AUTODEV LOG]: BAS preview proxy detected. Bypassing user-api manifest model to prevent core crash.");
            return;
        }

        const oUserInfoModel = oView.getModel("userInfo") as JSONModel;
        if (!oUserInfoModel) {
            console.log("[AUTODEV LOG]: Security userInfo model is missing in application context.");
            return;
        }

        if (oUserInfoModel.getProperty("/name")) {
            this._fetchUsernameFromModel(oView, oODataModel, oRoleModel);
        } else {
            oUserInfoModel.attachEventOnce("requestCompleted", () => {
                this._fetchUsernameFromModel(oView, oODataModel, oRoleModel);
            }, this);
        }
    }


    /**
     * Extract authenticated username from context model
     */
    private static _fetchUsernameFromModel(oView: View, oODataModel: ODataModel, oRoleModel: JSONModel): void {
        const oUserInfoModel = oView.getModel("userInfo") as JSONModel;
        if (!oUserInfoModel) {
            console.log("[AUTODEV LOG]: Critical - userInfo model went missing during async flight.");
            return;
        }

        const sSessionUsername = oUserInfoModel.getProperty("/name") as string;
        if (!sSessionUsername) {
            console.log("[AUTODEV LOG]: Anonymous run or empty user name in session. Staying in Guest mode.");
            return;
        }

        console.log("[AUTODEV LOG]: Active authentication session intercepted for user: " + sSessionUsername);

        this._resolveUserContext(oView, oODataModel, oRoleModel, sSessionUsername);
    }

    /**
 * Resolve fully expanded user and customer context in a single shot
 */
    private static _resolveUserContext(oView: View, oODataModel: ODataModel, oRoleModel: JSONModel, sUsername: string): void {
        oView.setBusy(true);

        // Запрашиваем Users и принудительно раскрываем объект customer за один вызов
        const oUsersBinding = oODataModel.bindList("/Users", undefined, undefined, undefined, {
            $filter: `username eq '${sUsername}'`,
            $expand: "customer"
        });

        oUsersBinding.requestContexts(0, 1)
            .then((aContexts: any[]) => {
                if (aContexts && aContexts.length > 0) {
                    const oUserRow = aContexts[0].getObject();
                    const sBusinessId = oUserRow.businessId;
                    const sRole = oUserRow.userRole || "Customer";

                    // 🎯 ОДНОСТУПЕНЧАТЫЙ СБОР ПРОФИЛЯ: Данные кастомера уже сидят внутри oUserRow.customer!
                    if (oUserRow.customer) {
                        // Передаем готовый вложенный объект customer прямо в билдер профиля
                        this._saveProfile(this._buildProfile(sBusinessId, sUsername, oUserRow.customer as CustomerData), oRoleModel);
                    } else {
                        // Фолбек для админов/поставщиков без привязки к таблице кастомеров
                        const oMockCustomer: CustomerData = { ID: sBusinessId || "00000000-0000-0000-0000-000000000000", categoryGroup: sRole };
                        this._saveProfile(this._buildProfile(oMockCustomer.ID, sUsername, oMockCustomer), oRoleModel);
                    }
                } else {
                    console.log("[AUTODEV LOG]: User not found in access matrix. Staying in Guest mode.");
                }
            })
            .catch((oError: any) => {
                console.error("[AUTODEV ODATA CRASH LOG]: Context mapping resolution failed", oError);
            })
            .finally(() => {
                oView.setBusy(false);
            });
    }


    /**
     * Manual login
     */

    public static runLoginDialog(oView: View, oODataModel: ODataModel, oRoleModel: JSONModel): void {
        const oBundle = (sap.ui.getCore().getModel("i18n") as any)?.getResourceBundle();
        const oInput = new Input({ placeholder: "Enter username" });
        const oDialog = new Dialog({
            title: oBundle?.getText("loginManager.dialog.title") || "Log In",
            content: [
                new Label({ text: oBundle?.getText("loginManager.dialog.usernameLabel") || "Username", labelFor: oInput.getId() }),
                oInput
            ],
            beginButton: new Button({
                text: oBundle?.getText("loginManager.dialog.buttonOk") || "OK",
                press: () => {
                    const sUser: string = oInput.getValue().trim();
                    oDialog.close();
                    // Validate input
                    if (!sUser) {
                        MessageBox.error(oBundle?.getText("loginManager.message.emptyUsername") || "Username cannot be empty.");
                        return;
                    }
                    oView.setBusy(true);
                    const oUsersBinding = oODataModel.bindList("/Users", undefined, undefined, undefined, {
                        $filter: `username eq '${sUser}'`,
                        $expand: "customer"
                    });

                    oUsersBinding.requestContexts(0, 1)
                        .then((aContexts: any[]) => {
                            if (aContexts && aContexts.length > 0) {
                                const oUserRow = aContexts[0].getObject();
                                const sBusinessId = oUserRow.businessId;
                                const sRole = oUserRow.userRole || "Customer";

                                if (sBusinessId && sRole === "Customer") {
                                    return oODataModel.bindContext(`/CustomerInsights('${sBusinessId}')`).requestObject()
                                        .then((oCustomerData: any) => {
                                            this._saveProfile(this._buildProfile(sBusinessId, sUser, oCustomerData), oRoleModel, oBundle?.getText("loginManager.message.welcomeBack", [sUser]) || `Welcome back, ${sUser}!`);
                                        });
                                } else {
                                    const oMockCustomer = { ID: sBusinessId || "00000000-0000-0000-0000-000000000000", categoryGroup: sRole };
                                    this._saveProfile(this._buildProfile(oMockCustomer.ID, sUser, oMockCustomer as any), oRoleModel, oBundle?.getText("loginManager.message.welcomeBack", [sUser]) || `Welcome back, ${sUser}!`);
                                }
                            } else {
                                MessageBox.error(`User "${sUser}" is not configured in access matrix table.`);
                            }
                        })
                        .catch((oError: any) => {
                            console.error("[AUTODEV ODATA CRASH LOG]:", oError);
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
