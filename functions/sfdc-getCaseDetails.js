const {
  getCaseDetails,
  connectToSfdc,
  pushSyncData,
  getSyncData,
} = require(Runtime.getAssets()["/sfdc-functions.js"].path);

exports.handler = async function (context, event, callback) {
  console.log(`Get case details`);

  const syncDoc = await getSyncData(context, event);
  let caseId = syncDoc.data.openCases[0].Id;
  console.log(`Case ID: ${caseId}`);

  try {
    const conn = await connectToSfdc(context);

    const caseDetails = await getCaseDetails(caseId, conn);
    if (caseDetails.length === 0) {
      return callback(null, {
        message: "No case details found.",
      });
    } else {
      console.log("Case details returned");
      const data = { caseDetails: caseDetails };
      await pushSyncData(context, event, data);
      callback(null, caseDetails);
    }
  } catch (e) {
    console.log(
      "There was an error with the case ID provided. Escalate to a human",
      e
    );
    callback(null, `There was an error: ${e}`);
  }
};
