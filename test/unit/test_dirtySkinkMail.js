/* ***** BEGIN LICENSE BLOCK *****
 * ***** END LICENSE BLOCK ***** */
 
 // This tests dirty skink emails
 
load('soapRequestUtils.js');

var tests = [
  testSetupEwsServer,
  testSetupTestFolder,
  testCreateTestItem,
  testUpdateSkinkFolders,
  testSkinkFolderCount,
  testNullProperties,
  testUpdateSkinkFolders,
  testSkinkFolderCount,
  testShutdown,
]

// statement results
var gCompletionResult;
var gCompletionData;
var isError = false;

// update skink versions of ews folders
function* testUpdateSkinkFolders() {
  gTest1ExqMailFolder.updateFolderWithListener(null, ewsUrlListener);
  yield false;
}

var gMessages = [];
function* testSkinkFolderCount()
{
  let enumerator = gTestEwsMailFolder.msgDatabase.EnumerateMessages();
  let count = 0;
  while (enumerator.hasMoreElements())
  {
    count++;
    gMessages.push(enumerator.getNext().QueryInterface(Ci.nsIMsgDBHdr));
  }
  Assert.equal(count, 1);
  let itemId = gMessages[0].getProperty('ewsItemId');
  Assert.ok(itemId.length > 0);
  let nativeItem = gNativeMailbox.getItem(itemId);
  Assert.ok(safeInstanceOf(nativeItem.properties, Ci.msqIPropertyList));
  showPL(nativeItem.properties);
  Assert.equal(nativeItem.properties.getAString("Subject"), 'This is a test message');
  Assert.equal(gMessages[0].subject, 'This is a test message');

  yield true;
}

function* testNullProperties()
{
  let itemId = gMessages[0].getProperty('ewsItemId');
  Assert.ok(itemId.length > 0);
  let nativeItem = gNativeMailbox.getItem(itemId);
  Assert.ok(safeInstanceOf(nativeItem.properties, Ci.msqIPropertyList));
  nativeItem.properties = null;
  nativeItem.folderId = "";
  gMessages[0].subject = 'invalidSubject';
  nativeItem.raiseFlags(Ci.msqIEwsNativeItem.Dirty);
  gNativeMailbox.persistItem(nativeItem, null);
}

function run_test()
{
  async_run_tests(tests);
}
