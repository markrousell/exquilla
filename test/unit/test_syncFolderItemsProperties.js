/* ***** BEGIN LICENSE BLOCK *****
 * ***** END LICENSE BLOCK ***** */
 
 // This tests SyncFolderItemsProperties request
 
load('soapRequestUtils.js');

var tests = [
  testSetupEwsServer,
  testSetupTestFolder,
  testCreateTestItem,
  testGetFolders,
  testSyncFolderItemsProperties,
  testShutdown
]

var gInboxNativeFolder;

function* testGetFolders()
{
  // This checks finding the inbox, but we have now changed the test so
  //  we don't actually use that.
  let folders = Cc["@mozilla.org/array;1"].createInstance(Ci.nsIMutableArray);

  // get the folder id for the inbox
  let request = createSoapRequest();
  request.mailbox = gNativeMailbox;

  let folder = gNativeMailbox.getNativeFolder();
  folder.distinguishedFolderId = 'inbox';
  folders.appendElement(folder, false);

  folder = gNativeMailbox.getNativeFolder();
  folder.distinguishedFolderId = 'msgfolderroot';
  folders.appendElement(folder, false);

  let response = new EwsSoapResponse();
  request.getFolders(response, folders);
  request.invoke();
  yield false;

  Assert.ok(folder.folderId.length > 2);
}

/*
  void syncFolderItemsProperties(in msqIEwsSoapResponse aResponse,
                 in msqIEwsNativeFolder aNativeFolder,
                 in AString aSyncState,
                 in long aMaxChangesReturned,
                 in nsISupports aContext);
*/

function* testSyncFolderItemsProperties() {
  let request = createSoapRequest();
  request.mailbox = gNativeMailbox;
  let response = new EwsSoapResponse();
  let items = Cc["@mozilla.org/array;1"].createInstance(Ci.nsIMutableArray);

  request.syncFolderItemsProperties(response, gTest1NativeFolder, null, items, 10);
  request.invoke();
  yield false;

  dl('yield after syncFolderItemsProperties');
  //dl('soap call envelope');
  //dumpXMLResponse(request.soapCall.envelope);
  //dl('soap response envelope');
  //dumpXMLResponse(request.soapResponse.envelope);

  // test folder must have at least one message
  Assert.ok(items.length > 0);
  let nativeItem = items.queryElementAt(0, Ci.msqIEwsNativeItem);
  Assert.ok(safeInstanceOf(nativeItem, Ci.msqIEwsNativeItem));

  Assert.ok(nativeItem.itemId.length > 0);

}
 
function run_test()
{
  async_run_tests(tests);
}

