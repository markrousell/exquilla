/* ***** BEGIN LICENSE BLOCK *****
 * ***** END LICENSE BLOCK ***** */
 
// This tests creation of a skink subfolder
 
load('soapRequestUtils.js');

var tests = [
  taskSetupEwsServer,
  taskSetupTestFolder,
  testCreateSubfolder,
  taskShutdown,
]

function* testCreateSubfolder() {

  Assert.ok(gEwsMailInbox.canCreateSubfolders);

  // setup notification of folder events
  let promise = PromiseUtils.promiseFolderAdded();

  let folderName = "SubFolder" + Math.floor(1000000 * Math.random());
  gExqIncomingServer.createSubfolder(gTestEwsFolderHost, folderName);
  let folder = yield promise;
  Assert.ok(folder instanceof Ci.nsIMsgFolder);
  Assert.equal(folder.name, folderName);

  // locate the new subfolder
  let newFolder = gTestEwsFolderHost.getChildNamed(folderName);
  Assert.ok(newFolder instanceof Ci.nsIMsgFolder);

  // that folder should have a corresponding native folder id
  let newEwsFolder = safeGetInterface(newFolder, Ci.msqIEwsMailFolder);
  Assert.ok(safeInstanceOf(newEwsFolder, Ci.msqIEwsMailFolder));
  let newFolderId = newEwsFolder.folderId;
  dl("newFolderId is " + newFolderId);
  Assert.ok(newFolderId.length > 20);

  // deletable tests
  Assert.ok(newFolder.deletable);
  Assert.ok(!gEwsMailInbox.deletable);
}

function run_test()
{
  tests.forEach(x => add_task(x));
  run_next_test();
}
