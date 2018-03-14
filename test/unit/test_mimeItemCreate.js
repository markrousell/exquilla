/* ***** BEGIN LICENSE BLOCK *****
 * ***** END LICENSE BLOCK ***** */
 
// This tests adding an item using mime content
 
load('utilities.js');
load('soapRequestUtils.js');

var tests = [
  testSetupEwsServer,
  testSetupTestFolder,
  testCreateMimeItem,
  testShutdown,
]

var mimeContent = '\
To: Kent James <rkentjames@caspia.org>, Kent James <rkent@mesquilla.com>\n\
Date: Fri, 11 Jun 2010 13:49:10 -0400\n\
Subject: This message has multiple To recipients\n\
Message-ID: <4C127716.7090404@caspia.com>\n\
Content-Type: text/plain; charset="iso-8859-1"\n\
Content-Transfer-Encoding: 7bit\n\
MIME-Version: 1.0\n\
\n\
  This is a test of receiving to multiple people.\n\
\n\
';

var gMsgAddedCount = 0;
var gMsgDeletedCount = 0;
var gFolderListener = 
{
  msgAdded: function msgAdded(msg)
  {
    dl('msgAdded: ' + msg.subject);
    gMsgAddedCount++;
    //async_driver();
  },

  msgsDeleted: function msgsDeleted(messages)
  {
    dl('msgsDeleted: count is ' + messages.length);
    gMsgDeletedCount += messages.length;
    async_driver();
  },
}

function* testCreateMimeItem() {

  // setup notification of folder events
  let MFNService = Cc["@mozilla.org/messenger/msgnotificationservice;1"]
                      .getService(Ci.nsIMsgFolderNotificationService);

  MFNService.addListener(gFolderListener, Ci.nsIMsgFolderNotificationService.msgAdded |
                                          Ci.nsIMsgFolderNotificationService.msgsDeleted);

  let testFolderId = gTest1NativeFolder.folderId;
  Assert.ok(testFolderId.length > 20);

  // update folder
  // This is the call that is causing a leak. See bug 604.
  gTest1ExqMailFolder.updateFolderWithListener(null, gEwsUrlListener);
  yield false;
  //MFNService.removeListener(gFolderListener);
  //testFolder = null;
  //testEwsFolder = null;
  //testFolderId = null;
  //MFNService = null;
  //return;

  // use mailbox commands to add a message to that folder
  let itemToSend = gNativeMailbox.createItem(null, "IPM.Note", gTest1NativeFolder);
  itemToSend.mimeContent = mimeContent;
  itemToSend.mimeCharacterSet = "UTF-8";

  let request = createSoapRequest(gNativeMailbox);

  let response = new EwsSoapResponse();
  response.showCall = true;
  response.showResponse = true;
  request.createItem(response, itemToSend, "SaveOnly");
  request.invoke();
  yield false;

  dl('created item id is ' + itemToSend.itemId);
  // update folder
  gTest1ExqMailFolder.updateFolderWithListener(null, gEwsUrlListener);
  yield false;

  Assert.equal(gTest1EwsMailFolder.getTotalMessages(false), 1);
  Assert.equal(gMsgAddedCount, 1);
  let message = firstMsgHdr(gTest1EwsMailFolder);
  Assert.ok(message instanceof Ci.nsIMsgDBHdr);
  //dump("subject is : " + message.subject + "\n");
  Assert.equal(message.subject, "This message has multiple To recipients");
}

function run_test()
{
  async_run_tests(tests);
}
