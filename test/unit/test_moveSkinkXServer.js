/* ***** BEGIN LICENSE BLOCK *****
 * ***** END LICENSE BLOCK ***** */
 
 // This tests skink message moves across folder types.

load('utilities.js');
load('soapRequestUtils.js');

var tests = [
  taskSetupEwsServer,
  taskSetupTestFolder,
  taskCreateTestItem,
  taskCopySkinkItems,
  taskSkinkFolderCount,
  taskMoveSkinkItems,
  taskCopyFileMessage,
  taskShutdown,
]

// update skink versions of ews folders
function *taskUpdateSkinkFolders() {
  let l1 = new PromiseUtils.UrlListener();
  gTest1ExqMailFolder.updateFolderWithListener(null, l1);
  let r1 = yield l1.promise;

  Assert.equal(r1, Cr.NS_OK);
  let l2 = new PromiseUtils.UrlListener();
  gTest2ExqMailFolder.updateFolderWithListener(null, l2);
  let r2 = yield l2.promise;

  Assert.equal(r2, Cr.NS_OK);
}

function* taskCopySkinkItems() {

  // do an initial update of the target folder
  let l1 = new PromiseUtils.UrlListener();
  gTest2ExqMailFolder.updateFolderWithListener(null, l1);
  let r1 = yield l1.promise;
  Assert.equal(r1, Cr.NS_OK);

  // Put an item in a local folder
  {
    let bugmail1 = do_get_file('data/bugmail1');
    let copyListener = new PromiseUtils.CopyListener();
    MailServices.copy.CopyFileMessage(bugmail1, gTestLocalFolderHost, null, false, 0, "", copyListener, null);
    let copyResult = yield copyListener.promise;
    Assert.ok(CS(copyResult.status));
  }

  // get the item from the test folder
  let message = firstMsgHdr(gTestLocalFolderHost);
  Assert.ok(message instanceof Ci.nsIMsgDBHdr);
  let messages = Cc["@mozilla.org/array;1"].createInstance(Ci.nsIMutableArray);
  messages.appendElement(message, false);
  /*
  void copyMessages(in nsIMsgFolder srcFolder, in nsIArray messages,
                    in boolean isMove, in nsIMsgWindow msgWindow,
                    in nsIMsgCopyServiceListener listener, in boolean isFolder,
                    in boolean allowUndo);
  */

  let copyListener = new PromiseUtils.CopyListener();
  gTest2EwsMailFolder.copyMessages(gTestLocalFolderHost, messages, false, null, copyListener, false, false);
  let copyResult = yield copyListener.promise;

  Assert.equal(copyResult.status, Cr.NS_OK);
  Assert.equal(gTest2EwsMailFolder.getTotalMessages(false), 1);
  Assert.equal(gTestLocalFolderHost.getTotalMessages(false), 1);
}

function* taskMoveSkinkItems() {

  // do an initial update of the target folder
  let l1 = new PromiseUtils.UrlListener();
  gTest2ExqMailFolder.updateFolderWithListener(null, l1);
  let r1 = yield l1.promise;
  Assert.equal(r1, Cr.NS_OK);

  // get the item from the test folder
  let message = firstMsgHdr(gTestLocalFolderHost);
  Assert.ok(message instanceof Ci.nsIMsgDBHdr);
  let messages = Cc["@mozilla.org/array;1"].createInstance(Ci.nsIMutableArray);
  messages.appendElement(message, false);
  /*
  void copyMessages(in nsIMsgFolder srcFolder, in nsIArray messages,
                    in boolean isMove, in nsIMsgWindow msgWindow,
                    in nsIMsgCopyServiceListener listener, in boolean isFolder,
                    in boolean allowUndo);
  */

  let copyListener = new PromiseUtils.CopyListener();
  gTest2EwsMailFolder.copyMessages(gTestLocalFolderHost, messages, true, null, copyListener, false, false);
  let copyResult = yield copyListener.promise;

  Assert.equal(copyResult.status, Cr.NS_OK);
  Assert.equal(gTest2EwsMailFolder.getTotalMessages(false), 2);
  Assert.equal(gTestLocalFolderHost.getTotalMessages(false), 0);

}

function* taskCopyFileMessage() {
  
  let bugmail = do_get_file('data/bugmail19CRLF.eml');
  let copyListener = new PromiseUtils.CopyListener();
  gTest2EwsMailFolder.copyFileMessage(bugmail, null, true, 0, "", null, copyListener);
  let copyResult = yield copyListener.promise;

  Assert.equal(copyResult.status, Cr.NS_OK);
  Assert.equal(gTest2EwsMailFolder.getTotalMessages(false), 3);
}

function* taskSkinkFolderCount()
{
  let enumerator = gTest2EwsMailFolder.msgDatabase.EnumerateMessages();
  let count = 0;
  while (enumerator.hasMoreElements())
  {
    count++;
    let hdr = enumerator.getNext().QueryInterface(Ci.nsIMsgDBHdr);
    dl("message " + count + " subject: " + hdr.subject + " key: " + hdr.messageKey);
  }
  Assert.equal(count, 1);
  yield true;
}

function run_test()
{
  tests.forEach(x => add_task(x));
  run_next_test();
}
