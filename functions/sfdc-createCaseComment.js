//
//
//  SFDC Create Case Comment
//
//  Synopsis:
//  Simple handler to lookup a contact record in SFDC using a given phone number input.
//
//  This using the JSForce npm package managed by SFDC
//
//  Inputs:
//  inputParam: caseId ( parentId to the comment (Id of associated case))
//  inputParam: comment ( short textual update on the case )
//
//  https://jsforce.github.io/
let jsforce = require("jsforce");

exports.handler = function (context, event, callback) {
  console.log(`Create Case Comment`);
  console.log("Current date and time:", new Date().toLocaleString());

  //   define result as return JSON object
  // let result = {};

  //  get inputs
  let caseId = event.caseId;
  let comment = event.caseNote;

  console.log(`Lookup query: ${caseId}`);
  console.log(`Comment to add: ${comment}`);

  //  TODO: hardcoded values
  // caseId = '500Hp00001bCNbRIAW'
  // comment = 'A new comment on the case'

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
      callback(null, { error: err });
    }

    //  lookup contact query

    conn.sobject("CaseComment").create(
      {
        ParentId: caseId,
        CommentBody: comment,
        IsPublished: "true",
      },
      (err, resp) => {
        if (err || !resp.success) {
          console.log(err);
          callback(null, { error: err });
        }
        console.log("Case Comment created: ", resp);
        callback(null, resp);
      }
    );
  });
};
