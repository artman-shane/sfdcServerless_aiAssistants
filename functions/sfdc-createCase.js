//
//  
//  SFDC Create Case 
//  
//  Synopsis:
//  Simple handler to lookup a contact record in SFDC using a given phone number input.
//  
//  This using the JSForce npm package managed by SFDC
//
//  Inputs:
//  inputParam: contactId
//  inputParam: subject
//  inputParam: description
//  inputParma: priority
//
//  https://jsforce.github.io/
let jsforce = require('jsforce')



exports.handler = function(context, event, callback) {

    //   define result as return JSON object
    let result = {}


    //  get inputs
    let contactId = event.contactId
    let subject = event.subject
    let description = event.subject
    let priority = event.priority

    //  hardcoded values
    // subject = 'A test case'
    // description = 'test case description w/ new uid'
    // priority = 'High'
 

    //  create a connection object to SFDC
    let conn = new jsforce.Connection({
        oauth2 : {
          // you can change loginUrl to connect to sandbox or prerelease env.
          // loginUrl : 'https://test.salesforce.com',
          clientId : context.SFDC_CLIENT_ID,
          clientSecret : context.SFDC_CLIENT_SECRET,
          redirectUri : context.SFDC_URI
        }
  });


  //    establish login session and SOQL query
  conn.login(context.SFDC_USER, context.SFDC_PWD, function(err, userInfo) {
    if (err) { 
        callback(null, {error: err })
    }

    //  lookup contact query

    conn.sobject('Case').create(
      {
        ContactId: contactId,
        OwnerId : context.SFDC_API_USER_ID,
        Status : 'New',
        Subject: subject,
        Description: description,
        Origin: 'Web',
        Priority: priority
      },
       ( err, resp) => {
        result = { error: err,  }

        if( err || !resp.success) { callback( null, result)}

        callback(null, {status: 'success', data : resp })

      }
    )
  });  
  
};