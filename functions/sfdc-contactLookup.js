const { verifyRequest } = require("../assets/utils.private.js");
const {
  lookupContact,
  getOpenCases,
  connectToSfdc,
} = require("../assets/sfdc-functions.private.js");

exports.handler = async function (context, event, callback) {
  console.log("AI Assistant requested Contact Lookup");
  try {
    // if (!verifyRequest(context, event)) {
    //   console.error("Invalid token", event._token);
    //   return callback(new Error("Invalid token"));
    // }
    // Create a connection to SFDC

    const conn = await connectToSfdc(context);
    const contacts = await lookupContact(event, conn);
    console.log("Contacts: ", contacts);

    contacts.map((contact) => {
      console.log("Contact: ", contact.Id);
    });

    if (contacts.length > 1) {
      console.log("More than one contact returned: ", contacts.length);
      return callback(null, {
        LLM_instruction:
          'More than 1 contact was returned. Please have the end user identify themselves wihtout disclosing ANY information for ANY reqson. Here is an example to narrow the criteria: "more than one user was found using your phone numbner. Please provide your first and last name". Then use the "Id" field in the returned_contacts for the identified contact to return the open cases using the getOpenCases lookup tool. If you are unable to assit the user, please escalate to a human.',
        returned_contacts: contacts,
      });
    } else if (contacts.length === 1) {
      const contactId = contacts.map((contact) => {
        return contact.Id;
      });
      const openCases = await getOpenCases(contactId, conn);
      console.log("Once contact found.");
      callback(null, { contact: contacts, openCases: openCases });
    } else {
      console.log("No contact found");
      return callback(null, {
        message: "No contact found. Escalate to a human.",
      });
    }
  } catch (err) {
    console.error(err);
    return callback(null, {});
  }
};
