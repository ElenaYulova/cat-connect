using AdminService as service from '../../srv/admin-service';

// ==========================================
// Products annotations
// ==========================================

annotate service.Products with @(
    UI.FieldGroup #GeneratedGroup: {
        $Type: 'UI.FieldGroupType',
        Data : [
            {
                $Type: 'UI.DataField',
                Label: 'Title',
                Value: title,
            },
            {
                $Type: 'UI.DataField',
                Label: '{i18n>Descript}',
                Value: descr,
            },
            {
                $Type: 'UI.DataField',
                Label: '{i18n>Price}',
                Value: price,
            },
            {
                $Type: 'UI.DataField',
                Label: '{i18n>Currency}',
                Value: currency_code,
            },
            {
                $Type: 'UI.DataField',
                Label: '{i18n>Image}',
                Value: image,
            },
            {
                $Type: 'UI.DataField',
                Value: stock,
                Label: '{i18n>Stock}',
                @UI.Hidden,
            },
        ],
    },
    UI.Facets                    : [{
        $Type : 'UI.CollectionFacet',
        Label : '{i18n>Overview}',
        ID    : 'i18nOverview',
        Facets: [
            {
                $Type : 'UI.ReferenceFacet',
                ID    : 'GeneratedFacet1',
                Label : '{i18n>GeneralInformation}',
                Target: '@UI.FieldGroup#GeneratedGroup',
            },
            {
                $Type : 'UI.ReferenceFacet',
                Label : '{i18n>Details}',
                ID    : 'Details',
                Target: '@UI.FieldGroup#Details',
            },
        ],
    }, ],
    UI.LineItem                  : [
        {
            $Type: 'UI.DataField',
            Label: '{i18n>Title}',
            Value: title,
        },
        {
            $Type: 'UI.DataField',
            Value: image,
            Label: '{i18n>Image}',
        },
        {
            $Type: 'UI.DataField',
            Label: '{i18n>Descript}',
            Value: descr,
        },
        {
            $Type: 'UI.DataField',
            Value: genre.name,
        },
        {
            $Type: 'UI.DataField',
            Value: producer.name,
        },
        {
            $Type: 'UI.DataField',
            Label: '{i18n>Price}',
            Value: price,
        },
        {
            $Type: 'UI.DataField',
            Label: '{i18n>Currency}',
            Value: currency_code,
        },
    ],
    UI.SelectionFields           : [
        genre.name,
        producer.name,
    ],
    UI.HeaderInfo                : {
        Title         : {
            $Type: 'UI.DataField',
            Value: title,
        },
        TypeName      : '',
        TypeNamePlural: '',
        Description   : {
            $Type: 'UI.DataField',
            Value: genre.name,
        },
        ImageUrl      : image,
        TypeImageUrl  : 'sap-icon://paid-leave',
    },
    UI.FieldGroup #Details       : {
        $Type: 'UI.FieldGroupType',
        Data : [
            {
                $Type: 'UI.DataField',
                Value: genre.name,
            },
            {
                $Type: 'UI.DataField',
                Value: producer.name,
            },
        ],
    },
);

annotate service.Products with {
    producer @Common.ValueList: {
        $Type         : 'Common.ValueListType',
        CollectionPath: 'Producers',
        Parameters    : [
            {
                $Type            : 'Common.ValueListParameterInOut',
                LocalDataProperty: producer_ID,
                ValueListProperty: 'ID',
            },
            {
                $Type            : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty: 'city',
            },
            {
                $Type            : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty: 'postCode',
            },
            {
                $Type            : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty: 'streetAddress',
            },
            {
                $Type            : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty: 'name',
            },
        ],
    }
};

annotate service.Products with {
    genre @Common.Label: 'genre_ID'
};

annotate service.Producers with {
    name @(
        Common.Label                   : '{i18n>Producer}',
        Common.ValueList               : {
            $Type         : 'Common.ValueListType',
            CollectionPath: 'Producers',
            Parameters    : [
                {
                    $Type            : 'Common.ValueListParameterInOut',
                    LocalDataProperty: name,
                    ValueListProperty: 'name',
                },
                {
                    $Type            : 'Common.ValueListParameterDisplayOnly',
                    ValueListProperty: 'city',
                },
                {
                    $Type            : 'Common.ValueListParameterDisplayOnly',
                    ValueListProperty: 'existing',
                },
            ],
        },
        Common.ValueListWithFixedValues: true,
    )
};

// ==========================================
// Categories annotations
// ==========================================

annotate service.Categories with {
    name @(
        Common.Label                   : '{i18n>Genre}',
        Common.ValueList               : {
            $Type         : 'Common.ValueListType',
            CollectionPath: 'Categories',
            Parameters    : [{
                $Type            : 'Common.ValueListParameterInOut',
                LocalDataProperty: name,
                ValueListProperty: 'name',
            }, ],
        },
        Common.ValueListWithFixedValues: true,
        Common.Text                    : descr,
    )
};

// ==========================================
// Orders annotations - draft
// ==========================================

annotate service.OrderItems with @(
    UI.LineItem               : [
        {
            $Type: 'UI.DataField',
            Value: game_ID,
            Label: '{i18n>Game}'
        },
        {
            $Type: 'UI.DataField',
            Value: quantity,
            Label: '{i18n>Quantity}'
        }
    ],

    UI.FieldGroup #ItemDetails: {Data: [
        {
            $Type: 'UI.DataField',
            Value: game_ID
        },
        {
            $Type: 'UI.DataField',
            Value: quantity
        }
    ]}
);

annotate service.OrderItems with {
    game     @(
        Common.Label          : '{i18n>Game}',
        Common.Text           : game.title,
        Common.TextArrangement: #TextFirst,
        Common.ValueList      : {
            $Type         : 'Common.ValueListType',
            CollectionPath: 'Products',
            Parameters    : [
                {
                    $Type            : 'Common.ValueListParameterInOut',
                    LocalDataProperty: game_ID,
                    ValueListProperty: 'ID'
                },
                {
                    $Type            : 'Common.ValueListParameterDisplayOnly',
                    ValueListProperty: 'title'
                }
            ]
        }
    );

    quantity @(Common.Label: '{i18n>Quantity}');
};
