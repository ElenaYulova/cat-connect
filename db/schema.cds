using {
    sap.common.CodeList,
    Currency,
    cuid,
    managed
} from '@sap/cds/common';

namespace sap.capire.gameshop;

// Aspects

aspect Address : {
    city          : String;
    postCode      : String;
    streetAddress : String;
}

// Entities

/**
* Products and Producers.
*/
entity Products : cuid, managed {
    title    : localized String(111)    @mandatory;
    descr    : localized String(1111);
    producer : Association to Producers @mandatory;
    genre    : Association to Categories;
    stock    : Integer;
    price    : Price;
    currency : Currency;
    image    : Image;
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


/**
* Customers and Orders.
*/

entity Customers : cuid, managed, Address {
    firstName    : String;
    lastName     : String;
    name         : String = trim(firstName || ' ' || lastName);
    email        : EMailAddress;
    phone        : PhoneNumber;
    orders       : Association to many Orders
                       on orders.customer = $self;
    creditCardNo : CardNumber;
}

entity Orders : cuid, managed {
    orderNumber : String(20) @title: 'Order Number';
    customer    : Association to Customers;
    totalAmount : Price      @readonly;
    currency    : Currency;
    status      : Association to Status default 'N';
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

entity Status : CodeList {
    key code : String enum {
            new = 'N';
            in_process = 'P';
            completed = 'C';
        };
}

// Types

type Price        : Decimal(9, 2);
type EMailAddress : String(255) @assert.format: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$';
type PhoneNumber  : String(30) @assert.format: '^\+?[0-9\s\-()]{7,20}$';
type CardNumber   : String(16) @assert.format: '^[1-9]\d{15}$';
type Image        : LargeBinary @Core.MediaType: 'image/png'
