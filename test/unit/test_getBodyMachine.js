/* ***** BEGIN LICENSE BLOCK *****
 * ***** END LICENSE BLOCK ***** */
 
 // This tests the getItemBody machine
 
load('soapRequestUtils.js');

var tests = [
  taskSetupEwsServer,
  taskSetupTestFolder,
  taskCreateTestItem,
  taskGetItemBody,
  taskShutdown,
]

function* taskGetItemBody()
{
  var promiseStopMachine = new PromiseUtils.MachineListener();
  gNativeMailbox.allIds(gTestNativeFolder.folderId, promiseStopMachine);
  let result = yield promiseStopMachine.promise;

  let itemIds = result.data.QueryInterface(Ci.msqIStringArray).wrappedJSObject;
  let itemId = itemIds.getAt(0);
  dl('itemId is ' + itemId);
  let item = gTestNativeFolder.getItem(itemId);
  dl('item flags are ' + item.flags);
  dl('item processing flags are ' + item.processingFlags);
  dl('item.body is ' + item.body);
  gRequestError = true;
  gStopMachineError = true;
  var promiseStopMachine = new PromiseUtils.MachineListener();
  gNativeMailbox.getItemBody(item, promiseStopMachine);
  yield promiseStopMachine.promise;

  dl('item.body is ' + item.body);
  dl('item processing flags are ' + item.processingFlags);
  // These don't work with the C++ machine
  //Assert.ok(!gRequestError);
  //Assert.ok(!gStopMachineError);
  Assert.ok(item.body.length > 0);
  Assert.ok( (item.processingFlags & Ci.msqIEwsNativeItem.HasBody) != 0);
  Assert.ok( (item.flags & Ci.msqIEwsNativeItem.HasOfflineBody) != 0);

  // null out the body, and read it from the datastore
  item.body = "";
  // set gRequestError to prove that it did not run
  gRequestError = true;
  item.processingFlags &= ~(Ci.msqIEwsNativeItem.HasBody);
  var promiseStatementComplete = new PromiseUtils.EwsEventListener("StatementComplete");
  gNativeMailbox.datastore.getBody(item, promiseStatementComplete);
  yield promiseStatementComplete.promise;

  Assert.ok(item.body.length > 0);
  Assert.ok(gRequestError);
  Assert.ok( (item.processingFlags & Ci.msqIEwsNativeItem.HasBody) != 0);
}

function run_test()
{
  tests.forEach(x => add_task(x));
  run_next_test();
}
