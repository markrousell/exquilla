/* ***** BEGIN LICENSE BLOCK *****
 * ***** END LICENSE BLOCK ***** */
 
 // This tests MoveItems request
 // it does not work
 
load('soapRequestUtils.js');

var tests = [
  testSetupEwsServer,
  testSetupTestFolder,
  testCreateTestItem,
  testCreateTestItem,
  testGetNewMessages,
  testCopyItems,
  //testReverseMove,
  testShutdown,
]

// statement results
var gCompletionResult;
var gCompletionData;
var isError = false;

function* testGetNewMessages() {
  gNativeMailbox.discoverFolders(gEwsEventListener);
  yield false;

  gNativeMailbox.getNewItems(gTestNativeFolder, gEwsEventListener);
  yield false;
}

function* testCopyItems() {

  dl('yield after getNewItems');
  gNativeMailbox.allIds(gTestNativeFolder.folderId, gEwsEventListener);
  yield false;

  let srcItemIds = gCompletionData.QueryInterface(Ci.msqIStringArray).wrappedJSObject;
  let itemId1 = srcItemIds.getAt(0);
  let itemId2 = srcItemIds.getAt(1);
  dl('itemId1 is ' + itemId1);
  Assert.ok(itemId1.length > 0);
  Assert.ok(itemId2.length > 0);

  // We should have gotten all of the subfolders
  let subFolders = gTestNativeFolder.subfolderIds;
  dl('number of subfolders is ' + subFolders.length);

  Assert.ok(safeInstanceOf(gTest2NativeFolder, Ci.msqIEwsNativeFolder));

  let itemIds = new StringArray();
  itemIds.append(itemId1);
  itemIds.append(itemId2);

  // do a mailbox call to copyItem
  gNativeMailbox.copyItems(gTest2NativeFolder, itemIds, true, gEwsEventListener);
  yield false;
  dl('after copyItems');

  // update the folder to get counts
  gNativeMailbox.getNewItems(gTest2NativeFolder, gEwsEventListener);
  yield false;

  // update the folder to get counts
  gNativeMailbox.getNewItems(gTestNativeFolder, gEwsEventListener);
  yield false;

  Assert.equal(gTest2NativeFolder.totalCount, 2);
  Assert.equal(gTestNativeFolder.totalCount, 0);

  //gNativeMailbox.persistNewItems(gTest2NativeFolder, gEwsEventListener);
  //yield false;

  gNativeMailbox.allIds(gTest2NativeFolder.folderId, gEwsEventListener);
  yield false;

  srcItemIds = gCompletionData.QueryInterface(Ci.msqIStringArray).wrappedJSObject;
  let newItemId1 = srcItemIds.getAt(0);
  let newItemId2 = srcItemIds.getAt(1);
  dl('newItemId1: ' + newItemId1);
  dl('newItemId2: ' + newItemId2);
}

function* testReverseMove()
{
  dl('gNativeMailbox.getNewItems');
  gNativeMailbox.getNewItems(gTest2NativeFolder, gEwsEventListener);
  yield false;

  // reverse using the mailbox call
  dl('gNativeMailbox.allIds');
  gNativeMailbox.allIds(gTest2NativeFolder.folderId, gEwsEventListener);
  yield false;

  let srcItemIds = gCompletionData.QueryInterface(Ci.msqIStringArray).wrappedJSObject;
  let itemId1 = srcItemIds.getAt(0);
  let itemId2 = srcItemIds.getAt(1);
  Assert.ok(itemId1.length > 0);
  Assert.ok(itemId2.length > 0);
  let itemIds = new StringArray();
  itemIds.append(itemId1);
  itemIds.append(itemId2);

  let inboxCount = gTestNativeFolder.totalCount;
  let destinationCount = gTest2NativeFolder.totalCount;

  gNativeMailbox.copyItems(gTestNativeFolder, itemIds, true, gEwsEventListener);

  // do a manual call to copyItem
  /*
  let request = createSoapRequest();
  request.mailbox = gNativeMailbox;

  let response = new EwsSoapResponse();
  request.copyItems(response, gTestNativeFolder, itemIds, true, null);
  request.invoke();
  */

  yield false;
  dl('after copyItems');
  // update the folder to get counts
  // do a manual call to copyItem
  let request = createSoapRequest();
  request.mailbox = gNativeMailbox;

  let response = new EwsSoapResponse();
  request.getFolder(response, gTest2NativeFolder);
  request.invoke();

  yield false;

  // update the folder to get counts
  // do a manual call to copyItem
  request = createSoapRequest();
  request.mailbox = gNativeMailbox;

  response = new EwsSoapResponse();
  request.getFolder(response, gTestNativeFolder);
  request.invoke();

  yield false;

  Assert.equal(gTest2NativeFolder.totalCount, 0);
  Assert.equal(gTestNativeFolder.totalCount, 2);

}
function run_test()
{
  async_run_tests(tests);
}
