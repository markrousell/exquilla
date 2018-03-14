/* ***** BEGIN LICENSE BLOCK *****
 * ***** END LICENSE BLOCK ***** */
 
 // This tests native deleting subfolders
 
load('soapRequestUtils.js');

var tests = [
  taskSetupEwsServer,
  taskSetupTestFolder,
  taskCreateTestItem, // just to see what happens when there are items involved
  taskDeleteSubFolder,
  taskDeleteSubFolders,
  taskShutdown,
]

function* taskDeleteSubFolder()
{
  dl("gTestNativeFolderHost name=" + gTestNativeFolderHost.displayName);
  dl("gTest1NativeFolder name=" + gTest1NativeFolder.displayName);

  // make sure we can find these
  Assert.ok(hasSubfolder(gTestNativeFolderHost, "test1"));

  // first try a single folder delete, with a soap request
  let response = new PromiseUtils.SoapResponse();
  let request = createSoapRequest(gNativeMailbox);
  request.deleteFolder(response, gTest1NativeFolder, false);
  request.invoke();
  yield response.promise;

  Assert.ok(!hasSubfolder(gTestNativeFolderHost, "test1"));

  // recreate the test folder
  gTest1NativeFolder = gNativeMailbox.getNativeFolder();
  gTest1NativeFolder.folderClass = "IPF.Note";
  gTest1NativeFolder.displayName = "test1";
  let listener = machineListener();
  gNativeMailbox.createSubfolder(gTestNativeFolderHost, gTest1NativeFolder, listener);
  yield listener.promise;
}

function* taskDeleteSubFolders()
{
  let folderIds = new StringArray();

  // make sure we can find these
  Assert.ok(hasSubfolder(gTestNativeFolderHost, "test1"));
  Assert.ok(hasSubfolder(gTestNativeFolderHost, "test2"));

  // delete test1 and test, whose parent is gTestNativeFolderHost
  folderIds.append(gTest1NativeFolder.folderId);
  folderIds.append(gTest2NativeFolder.folderId);
  let listener = machineListener();
  gNativeMailbox.deleteSubfolders(folderIds, listener, false);
  yield listener.promise;

  // the delete should fix the native situation right away
  Assert.ok(!hasSubfolder(gTestNativeFolderHost, "test1"));
  Assert.ok(!hasSubfolder(gTestNativeFolderHost, "test2"));

  let discoverListener = machineListener();
  // and the change should persist through a discover
  gNativeMailbox.discoverSubfolders(gTestNativeFolderHost, discoverListener);
  yield discoverListener.promise;

  Assert.ok(!hasSubfolder(gTestNativeFolderHost, "test1"));
  Assert.ok(!hasSubfolder(gTestNativeFolderHost, "test2"));
}

function hasSubfolder(aNativeFolder, aName)
{
  let foundIt = false;
  let subfolderIds = aNativeFolder.subfolderIds;
  for (let i = 0; i < subfolderIds.length; i++)
  {
    let nativeSubfolder = gNativeMailbox.getNativeFolder(subfolderIds.getAt(i));
    if (nativeSubfolder.displayName == aName)
    {
      foundIt = true;
      break;
    }
  }
  return foundIt;
}

function run_test()
{
  tests.forEach(x => add_task(x));
  run_next_test();
}
