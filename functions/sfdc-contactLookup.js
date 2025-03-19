//  SFDC Contact Lookup
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
  console.log(`\n********\nContact Lookup`);
  //   define result as return JSON object
  console.log("Event", event);

  try {
    //  get Input number for lookup
    let lookupNumber = event.phoneNumber || null;

    if (lookupNumber) {
      console.log(`Lookup query: ${lookupNumber}`);

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

      // console.log("Creating connection to SFDC using:", conn);
      //    establish login session and SOQL query
      await conn.login(
        context.SFDC_USER,
        context.SFDC_PWD,
        async function (err, userInfo) {
          if (err) {
            console.log(err);
            callback(null, { error: err });
          }
          console.log("Connection Established");
          //  lookup contact query
          let query = `SELECT Id, Name, MobilePhone, Email, Phone FROM Contact where Phone='${lookupNumber}'`;
          //  execute query
          console.log("Executing query");
          await conn.query(query, function (err, resp) {
            if (err) {
              console.log("Error: ", err);
              callback(null, err);
            }
            const contacts = resp.records;
            console.log("Data returned from SFDC: ", contacts, "\n\n\n");
            callback(null, contacts);
          });
        }
      );
    } else {
      console.log("There was a problem with the phone bumber");
      callback(null, "No phone number found");
    }
  } catch (e) {
    console.log("There was a problem with the phone bumber");
    console.log(e);
    callback(null, `Error: ${e}`);
  }
};
