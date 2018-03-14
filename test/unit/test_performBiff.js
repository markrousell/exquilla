/* ***** BEGIN LICENSE BLOCK *****
 * ***** END LICENSE BLOCK ***** */
 
 // This tests EwsIncomingServer method performBiff

var Cu = Components.utils;
Cu.import("resource://exquilla/ewsUtils.jsm");
Cu.import("resource:///modules/mailServices.js");
Utils.importLocally(this);

load('utilities.js');
load('soapRequestUtils.js');

// test item
// fake item for test folder
var itemObject =
{
  Culture: 'en-US',
  Subject: 'a test item',
  Body: oPL( {
               $value: 'the body',
               $attributes: oPL({ BodyType: 'Text'}),
             }
           ),
  Importance: 'Low',
  InReplyTo: 'repliedMessageId',
  Categories: aPL('String', ['cat1', 'cat2']),
};

var itemPL = oPL(itemObject);

var postObject =
{
  // Post-specific fields
  Sender: oPL(
  {
    Mailbox: oPL(
    { Name: "Fred Bailey",
      EmailAddress: "loser@example.com",
      RoutingType: "SMTP"
    }),
  }),
  IsRead: true,
  //InternetMessageId: "abcde@example.com",
  From: oPL(
  {
    Mailbox: oPL(
    {
      Name: "Golden Boy",
      EmailAddress: "theboy@example.net",
      RoutingType: "SMTP",
    })
  }),
  References: "xxx@example.org, yyy@example.net",
};

var postPL = oPL(itemObject);
for (let attr in postObject)
  postPL.replaceOrAppendElement(attr, postObject[attr]);

// message-specific fields not included in Post
var messageObject =
{
  ToRecipients: aPL('Mailbox', [
    oPL(
    { Name: "First To",
      EmailAddress: "firstto@example.com",
      RoutingType: "SMTP"
    }),
    oPL(
    { Name: "Second To",
      EmailAddress: "secondto@example.com",
      RoutingType: "SMTP"
    }),
  ]),
  CcRecipients: aPL('Mailbox', [
    oPL(
    { Name: "First Cc",
      EmailAddress: "firstcc@example.com",
      RoutingType: "SMTP"
    }),
  ]),
  BccRecipients: aPL('Mailbox', [
    oPL(
    { Name: "First Bcc",
      EmailAddress: "firstbcc@example.com",
      RoutingType: "SMTP"
    }),
    oPL(
    { Name: "Second Bcc",
      EmailAddress: "secondbcc@example.com",
      RoutingType: "SMTP"
    }),
    oPL(
    { Name: "Third Bcc",
      EmailAddress: "thirdbcc@example.com",
      RoutingType: "SMTP"
    }),
  ]),
  IsReadReceiptRequested: true,
  IsDeliveryReceiptRequested: true,
  IsRead: true,
  IsResponseRequested: false,
  ReplyTo: aPL('Mailbox', [
    oPL(
    { Name: "Reply To",
      EmailAddress: "firstreplyto@example.com",
      RoutingType: "SMTP"
    }),
  ]),
  /* EWS claims this cannot be set
  ReceivedBy: oPL(
  {
    Mailbox: oPL(
    { Name: "Received By",
      EmailAddress: "receivedby@example.com",
      RoutingType: "SMTP"
    }),
  }),
  */
  /* EWS claims this cannot be set
  ReceivedRepresenting: oPL(
  {
    Mailbox: oPL(
    { Name: "Received Representing",
      EmailAddress: "rr@example.com",
      RoutingType: "SMTP"
    }),
  }),
  */
};

var messagePL = oPL(itemObject);
for (let attr in postObject)
  messagePL.replaceOrAppendElement(attr, postObject[attr]);
for (let attr in messageObject)
  messagePL.replaceOrAppendElement(attr, messageObject[attr]);


var tests = [
  taskSetupEwsServer,
  taskSetupTestFolder,
  taskCreateMessage,
  taskTestBiff,
];

// similar to taskCreateTestItem, but using low-level
// methods to simulate a new item in the test folder.
function* taskCreateMessage()
{
  // tests the creation of a generic item
  let item = gNativeMailbox.createItem(null, "IPM.Note",
               gTest1NativeFolder);
  item.properties = messagePL;
  let result = yield PromiseUtils.promiseSoapCall(gNativeMailbox, eventListener,
    "createItem", item, "SaveOnly");
  Assert.equal(result.status, Cr.NS_OK);

  // I don't want this item to be known
  gNativeMailbox.removeItemFromCache(item.itemId);
}

function* taskTestBiff() {
  gTest1EwsMailFolder.setFlag(Ci.nsMsgFolderFlags.CheckNew);
  let promiseBiff = PromiseUtils.promiseBiffObservation(gEwsIncomingServer);
  gEwsIncomingServer.performBiff(null);
  let result = yield promiseBiff;
  Assert.equal(result.message, "success");

  let newMsg = firstMsgHdr(gTest1EwsMailFolder);
  Assert.equal(newMsg.subject, 'a test item');
}

function run_test()
{
  tests.forEach(x => add_task(x));
  run_next_test();
}
