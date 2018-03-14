/* ***** BEGIN LICENSE BLOCK *****
 * ***** END LICENSE BLOCK ***** */
 
 // This tests submission of multiple discovery requests
 
load('soapRequestUtils.js');

var tests = [
  testSetupServer,
  //testGetFolders,
  testGetInbox,
  testShutdown
]

var gInboxNativeFolder;

function* testGetInbox() {
  // setup logging
  let dirService = Cc["@mozilla.org/file/directory_service;1"].
                     getService(Ci.nsIProperties);
  let logFile = dirService.get("ProfD", Ci.nsIFile);
  dl('logFile is ' + logFile);
  logFile.append("soapLog.log");
  dl('logFile is ' + logFile);
  gNativeMailbox.soapLogFile = logFile;

  let request = createSoapRequest(gNativeMailbox);
  let inbox = gNativeMailbox.getNativeFolder('inbox');

  let response = new EwsSoapResponse();
  request.getFolder(response, inbox);

  // second request
  let response2 = new EwsSoapResponse();
  let request2 = createSoapRequest(gNativeMailbox);
  let outbox = gNativeMailbox.getNativeFolder('outbox');
  request2.getFolder(response2, outbox);
  gNativeMailbox.queueRequest(request);
  gNativeMailbox.queueRequest(request2);
  
  yield false;
  dl('yield after first request');
  yield false;
  
  dl('yield after second request');
  //dumpXMLResponse(request.soapResponse.envelope);

  // confirm that the inbox was found
  Assert.equal(inbox.displayName, 'Inbox');

  // now test the same thing using the machine
  gNativeMailbox.discoverSubfolders(inbox, gEwsEventListener);
  gNativeMailbox.discoverSubfolders(outbox, gEwsEventListener);

  yield false;
  dl('yield after first machine');
  yield false;
  dl('yield after second machine');
}

function* testShutdown()
{
  gNativeMailbox.datastore.asyncClose(gEwsEventListener);
  yield false;
}
 
function run_test()
{
  async_run_tests(tests);
}

