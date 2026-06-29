using {sap.capire.gameshop as myApp} from '../db/schema';

service CrmService @(requires: [
    'CRMAdmin',
    'SalesManager',
    'SupportAgent'
]) {

    // Main editable entity
    @odata.draft.enabled
    entity Customers              as projection on myApp.crm.Customers;

    // CRM Entities
    entity Interactions           as projection on myApp.crm.Interactions;
    entity Feedbacks              as projection on myApp.crm.Feedbacks;
    entity CustomersToPreferences as projection on myApp.crm.CustomersToPreferences;
    entity Preferences            as projection on myApp.crm.Preferences;

    // Sales Order Entities
    @readonly
    entity Orders                 as projection on myApp.salesorder.Orders;

    @readonly
    entity OrderItems             as projection on myApp.salesorder.OrderItems;

    @readonly
    entity Products               as projection on myApp.salesorder.Products;

    @readonly
    entity Categories             as projection on myApp.salesorder.Categories;

    @readonly
    entity Producers              as projection on myApp.salesorder.Producers;

    // System enums
    @readonly
    entity CustomerStatusCode     as projection on myApp.crm.CustomerStatusCode;

    @readonly
    entity InteractionMethod      as projection on myApp.crm.InteractionMethod;

    @readonly
    entity OrderStatusCode        as projection on myApp.salesorder.OrderStatusCode;

    // Restrictions

    annotate CrmService.Customers with @restrict: [
        {
            grant: '*',
            to   : 'CRMAdmin'
        },
        {
            grant: [
                'READ',
                'UPDATE'
            ],
            to   : 'SalesManager'
        },
        {
            grant: 'READ',
            to   : 'SupportAgent'
        }
    ];

    annotate CrmService.Interactions with @restrict: [
        {
            grant: '*',
            to   : 'CRMAdmin'
        },
        {
            grant: [
                'READ',
                'CREATE'
            ],
            to   : 'SalesManager'
        },
        {
            grant: 'READ',
            to   : 'SupportAgent'
        }
    ];

    annotate CrmService.Feedbacks with @restrict: [
        {
            grant: '*',
            to   : 'CRMAdmin'
        },
        {
            grant: 'READ',
            to   : [
                'SalesManager',
                'SupportAgent'
            ]
        }
    ];
}
