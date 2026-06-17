using {sap.capire.gameshop as my} from '../db/schema';

/**
 * Service used by administrators to manage data.
 */
service AdminService {
    entity Customers  as projection on my.Customers;
    entity Products   as projection on my.Products;
    entity Categories as projection on my.Categories;
    entity Producers  as projection on my.Producers;
    entity Orders     as projection on my.Orders;
    entity OrderItems as projection on my.OrderItems;
}

annotate AdminService.Products with @odata.draft.enabled;
