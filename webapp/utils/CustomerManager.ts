import JSONModel from "sap/ui/model/json/JSONModel";
import ODataModel from "sap/ui/model/odata/v4/ODataModel";
import View from "sap/ui/core/mvc/View";

interface UserApiUserInfo {
    name: string;
    firstname?: string;
    lastname?: string;
}

interface LocalCacheProfile {
    isLoggedIn: boolean;
    id: string;
    username: string;
}

/**
 * @namespace sap.capire.gameshop.utils
 */
export default class CustomerManager {

    // true — mock realization (ID from localStorage)
    // false — localStorage just in localhost
    private static readonly isTestingVersion: boolean = true;

    /**
     Get Customer ID to create Client Page
     */
    public static async getCurrentCustomerId(oView: View, oODataModel: ODataModel): Promise<string> {

        if (this.isTestingVersion) {
            console.log("[AUTODEV CUSTOMER LOG]: Testing Mode active. Fetching ID directly from localStorage.");
            return this._getIdFromLocalStorage();
        }

        const sHostname = window.location.hostname;

        if (sHostname === "localhost" || sHostname === "127.0.0.1") {
            console.log("[AUTODEV CUSTOMER LOG]: Production Mode active on localhost. Using localStorage fallback.");
            return this._getIdFromLocalStorage();
        }
        console.log("[AUTODEV CUSTOMER LOG]: Production Mode active in Cloud. Intercepting AppRouter session...");
        const oUserApiModel = new JSONModel();
        const oLoadPromise = oUserApiModel.loadData("/user-api/currentUser", undefined, true, "GET");

        if (!oLoadPromise) {
            throw new Error("Failed to initialize AppRouter session promise.");
        }

        try {
            await oLoadPromise;
            const oRawData: unknown = oUserApiModel.getData();

            if (!oRawData || typeof oRawData !== "object" || !("name" in oRawData)) {
                throw new Error("Invalid session data structure received from user-api.");
            }

            const oUserInfo = oRawData as Record<string, unknown>;
            const sSessionUsername = oUserInfo.name as string;

            if (!sSessionUsername) {
                throw new Error("Session username is empty.");
            }

            if (sSessionUsername === "admin") {
                return "77777777-7777-7777-7777-777777777777";
            }
            return "";

        } catch (oError) {
            console.error("[AUTODEV CUSTOMER LOG]: Cloud session capture failed:", oError);
            throw oError;
        }
    }

    public static getBindingPath(sCustomerId: string): string {
        if (!sCustomerId) {
            return "";
        }
        return `/Customers(ID='${sCustomerId}',IsActiveEntity=true)`;
    }

    /**
     * Safe ID Extraction
     */
    private static _getIdFromLocalStorage(): string {
        const sSavedUserJson = window.localStorage.getItem("catConnect_userProfile");
        if (!sSavedUserJson) {
            console.warn("[AUTODEV CUSTOMER LOG]: No profile found in localStorage. User is Guest.");
            return "";
        }

        try {
            const oUserProfile = JSON.parse(sSavedUserJson) as LocalCacheProfile;
            return oUserProfile?.id || "";
        } catch (e) {
            console.error("[AUTODEV CUSTOMER LOG]: Failed to parse user profile from localStorage.");
            return "";
        }
    }
}
