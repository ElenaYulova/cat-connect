using {sap.capire.gameshop as myApp} from '../db/schema';

service SalesOrderService {

    // Main editable entities
    entity Products        as projection on myApp.salesorder.Products;
    entity Producers       as projection on myApp.salesorder.Producers;
    entity Orders          as projection on myApp.salesorder.Orders;
    entity OrderItems      as projection on myApp.salesorder.OrderItems;

    // System enums
    @readonly
    entity Categories      as projection on myApp.salesorder.Categories;

    @readonly
    entity OrderStatusCode as projection on myApp.salesorder.OrderStatusCode;
}
