using {sap.capire.gameshop as my} from '../db/schema';

/**
 * Service used by user to browse products.
 */
service UserService {
    @readonly
    entity Products as projection on my.Products;
    @readonly
    entity Categories as projection on my.Categories;
}
