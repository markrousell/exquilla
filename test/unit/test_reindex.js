/* ***** BEGIN LICENSE BLOCK *****
 * ***** END LICENSE BLOCK ***** */
 
// This tests reindex

load('soapRequestUtils.js');

var tests = [
  taskSetupEwsServer,
  taskSetupTestFolder,
  testReindexTestSkinkFolder,
  testCounts0,
  taskCreateTestItem,
  testCounts1,
  testReindexTestSkinkFolder,
  testCounts1,
  testDeleteTestItem,
  testReindexTestSkinkFolder,
  testCounts0,
  testShutdown,
]

function* testReindexTestSkinkFolder()
{
  let listener = new PromiseUtils.UrlListener();
  gTest1ExqMailFolder.reindex(null, listener);
  let result = yield listener.promise;
}
function skinkFolderCount(total, unread, pendingTotal, pendingUnread, nativeTotal, nativeUnread)
{
  var gMessages = [];
  Assert.equal(nativeUnread, gTestNativeFolder.unreadCount);
  Assert.equal(nativeTotal, gTestNativeFolder.totalCount);
  Assert.equal(pendingTotal, gTest1EwsMailFolder.numPendingTotalMessages);
  Assert.equal(pendingUnread, gTest1EwsMailFolder.numPendingUnread);
  Assert.equal(unread, gTest1EwsMailFolder.getNumUnread(false));

  let enumerator = gTest1EwsMailFolder.msgDatabase.EnumerateMessages();
  let count = 0;
  let dbUnreadCount = 0;

  // This is not a message, so it will not show up in the message db
  while (enumerator.hasMoreElements())
  {
    count++;
    let hdr = enumerator.getNext().QueryInterface(Ci.nsIMsgDBHdr);
    if (!hdr.isRead)
     dbUnreadCount++;
    gMessages.push(hdr);
  }
  Assert.equal(count, total);
  Assert.equal(unread, dbUnreadCount);

  // folder info
  let folderInfo = gTest1EwsMailFolder.msgDatabase.dBFolderInfo;
  Assert.equal(unread, folderInfo.numUnreadMessages);
  Assert.equal(total, folderInfo.numMessages);
  Assert.equal(pendingTotal, folderInfo.imapTotalPendingMessages);
  Assert.equal(pendingUnread, folderInfo.imapUnreadPendingMessages);
}

function* testCounts1()
{
  skinkFolderCount(1,1,0,0,1,1);
}

function* testCounts0()
{
  skinkFolderCount(0,0,0,0,0,0);
}

function *testDeleteTestItem() {
  // deletes the test item using low-level methods

  // Find the item in the native folder
  let allIds = gNativeMailbox.allCachedIds(gTest1NativeFolder.folderId);
  Assert.equal(allIds.length, 1);
 
  let response = new PromiseUtils.SoapResponse();
  let request = createSoapRequest(gNativeMailbox);
  request.deleteItems(response, allIds, false);
  request.invoke();
  yield response.promise;
}

function run_test()
{
  tests.forEach(x => add_task(x));
  run_next_test();
}
