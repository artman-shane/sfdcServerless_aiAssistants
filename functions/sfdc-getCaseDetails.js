const {
  getCaseDetails,
  connectToSfdc,
} = require("../assets/sfdc-functions.private.js");

exports.handler = async function (context, event, callback) {
  console.log(`Get case details`);

  let caseId = event.caseId;
  console.log(`Case ID: ${caseId}`);

  try {
    const conn = await connectToSfdc(context);

    const openCases = await getCaseDetails(caseId, conn);
    console.log("Cases returned.");
    if (openCases.length === 0) {
      return callback(null, {
        message: "No case details found.",
      });
    } else {
      console.log("Case details found.");
      callback(null, openCases);
    }
  } catch (e) {
    console.log(
      "There was an error with the case ID provided. Escalate to a human",
      e
    );
    callback(null, `There was an error: ${e}`);
  }
};
