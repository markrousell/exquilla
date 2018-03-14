/* ***** BEGIN LICENSE BLOCK *****
 * ***** END LICENSE BLOCK ***** */
 
load('soapRequestUtils.js');

var tests = [
  testSetupEwsServer,
  testSetupTestFolder,
  testCreateTestItem,
  testGetNewMessages,
  testShutdown
]

gExpectMachineError = true;

function* testSetup()
{
  let prefService = Cc["@mozilla.org/preferences-service;1"].
                      getService(Ci.nsIPrefService);
  let branch = prefService.getBranch("extensions.exquilla.datastore");
  branch.setBoolPref("dump", true);
  yield true;
}

function* testGetNewMessages() {
  gNativeMailbox.testType = "ForceMissingBody";
  gNativeMailbox.getNewItems(gTest1NativeFolder, gEwsEventListener);
  yield false;

  gNativeMailbox.getNewItems(gTest1NativeFolder, gEwsEventListener);
  yield false;

  dl('yield after getNewItems');
  gNativeMailbox.allIds(gTest1NativeFolder.folderId, gEwsEventListener);

  yield false;

  let itemIds = gCompletionData.QueryInterface(Ci.msqIStringArray).wrappedJSObject;
  let itemId = itemIds.getAt(0);
  Assert.ok(itemId.length > 0);
  let nativeItem = gTest1NativeFolder.getItem(itemId);
  Assert.ok(safeInstanceOf(nativeItem, Ci.msqIEwsNativeItem));

  let properties = nativeItem.properties;

  // check some properties from the get call
  Assert.ok(properties.getAString("Culture").length > 0)

  // the sync state should also be set in the datastore
  let syncState = gNativeMailbox.datastore.getSyncState(gTest1NativeFolder, null);
  //dl('syncState is ' + syncState);
  Assert.ok(syncState.length > 0);

}
 
function run_test()
{
  async_run_tests(tests);
}

