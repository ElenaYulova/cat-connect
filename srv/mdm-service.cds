using {sap.capire.gameshop as myApp} from '../db/schema';

service MdmService @(requires: 'CRMAdmin') {
    @odata.draft.enabled
    entity Products  as projection on myApp.salesorder.Products;

    @odata.draft.enabled
    entity Producers as projection on myApp.salesorder.Producers;
}
