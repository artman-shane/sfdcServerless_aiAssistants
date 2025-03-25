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
  console.log("Identity Header: ", identityHeader);
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
  console.log(`Lookup query: ${caseId}`);

  try {
    // Query for case history
    const caseHistoryQuery = `
      SELECT Id, CaseId, Field, OldValue, NewValue, CreatedBy.Name, CreatedDate 
      FROM CaseHistory
      WHERE CaseId = '${caseId}'
    `;

    // Corrected subquery for case comments
    const caseCommentsQuery = `SELECT Id, CaseNumber, ContactId, OwnerId, Subject, Description, Status, CreatedDate, LastModifiedDate, 
      (SELECT Id, CommentBody, CreatedBy.Name, CreatedDate FROM CaseComments)
    FROM Case
    WHERE Id = '${caseId}'`;

    // Execute queries for case history and comments
    const caseHistory = await querySfdc(caseHistoryQuery, conn);
    const caseInfo = await querySfdc(caseCommentsQuery, conn);

    // Query to get Owner Id (with corrected quotes)
    const caseOwnerQuery = `SELECT OwnerId FROM Case WHERE Id ='${caseId}'`;
    const caseOwnerResult = await querySfdc(caseOwnerQuery, conn);
    const caseOwnerId =
      caseOwnerResult.length > 0 ? caseOwnerResult[0].OwnerId : null;

    // Query for worker details based on the retrieved Owner Id
    let workerDetails = [];
    if (caseOwnerId) {
      const workerDetailsQuery = `SELECT Name, Email, Flex_WorkerId__c FROM User WHERE Id='${caseOwnerId}'`;
      workerDetails = await querySfdc(workerDetailsQuery, conn);
    }

    const caseDetails = {
      caseHistory,
      caseInfo,
      workerDetails,
    };
    // console.log("Case details: ", caseDetails);
    return caseDetails;
  } catch (e) {
    console.log("There was an error in the query", e);
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
 * @param {jsforce.Connection} conn
 * @returns
 */
async function querySfdc(query, conn) {
  try {
    console.log("Executing Query: ", query);
    const resp = await conn.query(query);
    // console.log("Data returned from SFDC: ", resp.records);
    return resp.records;
  } catch (err) {
    console.log("Error: ", err);
    return err;
  }
}

/**
 *
 * @param {import('@twilio-labs/serverless-runtime-types/types').Context} context
 * @param {string} sessionId
 * @returns {object} syncDoc
 */
async function getSyncData(context, event) {
  console.log("Get Sync Data");
  const sessionId = event.syncDocId
    ? event.syncDocId
    : event.request.headers["x-session-id"].trim().replace(/[^a-zA-Z0-9]/g, "");
  const client = context.getTwilioClient();
  const syncService = context.SYNC_SERVICE_SID.trim();
  const syncDoc = sessionId;

  try {
    const syncDocData = await client.sync.v1
      .services(syncService)
      .documents(syncDoc)
      .fetch();
    return syncDocData;
  } catch (e) {
    console.log("No doc found. Attempting to create one.");
    const document = await client.sync.v1
      .services(syncService)
      .documents.create({ uniqueName: syncDoc, ttl: 300 });
    return document;
  }
}

/**
 *
 * @param {import('@twilio-labs/serverless-runtime-types/types').Context} context
 * @param {import('@twilio-labs/serverless-runtime-types/types').Event} event
 * @param {object} dataToPush
 * @returns {object} syncDoc
 */
async function pushSyncData(context, event, data) {
  console.log("Updating Sync Data");
  const client = context.getTwilioClient();
  const syncService = context.SYNC_SERVICE_SID;
  const sessionId = event.request.headers["x-session-id"]
    .trim()
    .replace(/[^a-zA-Z0-9]/g, "");
  console.log("sessionId: ", sessionId);

  try {
    // Retrieve the existing Sync Document
    let document = null;
    try {
      document = await getSyncData(context, event);
      // console.log("Returned Document: ", document);
    } catch (e) {
      console.log("Error: ", e);
    }
    // console.log("Existing Sync Document Data: ", document.data);
    // Merge the current data with the additional data

    const contact = data.contact ? data.contact : document.data.contact;
    const openCases = data.openCases ? data.openCases : document.data.openCases;
    const caseDetails = data.caseDetails
      ? data.caseDetails
      : document.data.caseDetails;
    const summary = data.summary ? data.summary : document.data.summary;

    const replacementData = {
      contact: contact,
      openCases: openCases,
      caseDetails: caseDetails,
      summary: summary,
    };

    // console.log("New Data for Doc: ", replacementData);

    // Update the document with the merged data
    const updatedDocument = await client.sync.v1
      .services(syncService)
      .documents(sessionId)
      .update({ data: replacementData, ttl: 300 });
    // console.log("Updated Doc: ", updatedDocument);
    return updatedDocument;
  } catch (error) {
    console.error("Error: ", error);
  }
}

/**
 * @param {import('@twilio-labs/serverless-runtime-types/types').Context} context
 * @param {jsforce.Connection} conn
 * @param {string} documentId
 */
async function deleteSyncData(context, documentId) {
  console.log("Deleting Sync Data");
  const client = context.getTwilioClient();
  const syncService = context.SYNC_SERVICE_SID;

  const response = await client.sync.v1
    .services(syncService)
    .documents(documentId)
    .remove();
  console.log("Deleted Doc: ", response);
  return response;
}

/**
 *
 * @param {jsforce.Connection} conn
 * @param {string} caseId
 * @param {string} comment
 */
async function createCaseComment(conn, caseId, comment) {
  console.log("Create a case comment");
  conn.sobject("CaseComment").create(
    {
      ParentId: caseId,
      CommentBody: comment,
      IsPublished: "true",
    },
    (err, resp) => {
      if (err || !resp.success) {
        console.log(err);
        return "There was an error:", err;
      }
      // console.log("Case Comment created: ", resp);
      return resp;
    }
  );
}

module.exports = {
  lookupContact,
  getOpenCases,
  getCaseDetails,
  connectToSfdc,
  pushSyncData,
  getSyncData,
  createCaseComment,
  deleteSyncData,
};

/**
 * Using service syncId: IS126c0bcab30520104ea08551de60df10 and uniquename sessionId (syncDoc): voice:CA918dac84a523b4eeaa41bd20374a8b22/VXf2378c4a3051751882d6b0502b9b84a6
 * Using service syncId: IS126c0bcab30520104ea08551de60df10 and uniquename sessionId (syncDoc): voice:CA918dac84a523b4eeaa41bd20374a8b22/VXf2378c4a3051751882d6b0502b9b84a6
 */
