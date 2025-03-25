const {
  getSyncData,
  deleteSyncData,
} = require("../assets/sfdc-functions.private.js");

exports.handler = async function (context, event, callback) {
  console.log("Get Sync Doc");
  console.log(event.syncDocId);
  const document = await getSyncData(context, event);
  console.log("Document: ", document);

  if (document.data) {
    const documentSid = document.sid;
    console.log("Document SID: ", documentSid);

    // Safely access customerContact
    const customerContact =
      Array.isArray(document.data.contact) && document.data.contact.length > 0
        ? document.data.contact[0]
        : null;
    console.log("Customer Contact: ", customerContact);

    // Safely access caseOwnerId
    const caseOwnerId =
      Array.isArray(document.data.caseDetails?.caseInfo) &&
      document.data.caseDetails.caseInfo.length > 0
        ? document.data.caseDetails.caseInfo[0]?.OwnerId
        : null;
    console.log("Case Owner ID: ", caseOwnerId);

    // Safely access workerSid
    const workerSid =
      Array.isArray(document.data.caseDetails?.workerDetails) &&
      document.data.caseDetails.workerDetails.length > 0
        ? document.data.caseDetails.workerDetails[0]?.Flex_WorkerId__c
        : null;
    console.log("Worker SID: ", workerSid);

    // Safely access caseNumber
    const caseNumber =
      Array.isArray(document.data.caseDetails?.caseInfo) &&
      document.data.caseDetails.caseInfo.length > 0
        ? document.data.caseDetails.caseInfo[0]?.CaseNumber
        : null;
    console.log("Case Number: ", caseNumber);

    // Delete the document if documentSid exists
    if (documentSid) {
      const deleteDocument = await deleteSyncData(context, documentSid);
      if (deleteDocument) {
        console.log("Deleted!");
      }
    }
    const results = {
      customerContact,
      caseOwnerId,
      workerSid,
      caseNumber,
    };
    callback(null, results);
  } else {
    console.log("No document found");
    callback(null, "No document found");
  }
};
