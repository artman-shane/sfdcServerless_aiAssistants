let jsforce = require("jsforce");

/**
 * @param {import('@twilio-labs/serverless-runtime-types/types').Context} context
 * @param {import('@twilio-labs/serverless-runtime-types/types').Event} event
 * @param {jsforce.Connection} conn
 */
async function lookupContact(event, conn) {
  console.log("SFDC Contact Lookup");

  // check for the x-identity header
  const identityHeader = event.request.headers["x-identity"];
  console.log(identityHeader);
  if (!identityHeader) {
    console.log("Missing x-identity header");
    return {
      status: 400,
      message:
        'Missing x-identity header. Provide email or phone in the format: "email:<email>" or "phone:<phone>".',
    };
  }

  // Parse the identity header
  let queryField, queryValue;
  if (identityHeader.startsWith("email:")) {
    console.log("Email lookup");
    queryField = "email";
    queryValue = identityHeader.replace("email:", "").trim();
  } else if (identityHeader.startsWith("phone:")) {
    console.log("Phone lookup");
    queryField = "phone";
    queryValue = identityHeader.replace("phone:", "").trim();
    queryValue = queryValue.replace(/[\+.\-()\s]/g, "");
  } else if (identityHeader.startsWith("whatsapp:")) {
    console.log("Whatsapp lookup");
    queryField = "phone";
    queryValue = identityHeader.replace("whatsapp:", "").trim();
  } else {
    console.log("Invalid x-identity format");
    return {
      status: 400,
      message:
        'Invalid x-identity format. Use "email:<email>" or "phone:<phone>".',
    };
  }

  try {
    let query = "";
    if (queryField == "email") {
      query = `SELECT Id, Name, MobilePhone, OtherPhone, Email, Phone FROM Contact where Email LIKE '%${queryValue}%'`;
    } else {
      query = `SELECT Id, Name, MobilePhone, OtherPhone, Email, Phone FROM Contact where Phone LIKE '%${queryValue}%' OR MobilePhone LIKE '%${queryValue}%' OR OtherPhone LIKE '%${queryValue}%'`;
    }

    try {
      return await querySfdc(query, conn);
    } catch (e) {
      console.log("There was an error in the query", e);
      return `Error: e`;
    }
  } catch (e) {
    console.log("There was a problem with the lookup data provided");
    console.log(e);
    return `Error: ${e}`;
  }
}

/**
 * @param {string} contactId
 * @param {jsforce.Connection} conn
 **/

async function getOpenCases(contactId, conn) {
  // check for the x-identity header

  console.log(`Get Open Cases`);
  console.log(`Lookup query: ${contactId}`);

  try {
    //  define number of records to return
    const limit = 10;

    // let query = `SELECT Id, Name, MobilePhone, Email, Phone FROM Contact where Phone='${lookupNumber}'`
    console.log(`Contact ID prior to query: ${contactId}`);
    const query = `SELECT Id, CaseNumber, ContactId, OwnerId, Subject, Description, Status, CreatedDate, LastModifiedDate 
          FROM Case WHERE ContactId ='${contactId}' AND Status != 'Closed' ORDER BY CreatedDate DESC LIMIT ${limit}`;

    //  execute query
    try {
      return await querySfdc(query, conn);
    } catch (e) {
      console.log("There was an error in the query", e);
      return `Error: e`;
    }
  } catch (e) {
    console.log("There was a problem with the lookup data provided");
    console.log(e);
    return `Error: ${e}`;
  }
}

/**
 * @param {string} contactId
 * @param {jsforce.Connection} conn
 **/

async function getCaseDetails(caseId, conn) {
  // check for the x-identity header

  console.log(`Get Open Cases`);
  console.log(`Lookup query: ${caseId}`);

  try {
    //  define number of records to return
    const limit = 10;

    const caseHistoryQuery = `
      SELECT Id, CaseId, Field, OldValue, NewValue, CreatedBy.Name, CreatedDate 
      FROM CaseHistory
      WHERE CaseId = '${caseId}'`;

    //  lookup contact query
    const caseCommentsQuery = `SELECT Id, CommentBody, CreatedBy.Name, CreatedDate FROM CaseComments)
      FROM Case
      WHERE Id = '${caseId}'`;
    //  execute query
    try {
      const caseHistory = await querySfdc(caseHistoryQuery, conn);
      const caseComments = await querySfdc(caseCommentsQuery, conn);
      const caseDetails = {
        caseHistory,
        caseComments,
      };
      console.log("Case details: ", caseDetails);
      return caseDetails;
    } catch (e) {
      console.log("There was an error in the query", e);
      return `Error: e`;
    }
  } catch (e) {
    console.log("There was a problem", e);
    console.log(e);
    return `Error: ${e}`;
  }
}

/**
 *
 * @param {import('@twilio-labs/serverless-runtime-types/types').Context} context
 */
async function connectToSfdc(context) {
  const conn = new jsforce.Connection({
    oauth2: {
      clientId: context.SFDC_CLIENT_ID,
      clientSecret: context.SFDC_CLIENT_SECRET,
      redirectUri: context.SFDC_URI,
    },
  });
  await conn.login(context.SFDC_USER, context.SFDC_PWD);
  return conn;
}

/**
 *
 * @param {stinrg} query
 * @param {object} conn
 * @returns
 */
async function querySfdc(query, conn) {
  try {
    console.log("Executing Query...");
    const resp = await conn.query(query);
    console.log("Data returned from SFDC: ", resp.records);
    return resp.records;
  } catch (err) {
    console.log("Error: ", err);
    return err;
  }
}

module.exports = { lookupContact, getOpenCases, getCaseDetails, connectToSfdc };
