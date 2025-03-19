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
  console.log(`\n********\nOnwer Lookup`);
  console.log("Current date and time:", new Date().toLocaleString());
  //   define result as return JSON object
  let result = {};
  //  get Input number for lookup
  let ownerID = event.sessionInfo.parameters.caseOwnerId;

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
  conn.login(context.SFDC_USER, context.SFDC_PWD, function (err, userInfo) {
    if (err) {
      console.log(err);
      callback(null, { error: err });
    }
    //  lookup contact query
    let query = `SELECT Name, Email, Flex_WorkerId__c FROM User where Id='${ownerID}'`;
    //  execute query
    conn.query(query, function (err, resp) {
      if (err) {
        console.log(err);
        callback(null, err);
      }
      if (resp.totalSize === 0) {
        result = { sfdcCaseOwner: { status: "not_found", data: resp } };
      }
      if (resp.totalSize == 1) {
        result = { sfdcCaseOwner: { status: "found", data: resp } };
      }
      if (resp.totalSize > 1) {
        result = { sfdcCaseOwner: { status: "multiple_records", data: resp } };
      }
      console.log(
        "Data returned from SFDC: ",
        result.sfdcCaseOwner.data,
        "\n\n\n"
      );

      result = {
        pageInfo: {},
        sessionInfo: {
          session: event.sessionInfo.session,
          parameters: {
            ...result,
          },
        },
      };
      console.log(
        result,
        `\nsize of result: ${
          Math.round((JSON.stringify(result).length / 1024) * 100) / 100
        } KB\n**********\n\n`
      );
      callback(null, result);
    });
  });
};
