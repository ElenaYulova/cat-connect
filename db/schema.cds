using {
    sap.common.CodeList,
    Currency,
    cuid,
    managed
} from '@sap/cds/common';

namespace sap.capire.gameshop;

// ==========================================
// Aspects
// ==========================================

aspect Address : {
    city          : String;
    postCode      : String;
    streetAddress : String;
}

// ==========================================
// Entities
// ==========================================

/**
* Context: Sales order
*/
context salesorder {
    entity Products : cuid, managed {
        title     : localized String(111)    @mandatory;
        descr     : localized String(1111);
        producer  : Association to Producers @mandatory;
        genre     : Association to Categories;
        stock     : Integer;
        price     : Price;
        currency  : Currency;
        image     : Image;
        feedbacks : Association to many crm.Feedbacks
                        on feedbacks.product = $self;
    }

    entity Producers : cuid, managed, Address {
        name     : String(111) @mandatory;
        existing : Boolean default 1;
        products : Association to many Products
                       on products.producer = $self;
    }

    entity Categories : CodeList {
        key ID       : UUID;
            parent   : Association to Categories;
            children : Composition of many Categories
                           on children.parent = $self;
    }

    entity Orders : cuid, managed {
        orderNumber : String(20) @title: 'Order Number';
        customer    : Association to crm.Customers;
        totalAmount : Price      @readonly;
        currency    : Currency;
        status      : Association to OrderStatus default 'N';
        items       : Composition of many OrderItems
                          on items.parent = $self;
    }

    entity OrderItems : cuid {
        parent   : Association to Orders;
        game     : Association to Products;
        quantity : Integer @assert.range: [
            1,
            99
        ];
    }

    entity OrderStatus : CodeList {
        key code        : String enum {
                new = 'N';
                in_process = 'P';
                completed = 'C';
            };
            criticality : Integer;
    }
}


/**
* Context: CRM
*/

context crm {
    entity Customers : cuid, managed, Address {
        firstName     : String;
        lastName      : String;
        name          : String = trim(firstName || ' ' || lastName);
        email         : EMailAddress;
        phone         : PhoneNumber;
        orders        : Association to many Orders
                            on orders.customer = $self;
        creditCardNo  : CardNumber;
        categoryGroup : String(50);
        averageRating : Decimal(3, 2);
        statusCode    : Association to CustomerStatusCode;
        interactions  : Composition of many Interactions
                            on interactions.customer = $self;
        preferences   : Association to many CustomersToPreferences
                            on preferences.customer = $self;
        feedbacks     : Association to many Feedbacks
                            on feedbacks.customer = $self;

    }

    entity Preferences : cuid {
        productCategory : Association to salesorder.Categories;
        notes           : String(255);
    }

    entity CustomersToPreferences : cuid {
        customer   : Association to Customers;
        preference : Association to Preferences;
    }

    entity Feedbacks : cuid, managed {
        customer     : Association to Customers;
        product      : Association to salesorder.Products;
        rating       : Integer;
        comments     : String(1000);
        feedbackDate : Date;
    }

    entity Interactions : cuid, managed {
        customer : Association to Customers;
        date     : DateTime;
        method   : Association to InteractionMethod;
        summary  : String(500);
    }

    entity CustomerStatusCode : CodeList {
        key code        : String enum {
                active = 'A';
                inactive = 'I';
                at_risk = 'R';
            };
            criticality : Integer;
    }

    entity InteractionMethod : CodeList {
        key code        : String enum {
                order = 'O';
                feedback = 'F';
                support = 'S';
            };
            criticality : Integer;
    }
}


// ==========================================
// Types
// ==========================================

type Price        : Decimal(9, 2);
type EMailAddress : String(255) @assert.format: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$';
type PhoneNumber  : String(30) @assert.format: '^\+?[0-9\s\-()]{7,20}$';
type CardNumber   : String(16) @assert.format: '^[1-9]\d{15}$';
type Image        : LargeBinary @Core.MediaType: 'image/jpeg'
