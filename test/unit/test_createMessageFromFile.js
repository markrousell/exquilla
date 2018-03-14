/* ***** BEGIN LICENSE BLOCK *****
 * ***** END LICENSE BLOCK ***** */
 
 // This tests creating a message from a file
 
load('soapRequestUtils.js');
Cu.import("resource:///modules/IOUtils.js");

var tests = [
  taskSetupEwsServer,
  taskSetupTestFolder,
  taskCreateMessageFromFile,
  taskCreateMessageFromString,
  taskShutdown,
]

function* taskCreateMessageFromFile()
{
  let file = do_get_file('data/bugmail1');

  let properties = new PropertyList();
  properties.appendBoolean("IsRead", true);
/*
  void createMessageFromFile(in nsIFile aMessageFile,
                             in msqIEwsNativeFolder aFolder,
                             in msqIPropertyList aProperties, // extra message metadata
                             in msqIEwsEventListener aEventListener);
*/
  let listener = machineListener();
  gNativeMailbox.createMessageFromFile(file, gTestNativeFolder, properties, listener);
  yield listener.promise;

  listener = machineListener();
  gNativeMailbox.getNewItems(gTestNativeFolder, listener);
  yield listener.promise;

  listener = machineListener();
  gNativeMailbox.allIds(gTestNativeFolder.folderId, listener);
  var result = yield listener.promise;

  let srcItemIds = result.data.QueryInterface(Ci.msqIStringArray).wrappedJSObject;
  let itemId1 = srcItemIds.getAt(0);
  Assert.ok(itemId1.length > 0);

  let newItem = gNativeMailbox.getItem(itemId1);
  //showPL(newItem.properties);
  Assert.equal(newItem.properties.getAString("Subject"), "[Bug 397009] A filter will let me tag, but not untag");

}

function* taskCreateMessageFromString()
{
  let file = do_get_file('data/bugmail1');
  let message = IOUtils.loadFileToString(file);

  let properties = new PropertyList();
  properties.appendBoolean("IsRead", true);
/*
  void createMessageFromFile(in nsIFile aMessageFile,
                             in msqIEwsNativeFolder aFolder,
                             in msqIPropertyList aProperties, // extra message metadata
                             in msqIEwsEventListener aEventListener);
*/
  let listener = machineListener();
  gNativeMailbox.createMessageFromString(message, gTestNativeFolder, properties, listener);
  yield listener.promise;

  listener = machineListener();
  gNativeMailbox.getNewItems(gTestNativeFolder, listener);
  yield listener.promise;

  listener = machineListener();
  gNativeMailbox.allIds(gTestNativeFolder.folderId, listener);
  var result = yield listener.promise;

  let srcItemIds = result.data.QueryInterface(Ci.msqIStringArray).wrappedJSObject;
  let itemId1 = srcItemIds.getAt(1);
  Assert.ok(itemId1.length > 0);

  let newItem = gNativeMailbox.getItem(itemId1);
  //showPL(newItem.properties);
  Assert.equal(newItem.properties.getAString("Subject"), "[Bug 397009] A filter will let me tag, but not untag");

}

function run_test()
{
  tests.forEach(x => add_task(x));
  run_next_test();
}
