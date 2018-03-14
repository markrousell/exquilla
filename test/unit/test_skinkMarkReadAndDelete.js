/* ***** BEGIN LICENSE BLOCK *****
 * ***** END LICENSE BLOCK ***** */
 
// This tests creation of a skink subfolder
 
load('soapRequestUtils.js');

var tests = [
  taskSetupEwsServer,
  taskSetupTestFolder,
  taskCreateTestItem,
  taskCreateTestItem,
  taskDeleteItem,
  taskShutdown,
]

function* taskDeleteItem() {
  let testEwsFolder = gTestEwsMailFolder;
  let testExqFolder = safeGetInterface(testEwsFolder, Ci.msqIEwsMailFolder);
  Assert.ok(safeInstanceOf(testExqFolder, Ci.msqIEwsMailFolder));
  let testFolderId = testExqFolder.folderId;
  Assert.ok(testFolderId.length > 20);

  // update folder
  // This is the call that is causing a leak. See bug 604.
  let listener1 = new PromiseUtils.UrlListener();
  testExqFolder.updateFolderWithListener(null, listener1);
  let result1 = yield listener1.promise;

  Assert.equal(testEwsFolder.getTotalMessages(false), 2);
  let messagesEnum = testEwsFolder.messages;
  let messages = Cc["@mozilla.org/array;1"].createInstance(Ci.nsIMutableArray);
  while (messagesEnum.hasMoreElements())
  {
    let message = messagesEnum.getNext();
    Assert.ok(message instanceof Ci.nsIMsgDBHdr);
    Assert.ok(!message.isRead);
    messages.appendElement(message, false);
  }
  // now delete the message
/*
  void deleteMessages(in nsIArray messages,
                      in nsIMsgWindow msgWindow,
                      in boolean deleteStorage, in boolean isMove,
                      in nsIMsgCopyServiceListener listener, in boolean allowUndo);
*/
  // this is the sequence that occurs in cmd_delete in mail3PaneWindowCommands.js
  testEwsFolder.markMessagesRead(messages, true);
  let trashFolder = testEwsFolder.rootFolder.getFolderWithFlags(Ci.nsMsgFolderFlags.Trash);
  let oldTrashCount = trashFolder.getTotalMessages(false);
  // The listener does not really work here, use the folder notification instead.
  let listener2 = new PromiseUtils.CopyListener();
  testEwsFolder.deleteMessages(messages, null, false, false, listener2, false);
  let result2 = yield listener2.promise;
  Assert.ok(CS(result2.status));

  messagesEnum = testEwsFolder.messages;
  Assert.ok(!messagesEnum.hasMoreElements());

  // The messages should be in trash
  Assert.equal(trashFolder.getTotalMessages(false), oldTrashCount + 2);

  // Now delete two messages from the trash
  let trashEnum = trashFolder.messages;
  messages.clear();
  messages.appendElement(trashEnum.getNext(), false);
  messages.appendElement(trashEnum.getNext(), false);
  let listener3 = new PromiseUtils.CopyListener();
  trashFolder.deleteMessages(messages, null, false, false, listener3, false);
  let result3 = yield listener3.promise;
  Assert.ok(CS(result3.status));
  Assert.equal(trashFolder.getTotalMessages(false), oldTrashCount);
}

function run_test()
{
  tests.forEach(x => add_task(x));
  run_next_test();
}
