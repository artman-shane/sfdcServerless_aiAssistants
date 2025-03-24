/**
 * @param {import('@twilio-labs/serverless-runtime-types/types').Context} context
 * @param {{}} event
 * @param {import('@twilio-labs/serverless-runtime-types/types').ServerlessCallback} callback
 */
exports.handler = async function (context, event, callback) {
  console.log("Send to Flex");
  const client = context.getTwilioClient();
  console.log("Studio Flow Sid: ", context.STUDIO_FLOW_SID);
  console.log("Account SID: ", context.ACCOUNT_SID);

  const workerSid =
    event.workerSid && event.workerSid.length === 18 ? event.workerSid : null;
  const caseId =
    event.caseId && event.caseId.length === 18 ? event.caseId : null;

  console.log("Worker SID:", workerSid);
  console.log("Case ID:", caseId);

  const sessionId = event.request.headers["x-session-id"];
  if (sessionId.startsWith("voice:")) {
    console.log("Forwarding call to Studio Flow");
    const redirectUrl =
      `https://webhooks.twilio.com/v1/Accounts/${context.ACCOUNT_SID}/Flows/${context.STUDIO_FLOW_SID}?FlowEvent=return` +
      (caseId || workerSid
        ? `&${caseId ? `caseId=${encodeURIComponent(caseId)}` : ""}${
            workerSid ? `&workerSid=${encodeURIComponent(workerSid)}` : ""
          }`
        : "");

    console.log(
      `<Response><Say>One second while we connect you</Say><Redirect>https://webhooks.twilio.com/v1/Accounts/${context.ACCOUNT_SID}/Flows/${context.STUDIO_FLOW_SID}?FlowEvent=return</Redirect></Response>`
    );
    const [callSid] = sessionId.replace("voice:", "").split("/");
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await client.calls(callSid).update({
      twiml: `<Response><Say>One second while we connect you</Say><Redirect>https://webhooks.twilio.com/v1/Accounts/${context.ACCOUNT_SID}/Flows/${context.STUDIO_FLOW_SID}?FlowEvent=return</Redirect></Response>`,
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
