type ValueState = "Success" | "Warning" | "Error" | "None";

/**
 * @namespace sap.capire.gameshop.model
 */
const formatter = {
    /**
     * Converts criticality number from CAP database into Fiori ValueState
     * @param {number} iCriticality - Criticality integer (1, 2, 3)
     */
    statusState: function(iCriticality: number): ValueState {
        switch (iCriticality) {
            case 3:
                return "Success"; // Green
            case 2:
                return "Warning"; // Yellow
            case 1:
                return "Error";   // Red
            default:
                return "None";    // Neutral
        }
    },

    /**
     * Maps criticality to native Fiori icons
     */
    statusIcon: function(iCriticality: number): string {
        switch (iCriticality) {
            case 3:
                return "sap-icon://sys-enter-2";
            case 2:
                return "sap-icon://status-in-process";
            case 1:
                return "sap-icon://error";
            default:
                return "sap-icon://document";
        }
    }
};

export default formatter;
