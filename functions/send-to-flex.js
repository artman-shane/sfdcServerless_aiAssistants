const { getSyncData } = require("../assets/sfdc-functions.private.js");

/**
 * @param {import('@twilio-labs/serverless-runtime-types/types').Context} context
 * @param {{}} event
 * @param {import('@twilio-labs/serverless-runtime-types/types').ServerlessCallback} callback
 */
exports.handler = async function (context, event, callback) {
  /**
   * Actual data sent!!!
   * {
   * "workerSid":"referenced flex workerSid",
   * "caseId":"referenced case id",
   * "caseNumber":"referenced case number",
   * "summary":"Customer requested status on vehicle case related to radio issue. Case is new and under remote diagnosis. Customer wants to speak with an agent."
   * }
   */
  console.log("Send to Flex");
  const client = context.getTwilioClient();
  console.log("Getting Sync Doc");
  const syncDoc = await getSyncData(context, event);
  const workerSid = syncDoc.data.caseDetails.workerDetails[0].Flex_WorkerId__c;
  console.log("Worker SID (sync doc):", workerSid);
  const caseNumber = syncDoc.data.caseDetails.caseInfo[0].CaseNumber;
  console.log("Case Number (sync doc):", caseNumber);
  const caseId = syncDoc.data.caseDetails.caseInfo[0].Id;
  console.log("Case ID (sync doc):", caseId);
  const summary = event.summary || "Customer requested to speak with an agent";
  console.log("Summary (from LLM) (sync doc):", summary);
  const sessionIdOrig = event.request.headers["x-session-id"];
  const sessionId = sessionIdOrig.trim().replace(/[^a-zA-Z0-9]/g, "");
  console.log("Session ID: ", sessionId);

  if (sessionId.startsWith("voice")) {
    console.log("Forwarding call to Studio Flow");
    const redirectUrl =
      `https://webhooks.twilio.com/v1/Accounts/${context.ACCOUNT_SID}/Flows/${context.STUDIO_FLOW_SID}?FlowEvent=return` +
      (syncDoc && (summary || workerSid || caseId || caseNumber)
        ? `&amp;syncDoc=${encodeURIComponent(sessionId)}`
        : "");

    console.log("Redirect URL: ", redirectUrl);
    const [callSid] = sessionIdOrig.replace("voice:", "").split("/");
    console.log("Call SID: ", callSid);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await client.calls(callSid).update({
      twiml: `<Response><Say>One second while we connect you</Say><Redirect>${redirectUrl}</Redirect></Response>`,
    });
    return callback(null, "Call forwarded");
  }

  console.log("Forwarding chat to Flex");
  const FLEX_WORKFLOW_SID = event.FlexWorkflowSid || context.FLEX_WORKFLOW_SID;
  const FLEX_WORKSPACE_SID =
    event.FlexWorkspaceSid || context.FLEX_WORKSPACE_SID;

  if (!FLEX_WORKFLOW_SID || !FLEX_WORKSPACE_SID) {
    return callback(
      new Error(
        "Missing configuration for FLEX_WORKSPACE_SID OR FLEX_WORKFLOW_SID"
      )
    );
  }

  const [serviceSid, conversationsSid] = event.request.headers["x-session-id"]
    ?.replace("conversations__", "")
    .split("/");
  const [traitName, identity] = event.request.headers["x-identity"]?.split(":");

  if (!identity || !conversationsSid) {
    return callback(new Error("Invalid request"));
  }

  try {
    let from = identity;
    let customerName = identity;
    let customerAddress = identity;
    let channelType = "chat";
    if (traitName === "whatsapp") {
      channelType = "whatsapp";
      from = `whatsapp:${identity}`;
      customerName = from;
      customerAddress = from;
    } else if (identity.startsWith("+")) {
      channelType = "sms";
      customerName = from;
      customerAddress = from;
    } else if (identity.startsWith("FX")) {
      // Flex webchat
      channelType = "web";
      customerName = from;
      customerAddress = from;
      try {
        const user = await client.conversations.users(identity).fetch();
        from = user.friendlyName;
      } catch (err) {
        console.error(err);
      }
    }
    const result = await client.flexApi.v1.interaction.create({
      channel: {
        type: channelType,
        initiated_by: "customer",
        properties: {
          media_channel_sid: conversationsSid,
        },
      },
      routing: {
        properties: {
          workspace_sid: FLEX_WORKSPACE_SID,
          workflow_sid: FLEX_WORKFLOW_SID,
          task_channel_unique_name: "chat",
          attributes: {
            from: from,
            customerName: customerName,
            customerAddress: customerAddress,
          },
        },
      },
    });
    console.log(result.sid);
  } catch (err) {
    console.error(err);
    return callback(new Error("Failed to hand over to a human agent"));
  }

  return callback(null, "Transferred to human agent");
};
