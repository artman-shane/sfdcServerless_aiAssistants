//
//
//  SFDC Case Owner Lookup
//
//  Synopsis:
//  Simple handler to lookup a contact record in SFDC using an owner ID.
//
//  This using the JSForce npm package managed by SFDC
//
//  Inputs:
//  ownerID => ownerID to use in lookup
//
//  https://jsforce.github.io/
let jsforce = require("jsforce");

exports.handler = function (context, event, callback) {
  console.log("Get Case By Number");
  console.log("Current date and time:", new Date().toLocaleString());

  //  get Input number for lookup
  let caseNumber = event.caseNumber;

  console.log(`Lookup query: ${caseNumber}`);

  //  create a connection object to SFDC
  let conn = new jsforce.Connection({
    oauth2: {
      // you can change loginUrl to connect to sandbox or prerelease env.
      // loginUrl : 'https://test.salesforce.com',
      clientId: context.SFDC_CLIENT_ID,
      clientSecret: context.SFDC_CLIENT_SECRET,
      redirectUri: context.SFDC_URI,
    },
  });

  //    establish login session and SOQL query
  conn.login(context.SFDC_USER, context.SFDC_PWD, function (err, userInfo) {
    if (err) {
      console.log(err);
      callback(null, { error: err });
    }
    //  lookup contact query
    const query = `SELECT Id, ContactId, OwnerId, AccountId, CaseNumber, Subject, Description, Status FROM Case WHERE CaseNumber LIKE '%${caseNumber}%'`;
    //  execute query
    conn.query(query, function (err, resp) {
      if (err) {
        console.log(err);
        callback(null, err);
      }
      console.log("Data returned from SFDC: ", resp, "\n\n\n");
      callback(null, resp);
    });
  });
};
