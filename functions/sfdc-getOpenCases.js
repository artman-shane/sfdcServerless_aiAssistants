//
//
//  SFDC Contact Lookup
//
//  Synopsis:
//  Simple handler to lookup a contact record in SFDC using a given phone number input.
//
//  This using the JSForce npm package managed by SFDC
//
//  Inputs:
//  number => number to use in lookup
//
//  https://jsforce.github.io/
let jsforce = require("jsforce");

exports.handler = async function (context, event, callback) {
  console.log(`\n********\nGet Open Cases`);
  console.log("Current date and time:", new Date().toLocaleString());
  //   define result as return JSON object

  let contactId = event.contactId;
  console.log(`Lookup query: ${contactId}`);

  //  define number of records to return
  const limit = 5;

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
        console.log("There was an error in login", err);
        callback(null, { error: err });
      }

      //  lookup contact query
      // let query = `SELECT Id, Name, MobilePhone, Email, Phone FROM Contact where Phone='${lookupNumber}'`
      console.log(`Contact ID prior to query: ${contactId}`);
      const query = `SELECT Id, CaseNumber, ContactId, OwnerId, Subject, Description, Status, CreatedDate, LastModifiedDate 
      FROM Case WHERE ContactId ='${contactId}' AND (Status='New' OR Status='Working') ORDER BY CreatedDate DESC LIMIT ${limit}`;

      //  execute query
      await conn.query(query, function (err, resp) {
        if (err) {
          console.log("Query Error:", err);
          callback(null, err);
        }

        const sfdcOpenCases = resp.records;

        console.log("Data returned from SFDC: ", sfdcOpenCases, "\n\n\n");

        callback(null, sfdcOpenCases);
      });
    }
  );
};
