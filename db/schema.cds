using {
    cuid,
    managed
} from '@sap/cds/common';

namespace shop.catconnect;


aspect Address : {
    city          : String;
    postCode      : String;
    streetAddress : String;
}

entity Games : cuid, managed {
    title  : localized String(111)  @mandatory;
    descr  : localized String(1111);
    studio : Association to Studios @mandatory;
    stock  : Integer;
    image  : LargeBinary            @Core.MediaType: 'image/png';
}

entity Studios : cuid, managed, Address {
    name     : String(111) @mandatory;
    existing : Boolean;
    games    : Association to many Games
                   on games.studio = $self;
}
