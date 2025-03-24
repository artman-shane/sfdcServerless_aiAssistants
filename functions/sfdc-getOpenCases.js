const {
  getOpenCases,
  connectToSfdc,
} = require("../assets/sfdc-functions.private.js");

exports.handler = async function (context, event, callback) {
  console.log(`Get Open Cases`);
  // if (!verifyRequest(context, event)) {
  //   console.error("Invalid token", event._token);
  //   return callback(new Error("Invalid token"));
  // }
  // Create a connection to SFDC

  let contactId = event.contactId;
  console.log(`Lookup query: ${contactId}`);

  //  define number of records to return
  const limit = 5;

  try {
    const conn = await connectToSfdc(context);

    const openCases = await getOpenCases(contactId, conn);
    console.log("Once contact found.");
    callback(null, openCases);
  } catch (e) {
    console.log("There was an error in the query. Escalate to a human", e);
    callback(null, `There was an error: ${e}`);
  }
};
