/* ***** BEGIN LICENSE BLOCK *****
 * ***** END LICENSE BLOCK ***** */
 
 // This tests updateItem requests
 
load('soapRequestUtils.js');

var tests = [
  taskSetupEwsServer,
  taskSetupTestFolder,
  taskCreateTestItem,
  taskCreateTestItem,
  testUpdateItemMailbox,
  taskShutdown
]

var gInboxNativeFolder;

// repeat the request using the mailbox method
function* testUpdateItemMailbox() {
  let listener1 = machineListener();
  gNativeMailbox.allIds(gTestNativeFolder.folderId, listener1);
  let result1 = yield listener1.promise;
  Assert.equal(result1.status, Cr.NS_OK);

  let itemIds = gCompletionData.QueryInterface(Ci.msqIStringArray).wrappedJSObject;
  let itemId = itemIds.getAt(0);
  let item = gNativeMailbox.getItem(itemId);
  let newIsRead = !item.properties.getBoolean('IsRead');
  let new0 = item.properties.clone(null);
  new0.setBoolean("IsRead", newIsRead);
  let listener2 = machineListener();
  gNativeMailbox.updateItemProperties(item, new0, listener2);
  let result2 = yield listener2.promise;
  Assert.equal(result2.status, Cr.NS_OK);
}

function run_test()
{
  tests.forEach(x => add_task(x));
  run_next_test();
}

/*
function run_test()
{
  async_run_tests(tests);
}
*/
