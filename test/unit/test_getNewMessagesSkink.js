/* ***** BEGIN LICENSE BLOCK *****
 * ***** END LICENSE BLOCK ***** */
 
// This tests skink mail updates to show that updates
//  can fail and recover
// Derived from test_dirtySkinkMail

// Stop timeout
Services.prefs.setCharPref("extensions.exquilla.log.level", "Info");

load('soapRequestUtils.js');
load('utilities.js');

var tests = [
  taskSetupEwsServer,
  taskSetupTestFolder,
  taskCreateTestItem,
  testUpdateSkinkFolders,
  testUpdateSkinkFolders,
  testUpdateAllSkinkFolders,
  taskShutdown,
]

function* taskShutdownLogging() {
  yield Utils.promiseFlushLogging();
}

// update skink versions of ews folders
function* testUpdateSkinkFolders() {
  let listener = new PromiseUtils.UrlListener();
  gTest1EwsMailFolder.getNewMessages(null, listener);
  let result = yield listener.promise;
  Assert.equal(result, Cr.NS_OK);
}

function* testUpdateAllSkinkFolders() {
  gTest1EwsMailFolder.server.setBoolValue("check_all_folders_for_new", true);
  let listener = new PromiseUtils.UrlListener();
  gTest1EwsMailFolder.getNewMessages(null, listener);
  let result = yield listener.promise;
  Assert.equal(result, Cr.NS_OK);
}

function run_test()
{
  tests.forEach(x => add_task(x));
  run_next_test();
}
