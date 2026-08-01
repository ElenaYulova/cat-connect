using {sap.capire.gameshop as myApp} from '../db/schema';

service SalesOrderService @(requires: 'authenticated-user') {

    // Main entities

    entity Orders           as projection on myApp.salesorder.Orders
        actions {
            function checkBulkEligibility(qty: Integer) returns Boolean;
        };

    entity OrderItems       as projection on myApp.salesorder.OrderItems;
    entity Carts            as projection on myApp.salesorder.Carts;
    entity CartItems        as projection on myApp.salesorder.CartItems;

    entity Products         as projection on myApp.salesorder.Products;

    entity Producers        as projection on myApp.salesorder.Producers;
    entity Categories       as projection on myApp.salesorder.Categories;

    // CRM & System Insights (Read-Only in this service)
    @readonly
    entity CustomerInsights as
        projection on myApp.crm.Customers {
            key ID,
                firstName,
                lastName,
                name,
                categoryGroup,
                averageRating,
                statusCode.code as customerStatus
        };

    entity Feedbacks        as projection on myApp.crm.Feedbacks;

    @readonly
    entity OrderStatusCode  as projection on myApp.salesorder.OrderStatusCode;
}


// Restrictions

annotate SalesOrderService.Products with @cds.redirection.target;

annotate SalesOrderService.Orders with @restrict: [
    {
        grant: [
            'READ',
            'CREATE',
            'UPDATE'
        ],
        to   : 'Customer',
        where: 'customer_id = $user.id'
    },
    {
        grant: [
            'READ',
            'CREATE',
            'UPDATE'
        ],
        to   : 'SalesManager'
    },
    {
        grant: 'READ',
        to   : 'Supplier'
    },
    {
        grant: '*',
        to   : 'CRMAdmin'
    }
];


annotate SalesOrderService.Products with @restrict: [
    {
        grant: 'READ',
        to   : [
            'Customer',
            'SalesManager',
            'authenticated-user'
        ]
    },
    {
        grant: '*',
        to   : [
            'Supplier',
            'CRMAdmin'
        ]
    }
];

annotate SalesOrderService.Carts with @restrict: [
    {
        grant: '*',
        to   : 'Customer',
        where: 'customer_id = $user.id'
    },
    {
        grant: 'READ',
        to   : 'SalesManager'
    },
    {
        grant: '*',
        to   : 'CRMAdmin'
    }
];

annotate SalesOrderService.Feedbacks with @restrict: [
    {
        grant: [
            'READ',
            'insert'
        ],
        to   : [
            'Customer',
            'SalesManager'
        ]
    },
    {
        grant: '*',
        to   : ['CRMAdmin']
    }
];

// Actions & Functions

annotate SalesOrderService.Orders actions {
    checkBulkEligibility @restrict: [{
        grant: 'invoke',
        to   : [
            'Customer',
            'SalesManager'
        ]
    }]
};


// Annotations
annotate SalesOrderService.Products with {
    genre  @Common.Text: genre.name  @Common.TextArrangement: #TextOnly
};
