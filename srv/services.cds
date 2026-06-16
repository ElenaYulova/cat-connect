using {sap.capire.gameshop as my} from '../db/schema';

/**
 * Service used by support personell.
 */
service ProcessorService {
    entity Products  as projection on my.Products;

    @readonly
    entity Customers as projection on my.Customers;
}

/**
 * Service used by administrators to manage customers and products.
 */
service AdminService {
    entity Customers as projection on my.Customers;
    entity Products  as projection on my.Products;
}
