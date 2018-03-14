/* ***** BEGIN LICENSE BLOCK *****
 * ***** END LICENSE BLOCK ***** */
 
 // This tests CopyItems request
 
load('utilities.js');
load('soapRequestUtils.js');

var tests = [
  taskSetupEwsServer,
  taskSetupTestFolder,
  taskCreateTestItem,
  taskUpdateSkinkFolders,
  taskMoveSkinkItems,
  taskSkinkFolderCount,
  taskSkinkBody,
  taskShutdown,
]

// Let's test the Asian body
gTestFolderMessage = testFolderMessage2;

// update skink versions of ews folders
function* taskUpdateSkinkFolders() {
  let listener1 = new PromiseUtils.UrlListener();
  gTest1ExqMailFolder.updateFolderWithListener(null, listener1);
  let result1 = yield listener1.promise;
  Assert.ok(CS(result1));

  let listener2 = new PromiseUtils.UrlListener();
  gTest2ExqMailFolder.updateFolderWithListener(null, listener2);
  let result2 = yield listener2.promise;
  Assert.ok(CS(result2));
}

function* taskSkinkBody()
{
  let message = firstMsgHdr(gTest2EwsMailFolder);

  // To show issues with persistence
  gNativeMailbox.clearCache();

  let itemId = message.getProperty('ewsItemId');
  dl('new itemId is ' + itemId);
  let newItem = gNativeMailbox.getItem(itemId);
  Assert.ok(safeInstanceOf(newItem.properties, Ci.msqIPropertyList));
  Assert.ok(newItem.properties.length > 0);

  let theBody = getContentFromMessage(message);
  ewsLog.info('body is\n' + theBody);
  Assert.ok(/金牌面试/.test(theBody));
}

function* taskSkinkFolderCount()
{
  let enumerator = gTest2EwsMailFolder.msgDatabase.EnumerateMessages();
  let count = 0;
  while (enumerator.hasMoreElements())
  {
    count++;
    enumerator.getNext();
  }
  Assert.equal(count, 1);

  enumerator = gTestEwsMailFolder.msgDatabase.EnumerateMessages();
  count = 0;
  while (enumerator.hasMoreElements())
  {
    count++;
    enumerator.getNext();
  }
  Assert.equal(count, 0);
}

function* taskMoveSkinkItems() {
  dl("-----------------------------testMoveSkinkItems");

  // move a message from _test_ to _test2_
  // get the item from the test folder
  let message = firstMsgHdr(gTestEwsMailFolder);
  let messages = Cc["@mozilla.org/array;1"].createInstance(Ci.nsIMutableArray);
  messages.appendElement(message, false);
  /*
  void copyMessages(in nsIMsgFolder srcFolder, in nsIArray messages,
                    in boolean isMove, in nsIMsgWindow msgWindow,
                    in nsIMsgCopyServiceListener listener, in boolean isFolder,
                    in boolean allowUndo);
  */
  let listener = new PromiseUtils.CopyListener();
  gTest2EwsMailFolder.copyMessages(gTestEwsMailFolder, messages, true, null, listener, false, false);
  let result = yield listener.promise;
  Assert.equal(result.status, Cr.NS_OK);
}

function run_test()
{
  tests.forEach(x => add_task(x));
  run_next_test();
}
