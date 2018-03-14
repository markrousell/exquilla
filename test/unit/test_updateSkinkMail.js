/* ***** BEGIN LICENSE BLOCK *****
 * ***** END LICENSE BLOCK ***** */
 
// This tests skink mail updates to show that updates
//  can fail and recover
// Derived from test_dirtySkinkMail
 
load('soapRequestUtils.js');
load('utilities.js');

var tests = [
  taskSetupEwsServer,
  taskSetupTestFolder,
  taskCreateTestItem,
  testUpdateSkinkFolders,
  testMarkReadOffline,
  testUpdateSkinkFolders,
  testSkinkFolderCount,
  taskShutdown,
]

// update skink versions of ews folders
function* testUpdateSkinkFolders() {
  let listener = new PromiseUtils.UrlListener();
  gTest1ExqMailFolder.updateFolderWithListener(null, listener);
  let result = yield listener.promise;
  Assert.equal(result, Cr.NS_OK);
}

var gMessages = [];
function* testSkinkFolderCount()
{
  let enumerator = gTest1EwsMailFolder.msgDatabase.EnumerateMessages();
  let count = 0;
  let dbUnreadCount = 0;
  while (enumerator.hasMoreElements())
  {
    count++;
    let hdr = enumerator.getNext().QueryInterface(Ci.nsIMsgDBHdr);
    if (!hdr.isRead)
     dbUnreadCount++;
    gMessages.push(hdr);
  }
  Assert.equal(count, 1);
  Assert.equal(gMessages[0].subject, 'This is a test message');
  let itemId = gMessages[0].getProperty('ewsItemId');
  Assert.ok(itemId.length > 0);
  let nativeItem = gNativeMailbox.getItem(itemId);
  Assert.ok(safeInstanceOf(nativeItem.properties, Ci.msqIPropertyList));

  // folder info
  let folderInfo = gTest1EwsMailFolder.msgDatabase.dBFolderInfo;
  Assert.equal(0, folderInfo.numUnreadMessages);
  Assert.equal(1, folderInfo.numMessages);
  Assert.equal(0, dbUnreadCount);
  Assert.equal(0, gTestNativeFolder.unreadCount);
}

function* testMarkReadOffline()
{
  let hdr = firstMsgHdr(gTest1EwsMailFolder);

  // set isRead but fail the EWS update
  gNativeMailbox.isOnline = false;
  gTest1EwsMailFolder.markAllMessagesRead(null);
  // This initiates an ews update with no listener. We rely on queuing to get this in order!
  yield PromiseUtils.promiseDelay(1000);
  gNativeMailbox.isOnline = true;
}

function run_test()
{
  tests.forEach(x => add_task(x));
  run_next_test();
}
