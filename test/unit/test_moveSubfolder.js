/* ***** BEGIN LICENSE BLOCK *****
 * ***** END LICENSE BLOCK ***** */
 
 // This tests native deleting subfolders
 
load('soapRequestUtils.js');

var tests = [
  taskSetupEwsServer,
  taskSetupTestFolder,
  taskCreateTestItem, // not really needed
  taskMoveSubfolder,
  taskShutdown,
]

function* taskMoveSubfolder()
{
  let folderIds = new StringArray();
  folderIds.append(gTest2NativeFolder.folderId);
  Assert.ok(!safeInstanceOf(gTestNativeFolder.getSubfolderNamed("test2"), Ci.msqIEwsNativeFolder));
  let listener = machineListener();
  gNativeMailbox.moveSubfolders(folderIds, gTestNativeFolder, listener);
  yield listener.promise;
  Assert.ok(!gStopMachineError);

  listener = machineListener();
  gNativeMailbox.discoverSubfolders(gTestNativeFolder, listener);
  yield listener.promise;

  dl('subfolder count is ' + gTestNativeFolder.subfolderIds.length);

  Assert.ok(safeInstanceOf(gTestNativeFolder.getSubfolderNamed("test2"), Ci.msqIEwsNativeFolder));
}

function run_test()
{
  tests.forEach(x => add_task(x));
  run_next_test();
}
