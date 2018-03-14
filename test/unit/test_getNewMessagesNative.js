/* ***** BEGIN LICENSE BLOCK *****
 * ***** END LICENSE BLOCK ***** */
 
 // This tests getNewItems for ewsNativeMailbox
 
load('soapRequestUtils.js');

var tests = [
  taskSetupEwsServer,
  taskSetupTestFolder,
  taskCreateTestItem,
  taskGetNewMessages,
  taskShutdown
]

var gInboxNativeFolder;

function* taskGetNewMessages() {
  dl("Normal getNewItems");
  var listener = machineListener();
  /**/
  gTest1NativeFolder.syncState = "";
  gNativeMailbox.getNewItems(gTest1NativeFolder, listener);
  var result = yield listener.promise;

  listener = machineListener();
  /**/
  gNativeMailbox.allIds(gTestNativeFolder.folderId, listener);
  result = yield listener.promise;

  let itemIds = result.data.QueryInterface(Ci.msqIStringArray).wrappedJSObject;
  let itemId = itemIds.getAt(0);
  Assert.ok(itemId.length > 0);
  let nativeItem = gTest1NativeFolder.getItem(itemId);

  // check some properties from the sync call
  Assert.ok(safeInstanceOf(nativeItem, Ci.msqIEwsNativeItem));
  let properties = nativeItem.properties;
  Assert.ok( nativeItem.itemClass.indexOf("IPM.Note") != -1);
  Assert.ok(safeInstanceOf(properties, Ci.msqIPropertyList));

  // check some properties from the get call
  showPL(properties);
  Assert.ok(properties.getAString("Culture").length > 0)

  // the sync state should also be set in the datastore
  let syncState = gNativeMailbox.datastore.getSyncState(gTest1NativeFolder, null);
  //dl('syncState is ' + syncState);
  Assert.ok(syncState.length > 0);

  // item with missing folder ID
  dl("item with missing folder ID");
  nativeItem.folderId = "";
  gNativeMailbox.datastore.putItem(nativeItem, null);

  // get the item
  listener = machineListener();
  gNativeMailbox.getNewItems(gTest1NativeFolder, listener);
  result = yield listener.promise;

  Assert.ok(nativeItem.folderId.length > 10);

  // set an item dirty
  dl("dirty item");
  nativeItem.properties = null;
  nativeItem.raiseFlags(Ci.msqIEwsNativeItem.Dirty);
  gNativeMailbox.datastore.putItem(nativeItem, null);

  // get the item
  listener = machineListener();
  gNativeMailbox.getNewItems(gTest1NativeFolder, listener);
  result = yield listener.promise;
  
  // now a bogus item
  dl("bogus item");
  let bogusItem = gNativeMailbox.getItem("");
  bogusItem.itemId = "invalid";
  gNativeMailbox.datastore.putItem(bogusItem, null);

  // find that item
  gNativeMailbox.datastore.getItem(bogusItem, null);
  Assert.ok(!!(bogusItem.flags & Ci.msqIEwsNativeItem.Persisted));

  // get the item
  gExpectMachineError = true;
  listener = machineListener();
  gNativeMailbox.getNewItems(gTest1NativeFolder, listener);
  result = yield listener.promise;
  
  // find that item, should now be gone
  gNativeMailbox.datastore.getItem(bogusItem, null);
  Assert.ok(!(bogusItem.flags & Ci.msqIEwsNativeItem.Persisted));


}
 
function run_test()
{
  tests.forEach(x => add_task(x));
  run_next_test();
}
