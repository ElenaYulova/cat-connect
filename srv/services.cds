using {sap.capire.gameshop as my} from '../db/schema';

/**
 * Service used by support personell to manage orders
 */
service ProcessorService {
    entity Orders     as projection on my.Orders;
    entity OrderItems as projection on my.OrderItems;
    entity Customers  as projection on my.Customers;

    @readonly
    entity Products   as projection on my.Products;
}