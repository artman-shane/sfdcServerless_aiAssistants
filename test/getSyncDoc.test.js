const { expect } = require("chai");
const sinon = require("sinon");
const { handler } = require("../functions/getSyncDoc.private.js");
const {
  getSyncData,
  deleteSyncData,
} = require("../assets/sfdc-functions.private.js");

describe("getSyncDoc.handler", () => {
  let getSyncDataStub;
  let deleteSyncDataStub;
  let context;
  let event;
  let callback;

  beforeEach(() => {
    // Mock dependencies
    getSyncDataStub = sinon.stub();
    deleteSyncDataStub = sinon.stub();

    // Replace the actual functions with stubs
    sinon.replace(
      require("../assets/sfdc-functions.private.js"),
      "getSyncData",
      getSyncDataStub
    );
    sinon.replace(
      require("../assets/sfdc-functions.private.js"),
      "deleteSyncData",
      deleteSyncDataStub
    );

    // Mock context, event, and callback
    context = {
      ACCOUNT_SID: "ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX", // Your Twilio Account SID
      AUTH_TOKEN: "your_auth_token", // Your Twilio Auth Token
      SERVICE_SID: "ISXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX", // Example of a Sync Service SID
    };
    event = { syncDocId: "testSyncDocId" };
    callback = sinon.spy();
  });

  afterEach(() => {
    // Restore original functions
    sinon.restore();
  });

  it("should handle a valid document and delete it", async () => {
    // Mock getSyncData to return a valid document
    getSyncDataStub.resolves({
      sid: "testSid",
      data: {
        contact: ["testContact"],
        caseDetails: {
          caseInfo: [{ OwnerId: "testOwnerId", CaseNumber: "testCaseNumber" }],
          workerDetails: [{ Flex_WorkerId__c: "testWorkerSid" }],
        },
      },
    });

    // Call the handler
    await handler(context, event, callback);

    // Assertions
    expect(getSyncDataStub.calledOnce).to.be.true;
    expect(getSyncDataStub.calledWith(context, event)).to.be.true;
    expect(deleteSyncDataStub.calledOnce).to.be.true;
    expect(deleteSyncDataStub.calledWith(context, "testSid")).to.be.true;
    expect(callback.calledOnce).to.be.true;
    expect(callback.args[0][1]).to.deep.equal({
      sid: "testSid",
      data: {
        contact: ["testContact"],
        caseDetails: {
          caseInfo: [{ OwnerId: "testOwnerId", CaseNumber: "testCaseNumber" }],
          workerDetails: [{ Flex_WorkerId__c: "testWorkerSid" }],
        },
      },
    });
  });

  it("should handle a document with missing data gracefully", async () => {
    // Mock getSyncData to return a document with missing data
    getSyncDataStub.resolves({
      sid: "testSid",
      data: {},
    });

    // Call the handler
    await handler(context, event, callback);

    // Assertions
    expect(getSyncDataStub.calledOnce).to.be.true;
    expect(deleteSyncDataStub.calledOnce).to.be.true;
    expect(deleteSyncDataStub.calledWith(context, "testSid")).to.be.true;
    expect(callback.calledOnce).to.be.true;
    expect(callback.args[0][1]).to.deep.equal({
      sid: "testSid",
      data: {},
    });
  });

  it("should handle an error from getSyncData", async () => {
    // Mock getSyncData to throw an error
    getSyncDataStub.rejects(new Error("Test Error"));

    // Call the handler
    await handler(context, event, callback);

    // Assertions
    expect(getSyncDataStub.calledOnce).to.be.true;
    expect(deleteSyncDataStub.notCalled).to.be.true;
    expect(callback.calledOnce).to.be.true;
    expect(callback.args[0][0]).to.be.an("error");
    expect(callback.args[0][0].message).to.equal("Test Error");
  });
});
