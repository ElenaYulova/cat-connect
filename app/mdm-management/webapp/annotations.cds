using MdmService as service from '../../../srv/mdm-service';

// ========================================================================
// PRODUCTS ENTITY CONFIGURATION
// ========================================================================
annotate service.Products with @(
    UI.SelectionFields           : [
        genre_ID,
        producer_ID
    ],

    UI.LineItem                  : [
        {
            $Type: 'UI.DataField',
            Value: image,
            Label: 'image',
        },
        {
            $Type: 'UI.DataField',
            Value: title,
            Label: '{i18n>GameTitle}',
        },
        {
            $Type: 'UI.DataField',
            Value: genre.name,
            Label: '{i18n>Genre}',
        },
        {
            $Type: 'UI.DataField',
            Value: producer.name,
            Label: '{i18n>Producer}',
        },
        {
            $Type: 'UI.DataField',
            Value: price,
            Label: '{i18n>Price}',
        },
        {
            $Type: 'UI.DataField',
            Value: stock,
            Label: '{i18n>InStock}',
        },
        {
            $Type: 'UI.DataField',
            Value: wholesalePrice,
            Label: '{i18n>Wholesale}',
        },
    ],

    UI.HeaderInfo                : {
        TypeName      : '{i18n>Product}',
        TypeNamePlural: '{i18n>Products}',
        Title         : {
            $Type: 'UI.DataField',
            Value: title,
        },
        Description   : {
            $Type: 'UI.DataField',
            Value: productType,
        },
        ImageUrl      : image,
    },

    UI.Facets                    : [{
        $Type : 'UI.ReferenceFacet',
        ID    : 'GeneratedFacet1',
        Label : '{i18n>GeneralInformation}',
        Target: '@UI.FieldGroup#GeneratedForm1',
    }],

    UI.FieldGroup #GeneratedForm1: {
        $Type: 'UI.FieldGroupType',
        Data : [
            {
                $Type: 'UI.DataField',
                Value: title,
                Label: '{i18n>GameTitle}',
            },
            {
                $Type: 'UI.DataField',
                Value: descr,
                Label: '{i18n>Description}',
            },
            {
                $Type: 'UI.DataField',
                Value: genre_ID,
                Label: '{i18n>Genre}',
            },
            {
                $Type: 'UI.DataField',
                Value: producer_ID,
                Label: '{i18n>Producer}',
            },
            {
                $Type: 'UI.DataField',
                Value: price,
                Label: '{i18n>Price}',
            },
            {
                $Type: 'UI.DataField',
                Value: stock,
                Label: '{i18n>InStock}',
            },
            {
                $Type: 'UI.DataField',
                Value: wholesalePrice,
                Label: '{i18n>WholesalePrice}',
            },
        ],
    },
    UI.SelectionPresentationVariant #tableView : {
        $Type : 'UI.SelectionPresentationVariantType',
        PresentationVariant : {
            $Type : 'UI.PresentationVariantType',
            Visualizations : [
                '@UI.LineItem',
            ],
        },
        SelectionVariant : {
            $Type : 'UI.SelectionVariantType',
            SelectOptions : [
            ],
        },
        Text : '{i18n>Products}',
    },
    UI.LineItem #tableView : [
    ],
    UI.SelectionPresentationVariant #tableView1 : {
        $Type : 'UI.SelectionPresentationVariantType',
        PresentationVariant : {
            $Type : 'UI.PresentationVariantType',
            Visualizations : [
                '@UI.LineItem#tableView',
            ],
        },
        SelectionVariant : {
            $Type : 'UI.SelectionVariantType',
            SelectOptions : [
            ],
        },
        Text : 'Table View 1',
    },
);

// ==========================
// VALUE LISTS & FIELD TEXT
// =========================
annotate service.Products with {
    producer @(
        Common.Label                   : '{i18n>Producer}',
        Common.Text                    : producer.name,
        Common.TextArrangement         : #TextOnly,
        Common.ValueList               : {
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
                    ValueListProperty: 'name',
                }
            ],
        },
        Common.ValueListWithFixedValues: true
    );

    genre    @(
        Common.Label                   : '{i18n>Genre}',
        Common.Text                    : genre.name,
        Common.TextArrangement         : #TextOnly,
        Common.ValueList               : {
            $Type         : 'Common.ValueListType',
            CollectionPath: 'ProductCategories',
            Parameters    : [
                {
                    $Type            : 'Common.ValueListParameterInOut',
                    LocalDataProperty: genre_ID,
                    ValueListProperty: 'ID',
                },
                {
                    $Type            : 'Common.ValueListParameterDisplayOnly',
                    ValueListProperty: 'name',
                }
            ],
        },
        Common.ValueListWithFixedValues: true
    );
};

// ==============
// TEXT MAPPINGS
// ==============
annotate service.Producers with {
    ID @(
        Common.Text           : name,
        Common.TextArrangement: #TextOnly
    )
};

annotate service.ProductCategories with {
    ID @(
        Common.Text           : name,
        Common.TextArrangement: #TextOnly
    )
};
annotate service.Producers with @(
    UI.LineItem #tableView : [
        {
            $Type : 'UI.DataField',
            Value : name,
            Label : 'name',
        },
        {
            $Type : 'UI.DataField',
            Value : city,
            Label : 'city',
        },
        {
            $Type : 'UI.DataField',
            Value : postCode,
            Label : 'postCode',
        },
        {
            $Type : 'UI.DataField',
            Value : streetAddress,
            Label : 'streetAddress',
        },
    ],
    UI.SelectionPresentationVariant #tableView : {
        $Type : 'UI.SelectionPresentationVariantType',
        PresentationVariant : {
            $Type : 'UI.PresentationVariantType',
            Visualizations : [
                '@UI.LineItem#tableView',
            ],
        },
        SelectionVariant : {
            $Type : 'UI.SelectionVariantType',
            SelectOptions : [
            ],
        },
        Text : '{i18n>Producers}',
    },
    UI.Facets : [
        {
            $Type : 'UI.ReferenceFacet',
            Label : '{i18n>GeneralInformation1}',
            ID : 'Generalinformation',
            Target : '@UI.FieldGroup#Generalinformation',
        },
    ],
    UI.FieldGroup #Generalinformation : {
        $Type : 'UI.FieldGroupType',
        Data : [
            {
                $Type : 'UI.DataField',
                Value : name,
                Label : 'name',
            },
            {
                $Type : 'UI.DataField',
                Value : postCode,
                Label : 'postCode',
            },
            {
                $Type : 'UI.DataField',
                Value : city,
                Label : 'city',
            },
            {
                $Type : 'UI.DataField',
                Value : streetAddress,
                Label : 'streetAddress',
            },
        ],
    },
);

