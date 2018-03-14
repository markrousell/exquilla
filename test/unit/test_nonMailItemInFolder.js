/* ***** BEGIN LICENSE BLOCK *****
 * ***** END LICENSE BLOCK ***** */
 
// This tests that non-mail items ina mail folder
//  do not mess up the folder counts

load('soapRequestUtils.js');

var tests = [
  taskSetupEwsServer,
  taskSetupTestFolder,
  testReindexTestSkinkFolder,
  taskCreateTestItem,
  taskCounts1,
  taskAddPostToTest,
  taskAddCustomToTest,
  testShutdown,
]

function* testReindexTestSkinkFolder()
{
  let listener = new PromiseUtils.UrlListener();
  gTest1ExqMailFolder.reindex(null, listener);
  let result = yield listener.promise;

  skinkFolderCount(0,0,0,0,0,0);
}

var testCustomItem = oPL(
                    { ItemClass: "IPM.CustomType",
                      Subject:   "This is a custom item",
                      Importance: "Normal",
                      Body: oPL(
                                 {$value: 'The Body of the Custom Item',
                                  $attributes: oPL({BodyType: 'Text'})
                                 }),
                    });

var testPostItem = oPL(
                    { ItemClass: "IPM.Post",
                      Subject:   "This is a test post",
                      Importance: "Normal",
                      Body: oPL(
                                 {$value: 'The Body of the Post',
                                  $attributes: oPL({BodyType: 'Text'})
                                 }),
                    });

function* taskAddPostToTest()
{
  // create an item
  let nativeItem = gNativeMailbox.createItem(null, "IPM.Post", gTestNativeFolder);
  nativeItem.properties = testPostItem;
  gShowRequestXml = true;
  let l1 = machineListener();
  gNativeMailbox.saveNewItem(nativeItem, l1);
  yield l1.promise;
  gShowRequestXml = false;

  let l2 = new PromiseUtils.UrlListener();
  gTest1ExqMailFolder.updateFolderWithListener(null, l2);
  yield l2.promise;

  skinkFolderCount(2,2,0,0,2,2);
}

function* taskAddCustomToTest()
{
  // create an item
  let nativeItem = gNativeMailbox.createItem(null, "IPM.CustomType", gTestNativeFolder);
  nativeItem.properties = testCustomItem;
  gShowRequestXml = true;
  let l1 = machineListener();
  catchMe();
  gNativeMailbox.saveNewItem(nativeItem, l1);
  yield l1.promise;
  gShowRequestXml = false;

  let l2 = new PromiseUtils.UrlListener();
  gTest1ExqMailFolder.updateFolderWithListener(null, l2);
  yield l2.promise;

  // non-post custom item does not support unread
  skinkFolderCount(3,2,0,0,3,2);
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

function* taskCounts1()
{
  skinkFolderCount(1,1,0,0,1,1);
}

function run_test()
{
  tests.forEach(x => add_task(x));
  run_next_test();
}
