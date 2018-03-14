/* ***** BEGIN LICENSE BLOCK *****
 * ***** END LICENSE BLOCK ***** */
 
 // This test uses the simplist possible genericMachine request to test it
 
load('soapRequestUtils.js');

var tests = [
  taskSetupServer,
  taskDiscoverSubfolders,
  taskShutdown
]

function* taskDiscoverSubfolders() {
  let nativeFolder = gNativeMailbox.getNativeFolder('deleteditems');
  let listener = machineListener();
  gNativeMailbox.discoverSubfolders(nativeFolder, listener);
  let result = yield listener.promise;
}

function run_test()
{
  tests.forEach(x => add_task(x));
  run_next_test();
}
