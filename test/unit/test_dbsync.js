/* ***** BEGIN LICENSE BLOCK *****
 * ***** END LICENSE BLOCK ***** */

 // This tests sending a new message with createItem

load('soapRequestUtils.js');

var tests = [
  taskSetupEwsServer,
  taskSetupTestFolder,
  taskResync,
  taskShutdown
];

function* taskResync()
{
  // I want the resync to work even without an initial successful update
  //gTest1EwsMailFolder.updateFolderWithListener(null, gEwsUrlListener);
  //yield false;
  gTest1EwsMailFolder.msgDatabase.summaryValid = true;

  // disable autoResync
  ewsLog.info("Disable extensions.exquilla.resyncFolderSizeMax");
  Services.prefs.setIntPref("extensions.exquilla.resyncFolderSizeMax", 0);

  // test paged download
  Services.prefs.setIntPref("extensions.exquilla.resyncItemsMax", 5);

  // fix problems found
  Services.prefs.setBoolPref("extensions.exquilla.fixskinkdb", true);

  // add some items
  const kCount = 6;
  for (let i = 0; i < kCount; i++)
  {
    dump("\nadd item # " + i + "\n");
    // use mailbox commands to add a message to the test folder
    let itemToSend = gNativeMailbox.createItem(null, "IPM.Note", gTest1NativeFolder);
    itemToSend.properties = oPL(testFolderMessage);
    itemToSend.properties.setAString("Subject", "Resync test message #" + i);

    let saveNewListener = new PromiseUtils.MachineListener();
    gNativeMailbox.saveNewItem(itemToSend, saveNewListener);
    let saveResult = yield saveNewListener.promise;
    Assert.equal(saveResult.status, Cr.NS_OK);
  }
  let updateListener = new PromiseUtils.UrlListener();
  gTest1ExqMailFolder.updateFolderWithListener(null, updateListener);
  let updateResult = yield updateListener.promise;
  Assert.equal(updateResult, Cr.NS_OK);

  ewsLog.info("Before first testFolderCounts");
  testFolderCounts(kCount, kCount, kCount, kCount, kCount, kCount, 0, 0);

  // Corrupt the db, and try to fix with updates and resync
  corruptDb();
  ewsLog.info("after corruptDb");

  //gTest1EwsMailFolder.updateFolderWithListener(null, gEwsUrlListener);
  //yield false;

  let resyncListener = new PromiseUtils.UrlListener();
  gTest1ExqMailFolder.resyncFromNative(true, resyncListener);
  let resyncResult = yield resyncListener.promise;
  Assert.equal(resyncResult, Cr.NS_OK);
  let updateListener2 = new PromiseUtils.UrlListener();
  gTest1ExqMailFolder.updateFolderWithListener(null, updateListener2);
  let update2Result = yield updateListener2.promise;
  Assert.equal(update2Result, Cr.NS_OK);

  // Test the counts
  testFolderCounts(kCount, kCount, kCount, kCount, kCount, kCount, 0, 0);

  // resync again to observe counts
  let resync2Listener = new PromiseUtils.UrlListener();
  gTest1ExqMailFolder.resyncFromNative(true, resync2Listener);
  let resync2Result = yield resync2Listener.promise;
  Assert.equal(resync2Result, Cr.NS_OK);

}

function* testChangeSubject()
{
  testFolderMessage.setAString("Subject", "The second message");
}

function run_test()
{
  tests.forEach(x => add_task(x));
  run_next_test();
}

function corruptDb()
{
  let skinkDatabase = gTest1EwsMailFolder.msgDatabase;
  let skinkEnum = skinkDatabase.EnumerateMessages();
  Assert.ok(skinkEnum.hasMoreElements());

  // delete item from nativeDb
  Assert.ok(skinkEnum.hasMoreElements());
  let hdrSupports = skinkEnum.getNext();
  let hdr = hdrSupports.QueryInterface(Ci.nsIMsgDBHdr);
  let itemId = hdr.getProperty("ewsItemId");
  let nativeItem = gNativeMailbox.getItem(itemId, null);
  gNativeMailbox.removeItem(nativeItem);

  // modify changeKey of native item
  Assert.ok(skinkEnum.hasMoreElements());
  hdrSupports = skinkEnum.getNext();
  hdr = hdrSupports.QueryInterface(Ci.nsIMsgDBHdr);
  itemId = hdr.getProperty("ewsItemId");
  nativeItem = gNativeMailbox.getItem(itemId, null);
  nativeItem.changeKey = "not a valid changeKey";
  gNativeMailbox.datastore.putItem(nativeItem, null);

  // delete an item from db
  hdrSupports = skinkEnum.getNext();
  hdr = hdrSupports.QueryInterface(Ci.nsIMsgDBHdr);
  skinkDatabase.DeleteHeader(hdr, null, true, true);

  // create a bogus mork item
  let newHdr = skinkDatabase.CreateNewHdr(-1);
  newHdr.subject = "Some new hdr";
  skinkDatabase.AddNewHdrToDB(newHdr, false);

  // create a bogus item in nativeDb;
  let bogusItem = gNativeMailbox.createItem("bogus id", "IPM.Note", gTest1NativeFolder);
  gNativeMailbox.datastore.putItem(bogusItem, null);
}

function* testFolderCounts(aTotal, aUnread,
                          aDbTotal, aDbUnread,
                          aFolderTotal, aFolderUnread,
                          aTotalPending, aUnreadPending)
{
  let skinkDatabase = gTest1EwsMailFolder.msgDatabase;
  let folderInfo = skinkDatabase.dBFolderInfo;
  Assert.equal(folderInfo.numUnreadMessages, aTotal);
  Assert.equal(folderInfo.numMessages, aUnread);

  // enumerate over db
  let dbCount = 0;
  let dbUnreadCount = 0;
  let skinkEnum = skinkDatabase.EnumerateMessages();
  while (skinkEnum.hasMoreElements())
  {
    let hdrSupports = skinkEnum.getNext();
    let hdr = hdrSupports.QueryInterface(Ci.nsIMsgDBHdr);
    dbCount++;
    if (!hdr.isRead)
      dbUnreadCount++;
  }
  Assert.equal(dbCount, aDbTotal);
  Assert.equal(dbUnreadCount, aDbUnread);

  Assert.equal(gTest1EwsMailFolder.getTotalMessages(false), aFolderTotal);
  Assert.equal(gTest1EwsMailFolder.getNumUnread(false), aFolderUnread);

  Assert.equal(folderInfo.imapTotalPendingMessages, aTotalPending);
  Assert.equal(folderInfo.imapUnreadPendingMessages, aUnreadPending);
}
