import JSONModel from "sap/ui/model/json/JSONModel";
import MessageToast from "sap/m/MessageToast";
import Button from "sap/m/Button";

/**
 * @namespace sap.capire.gameshop.utils
 */
export default class CartManager {

    public static addToCart(oCartModel: JSONModel, sId: string, sTitle: string, fPrice: number, iQtyToAdd: number): void {
        if (!oCartModel) return;

        const oCartData = oCartModel.getData();
        const aItems = oCartData.items as any[];

        const oExistingItem = aItems.find(item => item.id === sId);

        if (oExistingItem) {

            oExistingItem.quantity += iQtyToAdd;
        } else {

            aItems.push({
                id: sId,
                title: sTitle,
                price: fPrice,
                quantity: iQtyToAdd
            });
        }

        let iTotalItems = 0;
        let fTotalPrice = 0;

        aItems.forEach(item => {
            iTotalItems += item.quantity;
            fTotalPrice += item.price * item.quantity;
        });

        oCartData.totalItems = iTotalItems;
        oCartData.totalPrice = parseFloat(fTotalPrice.toFixed(2));

        // Rewriting Cart Icon Badge
        oCartModel.setData(oCartData, false);


        MessageToast.show(`Added ${iQtyToAdd} copy(ies) of "${sTitle}" to cart!`);
    }
}
