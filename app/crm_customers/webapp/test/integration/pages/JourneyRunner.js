sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"crmcustomers/test/integration/pages/CustomersList",
	"crmcustomers/test/integration/pages/CustomersObjectPage"
], function (JourneyRunner, CustomersList, CustomersObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('crmcustomers') + '/test/flp.html#app-preview',
        pages: {
			onTheCustomersList: CustomersList,
			onTheCustomersObjectPage: CustomersObjectPage
        },
        async: true
    });

    return runner;
});

