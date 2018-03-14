/* ***** BEGIN LICENSE BLOCK *****
 * ***** END LICENSE BLOCK ***** */
 
 // This tests skink deleting subfolders
 
load('soapRequestUtils.js');

var tests = [
  taskSetupEwsServer,
  taskSetupTestFolder,
  taskCreateTestItem, // just to see what happens when there are items involved
  taskDeleteSubFolders,
  taskShutdown,
]

function* taskDeleteSubFolders()
{
  // Make sure that deletedItems does not contain this folder
  let trashFolder = gEwsIncomingServer.rootFolder.getFolderWithFlags(Ci.nsMsgFolderFlags.Trash);
  let trashedToDeleteFolder;
  try {
    trashedToDeleteFolder = trashFolder.getChildNamed("test1");
  } catch (ex) {};
  if (trashedToDeleteFolder) {
    let folderIds = new StringArray();
    let folders = Cc["@mozilla.org/array;1"].createInstance(Ci.nsIMutableArray);
    folders.appendElement(trashedToDeleteFolder, false);
    folderIds.append(safeGetInterface(trashedToDeleteFolder, Ci.msqIEwsMailFolder).folderId);
    const promiseDeleted = PromiseUtils.promiseFolderDeletedObservation(folderIds);
    trashedToDeleteFolder.parent.deleteSubFolders(folders, null);
    dl("Waiting for promiseDeleted of the folder, folder count " + folders.length);
    const result = yield promiseDeleted;
  }
  let folderIds = new StringArray();
  let folders = Cc["@mozilla.org/array;1"].createInstance(Ci.nsIMutableArray);
  folders.appendElement(gTest1EwsMailFolder, false);
  folderIds.append(gTest1ExqMailFolder.folderId);
  const promiseDeleted = PromiseUtils.promiseFolderDeletedObservation(folderIds);
  gTest1EwsMailFolder.parent.deleteSubFolders(folders, null);
  dl("Waiting for promiseDeleted of the folder, folder count " + folders.length);
  const result = yield promiseDeleted;

  dl("Message is: " + result.message);
  Assert.ok(!result.message.startsWith("failure"));
}

function run_test()
{
  tests.forEach(x => add_task(x));
  run_next_test();
}
