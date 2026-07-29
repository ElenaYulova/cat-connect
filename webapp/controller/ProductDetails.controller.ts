import Controller from "sap/ui/core/mvc/Controller";
import UIComponent from "sap/ui/core/UIComponent";
import Event from "sap/ui/base/Event";
import JSONModel from "sap/ui/model/json/JSONModel";
import MessageToast from "sap/m/MessageToast";
import Image from "sap/m/Image";
import CartManager from "../utils/CartManager";
import Control from "sap/ui/core/Control";

export default class ProductDetails extends Controller {

    public onInit(): void {
        const oRouter = UIComponent.getRouterFor(this);
        oRouter.getRoute("ProductDetails")?.attachPatternMatched(this._onObjectMatched, this);

    }

    private _onObjectMatched(oEvent: Event): void {
        const oUi5Event = oEvent as any;
        const oArgs = oUi5Event.getParameter("arguments");

        if (oArgs && oArgs.productId) {
            const sProductId = oArgs.productId as string;
            const oView = this.getView();

                        oView?.bindElement({
                path: `/Products(${sProductId})`,
                parameters: {
                    $$updateGroupId: "detailsUpdateGroup",
                    "$expand": "genre($select=name)"
                },
                events: {
                    dataReceived: () => {
                        // 🎯 НАШ ГЛАВНЫЙ АРХИТЕКТУРНЫЙ ЩИТ: Уводим переключение UI в конец очереди макрозадач!
                        // Даем OData v4 спокойно дочитать свойства, полностью уничтожая ошибку "Must not change a property"!
                        setTimeout(() => {
                            const oContext = oView?.getBindingContext();
                            if (!oContext) return;

                            const iStock = oContext.getProperty("stock") as number;

                            const oInStockContainer = this.byId("inStockContainer") as Control;
                            const oOutOfStockMessage = this.byId("outOfStockMessage") as Control;

                            if (oInStockContainer && oOutOfStockMessage) {
                                if (iStock > 0 && iStock !== null) {
                                    oInStockContainer.setVisible(true);
                                    oOutOfStockMessage.setVisible(false);
                                    const oStepInput = this.byId("quantityInput") as any;
                                    if (oStepInput && typeof oStepInput.setMax === "function") {
                                        oStepInput.setMax(iStock);
                                    }
                                } else {
                                    oInStockContainer.setVisible(false);
                                    oOutOfStockMessage.setVisible(true);
                                }
                            }
                        }, 0);
                    }
                }
            });

        }
    }

    // 🎯 НАШ НОВЫЙ ОБРАБОТЧИК КНОПКИ КОРЗИНЫ НА СТРАНИЦЕ ТОВАРА
    public onAddToCart(): void {
        const oView = this.getView();
        const oContext = oView?.getBindingContext();
        if (!oContext) return;

        // Вытягиваем данные конкретной игры из OData v4 контекста страницы
        const sId = oContext.getProperty("ID") as string;
        const sTitle = oContext.getProperty("title") as string;
        const fPrice = oContext.getProperty("price") as number;

        // Считываем точное число копий из нашего StepInput фрагмента
        const oStepInput = this.byId("quantityInput") as any;
        const iQuantity = oStepInput ? oStepInput.getValue() : 1;

        // Достаем глобальную модель корзины из ядра приложения
        const oCartModel = this.getOwnerComponent()?.getModel("cart") as JSONModel;

        // Складываем в корзину! Менеджер пересчитает массив и зажжёт твои красивые зелёные скобочки в шапке!
        CartManager.addToCart(oCartModel, sId, sTitle, fPrice, iQuantity);
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
