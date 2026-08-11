using {sap.capire.gameshop as myApp} from '../db/schema';

type EligibilityResult {
    isBulkAvailable     : Boolean;
    averageRating       : Decimal(3, 2);
    bulkDiscountPercent : Decimal(3, 2);
    bulkMinQuantity     : Integer;
}

type CancelResult {
    success : Boolean;
}

@path: 'sales-order'
service SalesOrderService @(requires: 'authenticated-user',
// impl    : 'sales-service' - moved to package.json. TODO: delete if it is not necessary
) {

    // Main entities
    @odata.draft.enabled
    entity ClientProfile    as
        projection on myApp.crm.Customers {
            key ID,
                @readonly firstName,
                @readonly lastName,
                @readonly name,
                @readonly categoryGroup,
                @readonly averageRating,
                @readonly statusCode.code as customerStatus,

                email,
                phone,
                creditCardNo,
                city,
                postCode,
                streetAddress
        };


    @odata.draft.enabled
    entity Orders           as projection on myApp.salesorder.Orders
        actions {
            function checkBulkEligibility(qty: Integer) returns Boolean;
            @cds.odata.bindingparameter.name: '_it'
            action   cancelOrder(reasonCode: String(50),
                                 platformCode: String(50),
                                 comment: LargeString)  returns CancelResult;
        };

    entity OrderItems       as projection on myApp.salesorder.OrderItems;
    entity Carts            as projection on myApp.salesorder.Carts;
    entity CartItems        as projection on myApp.salesorder.CartItems;

    entity Products         as projection on myApp.salesorder.Products;

    entity Producers        as projection on myApp.salesorder.Producers;
    entity Categories       as projection on myApp.salesorder.Categories;

    @readonly
    entity EligibilityContext {
        key ID : UUID;
    }


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

    function getCartEligibilities(customer_ID: UUID) returns EligibilityResult;
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

annotate SalesOrderService.ClientProfile with @restrict: [
    {
        grant: [
            'READ',
            'UPDATE'
        ],
        to   : 'Customer',
        where: 'ID = $user.id'
    },
    {
        grant: 'READ',
        to   : 'authenticated-user',
        where: 'ID = $user.id'
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
    }];
    cancelOrder          @restrict: [{
        grant: 'invoke',
        to   : [
            'Customer',
            'SalesManager',
            'authenticated-user'
        ]
    }];
};

annotate SalesOrderService.getCartEligibilities @restrict: [{
    grant: 'invoke',
    to   : [
        'Customer',
        'SalesManager',
        'authenticated-user'
    ]
}];


// Annotations
annotate SalesOrderService.Products with {
    genre  @Common.Text: genre.name  @Common.TextArrangement: #TextOnly
};

// Redirections
annotate SalesOrderService.ClientProfile with @cds.redirection.target;


// TODO: delete when XSUAA switch on

annotate SalesOrderService.getCartEligibilities with @(requires: 'any');
annotate SalesOrderService.Orders with @(requires: 'any');
