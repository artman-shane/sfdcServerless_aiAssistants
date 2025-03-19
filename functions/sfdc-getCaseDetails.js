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
  console.log(`\n********\nGet case details`);
  console.log("Current date and time:", new Date().toLocaleString());
  //   define result as return JSON object

  let caseId = event.caseId;
  console.log(`Lookup case ID: ${caseId}`);

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

      const caseHistoryQuery = `
      SELECT Id, CaseId, Field, OldValue, NewValue, CreatedBy.Name, CreatedDate 
      FROM CaseHistory
      WHERE CaseId = '${caseId}'`;

      //  lookup contact query
      // let query = `SELECT Id, Name, MobilePhone, Email, Phone FROM Contact where Phone='${lookupNumber}'`
      const caseCommentsQuery = `SELECT Id, CommentBody, CreatedBy.Name, CreatedDate FROM CaseComments)
      FROM Case
      WHERE Id = '${caseId}'`;

      //  execute query
      const caseHistory = await conn.query(caseHistoryQuery, (err, resp) => {
        return resp;
      });

      const caseComments = await conn.query(caseCommentsQuery, (err, resp) => {
        return resp;
      });

      const caseDetails = {
        caseHistory,
        caseComments,
      };
      console.log(JSON.stringify(caseDetails));
      callback(null, caseDetails);
    }
  );
};
