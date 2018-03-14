/* ***** BEGIN LICENSE BLOCK *****
 * ***** END LICENSE BLOCK ***** */
 
 // This tests a folder create in EWS
 
load('soapRequestUtils.js');

var tests = [
  testSetupServer,
  testSetupTestFolder,
  testCreateFolder,
  testCreateFolders,
  testShutdown
]

// logging test
Services.prefs.setCharPref("extensions.exquilla.datastore.level", "Info");
dl("##### set log level for datastore to Info");
var gNewFolderId;

var folderNumber = 3;

function* testCreateFolder() {

  let childFolder = gNativeMailbox.getNativeFolder();
  let folderName = "SubFolder" + folderNumber++;
  childFolder.displayName = folderName;
  dl('\ncreating subfolder <' + folderName + '>');

  // create with soap request
  let request = createSoapRequest(gNativeMailbox);
  let response = new EwsSoapResponse();
  response.showResponse = true;
  Assert.ok(childFolder.folderId.length < 80);

  request.createFolder(response, gTestNativeFolderHost, childFolder);
  request.invoke();
  yield false;

  Assert.ok(childFolder.folderId.length > 80);

  // create using mailbox
  childFolder = gNativeMailbox.getNativeFolder();
  folderName = "SubFolder" + folderNumber++;
  childFolder.displayName = folderName;
  dl('\ncreating subfolder <' + folderName + '>');
  dl("childFolder.folderId.length is " + childFolder.folderId.length);
  Assert.ok(childFolder.folderId.length < 80);
  gNativeMailbox.createSubfolder(gTestNativeFolderHost, childFolder, gEwsEventListener);
  yield false;

  // tests
  Assert.ok(childFolder.folderId.length > 80);
  gNewFolderId = childFolder.folderId;

  Assert.equal(childFolder.displayName, folderName);
  Assert.equal(typeof childFolder.totalCount, "number");
  Assert.equal(typeof childFolder.childFolderCount, "number");
  Assert.equal(typeof childFolder.unreadCount, "number");

  // get children of the folder host
  request = createSoapRequest(gNativeMailbox);
  response = new EwsSoapResponse();
  response.showResponse = true;
  request.discoverSubfolders(response, gTestNativeFolderHost, 0, 0);
  request.invoke();
  yield false;

  // check that the created folder now appears as an host subfolder
  let saFolderIds = gTestNativeFolderHost.subfolderIds;
  let newFolderIndex = saFolderIds.indexOf(gNewFolderId);
  dl('newFolderIndex ' + newFolderIndex);
  Assert.ok(newFolderIndex != Ci.msqIStringArray.noIndex);

  // get the folder, which should update all folder info
  request = createSoapRequest(gNativeMailbox);
  response = new EwsSoapResponse();
  response.showResponse = true;
  request.getFolder(response, childFolder, null);
  request.invoke();
  yield false;

  // get the folder using mailbox methods
  gNativeMailbox.getFolder(childFolder, gEwsEventListener);
  yield false;

  Assert.ok(childFolder.changeKey.length > 2);
/**/
}

const kFolderCount = 10;
function* testCreateFolders() {
  let folders = Cc["@mozilla.org/array;1"].createInstance(Ci.nsIMutableArray);
  for (let i = 0; i < kFolderCount; i++)
  {
    let childFolder = gNativeMailbox.getNativeFolder();
    let folderName = "SubFolder" + folderNumber++;
    childFolder.displayName = folderName;
    dl('\ncreating subfolder <' + folderName + '>');
    folders.appendElement(childFolder, false);
  }
  // create with soap request
  let request = createSoapRequest(gNativeMailbox);
  let response = new EwsSoapResponse();
  response.showResponse = true;

  request.createFolders(response, gTestNativeFolderHost, folders);
  request.invoke();
  yield false;

  for (let count = 0; count < kFolderCount; count++)
  {
    let folder = folders.queryElementAt(count, Ci.msqIEwsNativeFolder);
    Assert.ok(folder.folderId.length > 80);
  }
}

function run_test()
{
  async_run_tests(tests);
}
