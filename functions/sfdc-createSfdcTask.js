//
//  
//  SFDC Create Task 
//  
//  Synopsis:
//  Simple handler to create a task that is assoicated with either a contact or case.
//  
//  This using the JSForce npm package managed by SFDC
//
//  Inputs:
//  inputParam: channelType
//  inputParam: direction ( Inbound/Outbound )
//  inputParam: sfdcObjectType ( call, case)
//  inputParam: contactId
//  inputParam: caseId
//  inputParam: subject       ( {direction} call/sms/chat/email/whatsapp, {outbound} call/chat/sms/email/whatsapp )
//  inputParam: description
//  inputParam: priority
//
//  https://jsforce.github.io/
let jsforce = require('jsforce')
let moment = require('moment-timezone')



exports.handler = function(context, event, callback) {

    //   define result as return JSON object
    let result = {}
    let sfdcData = {}
    const timezone = "America/Denver"

    //  get inputs
    let channelType = event.channelType
    let direction = event.direction
    let sfdcObjectType = event.sfdcObjectType
    let contactId = event.contactId
    let caseId = event.caseId
    let description = event.description

    //  hardcoded values
    channelType = 'Call'
    direction = 'Inbound'
    sfdcObjectType = 'Case'
    contactId = '003Hp00002lHAeiIAG'
    caseId = '500Hp00001bCHlIIAW'
    description = 'This was a summarization of the engagement'

    let template = `Engagement Time: ${moment().tz(timezone).format("YYYY-MM-DD, h:mm:ss a z")}`


    // define payload of SFDC Task creation based on SFDC Object type and channel
    if (sfdcObjectType=='Contact') {
      if (channelType=='Call'){
        sfdcData = {
          //  code for inbound call 
          Subject: 'Call',
          TaskSubType: 'Call',
          CallType: 'Inbound',
          Description: `${template}\n\n${description}`,
          Priority: 'Normal',
          Status: 'Completed',
          WhoId: contactId
        }
      } else {
        sfdcData = {
        // code for chat/sms/whatsapp - digital engagements
            Subject: `${direction} ${channelType}`,
            CallType: 'Inbound',
            Description: `${template}\n\n${description}`,
            Priority: 'Normal',
            Status: 'Completed',
            WhoId: contactId           //  association of task to the contact 
        }       

      }
    }

    if (sfdcObjectType=='Case') {
      if (channelType=='Call'){
        sfdcData = {
          //  code for inbound call 
          Subject: `${direction} ${channelType} ( ${moment().tz(timezone).format("YYYY-MM-DD, h:mm:ss a z")} )`,
          TaskSubType: 'Call',
          CallType: 'Inbound',
          Description: `${template}\n\n${description}`,
          Priority: 'Normal',
          Status: 'Completed',
          WhatId: caseId,           //  association of task to the contact 
          WhoId: contactId           //  association of task to the contact  
        }
      } else {
        // digital channels for case association
        sfdcData = {
          // code for chat/sms/whatsapp - digital engagements
          Subject: `${direction} ${channelType} ( ${moment().tz(timezone).format("YYYY-MM-DD, h:mm:ss a z")} )`,
          CallType: 'Inbound',
          Description: `${template}\n\n${description}`,
          Priority: 'Normal',
          Status: 'Completed',
          WhatId: caseId,           //  association of task to the contact 
          WhoId: contactId           //  association of task to the contact 
        }       

      }
    }
 

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

    conn.sobject('Task').create( sfdcData,( err, resp) => {
        result = { error: err,  }
        if( err || !resp.success) { callback( null, result)}
        callback(null, {status: 'success', data : resp })
      }
    )
  });  
  
};