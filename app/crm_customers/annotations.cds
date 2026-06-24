using CrmService as service from '../../srv/crm-service';

annotate service.Customers with @(
    // Smart Filter Bar:
    UI.SelectionFields: [statusCode_code],
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
    statusCode @(
        Common.Text : statusCode.descr,
        Common.Label: '{i18n>CustomerStatus}',
    )
};
