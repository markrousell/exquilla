/* ***** BEGIN LICENSE BLOCK *****
 * ***** END LICENSE BLOCK ***** */
 
 // This tests CopyItems request
 // xxx todo: this does not work

load('utilities.js');
load('soapRequestUtils.js');

var tests = [
  taskSetupEwsServer,
  taskSetupTestFolder,
  taskCreateTestItem,
  taskCopySkinkItems,
  taskUpdateSkinkFolders,
  taskSkinkFolderCount,
  taskMoveSkinkFolder,
  taskShutdown,
]

// statement results
var gCompletionResult;
var gCompletionData;
var isError = false;

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

  // get the item from the test folder
  let message = firstMsgHdr(gTest1EwsMailFolder);
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
  gTest2EwsMailFolder.copyMessages(gTest1EwsMailFolder, messages, false, null, copyListener, false, false);
  let copyResult = yield copyListener.promise;
  Assert.equal(copyResult.status, Cr.NS_OK);
}

function* taskMoveSkinkFolder() {
  // move folder 2 under folder 1
  let listener = new PromiseUtils.CopyListener();
  gTest1EwsMailFolder.copyFolder(gTest2EwsMailFolder, true, null, listener);
  let result = yield listener.promise;
  Assert.equal(result.status, Cr.NS_OK);

  // let's test something basic.
  Assert.ok(gTest1EwsMailFolder.containsChildNamed("test2"));
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
