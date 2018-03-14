/* ***** BEGIN LICENSE BLOCK *****
 * ***** END LICENSE BLOCK ***** */
 
 // This tests error response to a bad URL
 
load('soapRequestUtils.js');

var tests = [
  taskSetupServer,
  testGetNewMessagesBad,
  taskShutdown,
]

function* testGetNewMessagesBad() {
  let nativeInbox = gNativeMailbox.getNativeFolder('inbox');
  // a bad url
  gNativeMailbox.ewsURL = "https://example.com/iambad";
  gExpectMachineError = true;
  let listener = machineListener();
  gNativeMailbox.getNewItems(nativeInbox, listener);
  let result = yield listener.promise;
  Assert.ok(result.status != Cr.NS_OK);

  dl('yield after getNewItems');

}

function run_test()
{
  tests.forEach(x => add_task(x));
  run_next_test();
}

