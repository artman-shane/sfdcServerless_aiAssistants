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

exports.handler = async function (context, event, callback) {
  console.log(`\n********\nOnwer Lookup`);
  console.log("Current date and time:", new Date().toLocaleString());
  //   define result as return JSON object
  //  get Input number for lookup
  let ownerID = event.ownerId;

  console.log(`Lookup query: ${ownerID}`);

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
  await conn.login(
    context.SFDC_USER,
    context.SFDC_PWD,
    async function (err, userInfo) {
      if (err) {
        console.log(err);
        callback(null, { error: err });
      }
      //  lookup contact query
      let query = `SELECT Name, Email, Flex_WorkerId__c FROM User where Id='${ownerID}'`;
      //  execute query
      await conn.query(query, function (err, resp) {
        if (err) {
          console.log(err);
          callback(null, err);
        }
        const ownerInfo = resp.records;
        console.log("Data returned from SFDC: ", ownerInfo, "\n\n\n");
        callback(null, ownerInfo);
      });
    }
  );
};
