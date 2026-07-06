using CrmService as service from '../../srv/crm-service';

// =========================================================================
// List Report Annotations
// =========================================================================

annotate service.Customers with @(
    // Smart Filter Bar:
    UI.SelectionFields: [statusCode_code],
    // Table:
    UI.LineItem       : [
        {
            $Type: 'UI.DataField',
            Value: name,
            Label: '{i18n>CustomerName}'
        },
        {
            $Type: 'UI.DataField',
            Value: email,
            Label: '{i18n>Email}'
        },
        {
            $Type: 'UI.DataField',
            Value: phone,
            Label: '{i18n>Phone}'
        },
        {
            $Type: 'UI.DataField',
            Value: categoryGroup,
            Label: '{i18n>Category}'
        },
        {
            $Type: 'UI.DataField',
            Value: averageRating,
            Label: '{i18n>AverageRating}'
        },

        {
            $Type      : 'UI.DataField',
            Value      : statusCode_code,
            Label      : '{i18n>Status}',
            Criticality: statusCode.criticality
        }
    ]
);

annotate service.Customers with {
    firstName      @Common.Label: '{i18n>FirstName}';
    lastName       @Common.Label: '{i18n>LastName}';
    email          @Common.Label: '{i18n>Email}';
    phone          @Common.Label: '{i18n>Phone}';

    averageRating  @Common.Label: '{i18n>Rating}'  @Core.Computed;
    statusCode     @Core.Computed                  @(
        Common.Text                    : statusCode.descr,
        Common.Label                   : '{i18n>Status}',
        Common.Text.@UI.TextArrangement: #TextOnly,
    )
};

annotate service.CustomerNotes with @(UI.LineItem: [
    {
        Value : createdBy,
        Label : '{i18n>UserID}',
        @title: 'Author'
    },
    {
        Value : createdAt,
        Label : '{i18n>CreatedAt}',
        @title: 'Date'
    },
    {
        Value : content,
        @title: 'Internal Note'
    }
]);

// =========================================================================
// Object Page Annotations
// =========================================================================

annotate service.Customers with @(
    // Header
    UI.HeaderInfo                   : {
        TypeName      : '{i18n>Customer}',
        TypeNamePlural: '{i18n>Customers}',
        Title         : {
            $Type: 'UI.DataField',
            Value: name
        },
        Description   : {
            $Type: 'UI.DataField',
            Value: categoryGroup
        }
    },

    UI.Identification               : [{
        $Type : 'UI.DataFieldForAction',
        Label : '{i18n>ClearAllNotes}',
        Action: 'service.clearNotes'
    }],

    UI.HeaderFacets                 : [{
        $Type : 'UI.ReferenceFacet',
        ID    : 'StatusHeaderFacet',
        Label : '{i18n>CustomerStatus1}',
        Target: '@UI.FieldGroup#HeaderStatusGroup'
    }],

    UI.FieldGroup #HeaderStatusGroup: {Data: [{
        $Type      : 'UI.DataField',
        Value      : statusCode_code,
        Criticality: statusCode.criticality,
        Label      : '',
    }]},

    // Tabs
    UI.Facets                       : [

        {
            $Type : 'UI.ReferenceFacet',
            ID    : 'GeneralInfoFacet',
            Label : '{i18n>GeneralInformation}',
            Target: '@UI.FieldGroup#GeneralInfo'
        },

        {
            $Type : 'UI.ReferenceFacet',
            ID    : 'PreferencesFacet',
            Label : '{i18n>CustomerPreferences}',
            Target: 'preferences/@UI.LineItem'
        },

        {
            $Type : 'UI.ReferenceFacet',
            ID    : 'InteractionsFacet',
            Label : '{i18n>InteractionHistory}',
            Target: 'interactions/@UI.LineItem'
        },
        {
            $Type : 'UI.ReferenceFacet',
            Label : '{i18n>NotesFacet}',
            ID    : 'CustomerNotes',
            Target: 'customerNotes/@UI.LineItem'
        }
    ],

    // Field Groups
    UI.FieldGroup #GeneralInfo      : {Data: [
        {
            $Type: 'UI.DataField',
            Value: firstName
        },
        {
            $Type: 'UI.DataField',
            Value: lastName
        },
        {
            $Type: 'UI.DataField',
            Value: email
        },
        {
            $Type: 'UI.DataField',
            Value: phone
        },
        {
            $Type: 'UI.DataField',
            Value: creditCardNo,
            Label: '{i18n>CreditCard}',
        },
        {
            $Type: 'UI.DataField',
            Value: averageRating,
            Label: '{i18n>Rating}',
        }
    ]}
);

// Preferences in the Object Page of Service.Customers

annotate service.CustomersToPreferences with @(UI.LineItem: [
    {
        $Type: 'UI.DataField',
        Value: preference.productCategory_ID,
        Label: '{i18n>ProductCategory}'
    },
    {
        $Type: 'UI.DataField',
        Value: preference.notes,
        Label: '{i18n>Notes}'
    }

]);

// Service.Interactions in the Object Page of Service.Customers
annotate service.Interactions with @(UI.LineItem: [
    {
        $Type: 'UI.DataField',
        Value: date,
        Label: '{i18n>DateTime}'
    },
    {
        $Type      : 'UI.DataField',
        Value      : method_code,
        Label      : '{i18n>Type}',
        Criticality: method.criticality
    },
    {
        $Type: 'UI.DataField',
        Value: summary,
        Label: '{i18n>SummaryDescription}'
    }
]);

annotate service.Interactions with {
    method @(
        Common.ValueList               : {
            $Type         : 'Common.ValueListType',
            CollectionPath: 'InteractionMethod',
            Parameters    : [{
                $Type            : 'Common.ValueListParameterInOut',
                LocalDataProperty: method_code,
                ValueListProperty: 'name',
            }, ],
        },
        Common.ValueListWithFixedValues: true,
        Common.Text                    : method.name,
        Common.Text.@UI.TextArrangement: #TextOnly,
    )
};

annotate service.Preferences with {
    productCategory @(
        Common.Text                    : productCategory.name,
        Common.Text.@UI.TextArrangement: #TextOnly,
    )
};

annotate CrmService.Customers actions {
    clearNotes @Common.SideEffects: {
        TargetProperties: ['customerNotes'],
        TargetEntities  : ['customerNotes']
    }
};
