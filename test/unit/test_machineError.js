/* ***** BEGIN LICENSE BLOCK *****
 * ***** END LICENSE BLOCK ***** */
 
 // This creates a machine error, and tests that response is returned.
 
load('soapRequestUtils.js');

//gShowRequestXml = true;

add_task(taskSetupServer);

add_task(function* testInitial()
{
  gNativeMailbox.needOnlineCheck = true;
  gNativeMailbox.needFolderDiscovery = true;
  let listener = machineListener();
  gNativeMailbox.testInitial(listener);
  let result = yield listener.promise;
  dump("result is " + JSON.stringify(result) + "\n");

  Assert.equal(result.status, Cr.NS_OK);
  Assert.ok(!gNativeMailbox.needOnlineCheck);
  Assert.ok(!gNativeMailbox.needFolderDiscovery);
});

add_task(function* testInvalidType0()
{
  gRequestError = false;
  gMachineError = false;
  gExpectMachineError = "InvalidType0MachineError";

  let listener = machineListener();
  gNativeMailbox.invalidType(listener, 0);

  let result = yield listener.promise;

  Assert.ok(!gRequestError);
  Assert.ok(gMachineError);
  Assert.ok(!result.status == Cr.NS_OK);
});

add_task(function* testInvalidType1()
{
  gRequestError = false;
  gMachineError = false;
  gExpectMachineError = "InvalidType1MachineError";

  let listener = machineListener();
  gNativeMailbox.invalidType(listener, 1);
  // This expects an error
  let result = yield listener.promise;

  Assert.ok(!gRequestError);
  Assert.ok(gMachineError);
  Assert.ok(!result.status == Cr.NS_OK);
});

add_task(function* testGenerateError()
{
  gRequestError = false;
  gMachineError = false;
  gExpectMachineError = "taskGenerateErrorMachineError";

  let listener = machineListener();
  gNativeMailbox.generateError(listener);
  // This expects an error
  let result = yield listener.promise;

  Assert.ok(gRequestError);
  Assert.ok(gMachineError);
  Assert.ok(!result.status == Cr.NS_OK);
});

add_task(function* testInvalidId()
{
  gRequestError = false;
  gExpectMachineError = "ErrorInvalidIdMalformed";
  let badItem = gNativeMailbox.getItem("ThisIsAnInvalidId");

  let listener = machineListener();
  gNativeMailbox.getItemBody(badItem, listener);
  let result = yield listener.promise;

  Assert.ok(gRequestError);
  Assert.ok(!result.status == Cr.NS_OK);
});

add_task(// repeat the test using the mailbox/machine calls
function* taskGetInvalidItem() {
  let itemId = "I am invalid";
  let item = gNativeMailbox.getItem(itemId);

  // null the item mimeContent
  item.mimeContent = "";
  item.mimeCharacterSet = "";
  listener = machineListener();
  gExpectMachineError = true;
  gNativeMailbox.getItemMimeContent(item, listener);
  let result = yield listener.promise;

  Assert.ok(result.status != Cr.NS_OK);

  item = null;
});

add_task(testShutdown);

function run_test()
{
  run_next_test();
}
