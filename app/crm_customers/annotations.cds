using CrmService as service from '../../srv/crm-service';

annotate service.Customers with @(
    // Smart Filter Bar:
    UI.SelectionFields           : [
        statusCode_code,
        categoryGroup
    ],
    UI.FieldGroup #GeneratedGroup: {
        $Type: 'UI.FieldGroupType',
        Data : [
            {
                $Type: 'UI.DataField',
                Label: 'city',
                Value: city,
            },
            {
                $Type: 'UI.DataField',
                Label: 'postCode',
                Value: postCode,
            },
            {
                $Type: 'UI.DataField',
                Label: 'streetAddress',
                Value: streetAddress,
            },
            {
                $Type: 'UI.DataField',
                Label: 'firstName',
                Value: firstName,
            },
            {
                $Type: 'UI.DataField',
                Label: 'lastName',
                Value: lastName,
            },
            {
                $Type: 'UI.DataField',
                Label: 'name',
                Value: name,
            },
            {
                $Type: 'UI.DataField',
                Label: 'email',
                Value: email,
            },
            {
                $Type: 'UI.DataField',
                Label: 'phone',
                Value: phone,
            },
            {
                $Type: 'UI.DataField',
                Label: 'creditCardNo',
                Value: creditCardNo,
            },
            {
                $Type: 'UI.DataField',
                Label: 'categoryGroup',
                Value: categoryGroup,
            },
            {
                $Type: 'UI.DataField',
                Label: 'averageRating',
                Value: averageRating,
            },
            {
                $Type: 'UI.DataField',
                Label: 'statusCode_code',
                Value: statusCode_code,
            },
        ],
    },
    UI.Facets                    : [{
        $Type : 'UI.ReferenceFacet',
        ID    : 'GeneratedFacet1',
        Label : 'General Information',
        Target: '@UI.FieldGroup#GeneratedGroup',
    }, ],
    UI.LineItem                  : [
        {
            $Type: 'UI.DataField',
            Label: 'city',
            Value: city,
        },
        {
            $Type: 'UI.DataField',
            Label: 'postCode',
            Value: postCode,
        },
        {
            $Type: 'UI.DataField',
            Label: 'streetAddress',
            Value: streetAddress,
        },
        {
            $Type: 'UI.DataField',
            Label: 'firstName',
            Value: firstName,
        },
        {
            $Type: 'UI.DataField',
            Label: 'lastName',
            Value: lastName,
        },
    ],
);
