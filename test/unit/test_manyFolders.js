/* ***** BEGIN LICENSE BLOCK *****
 * ***** END LICENSE BLOCK ***** */
 
 // This tests many folders
 
load('soapRequestUtils.js');
load('utilities.js');

var tests = [
  testSetupServer,
  testSetupTestFolder,
  testCreateFolders,
  testDiscoverFolders,
  testShutdown,
]

function* testCreateFolders() {
  let folderCount = 2000;
  let batchCount = 50;
  // recreate the additional test folders

  let parent;
  for (let i = 0; i < folderCount;) {
    let parents = Cc["@mozilla.org/array;1"].createInstance(Ci.nsIMutableArray);
    parent = gNativeMailbox.getNativeFolder();
    parent.folderClass = "IPF.Note";
    parent.displayName = "parent" + i++;
    parents.appendElement(parent, false);
    let request = createSoapRequest(gNativeMailbox);
    let response = new EwsSoapResponse();
    request.createFolders(response, gTestNativeFolderHost, parents);
    request.invoke();
    yield false;
 
    let folders = Cc["@mozilla.org/array;1"].createInstance(Ci.nsIMutableArray);
    do {
      let testNativeFolder = gNativeMailbox.getNativeFolder();
      testNativeFolder.folderClass = "IPF.Note";
      testNativeFolder.displayName = "testMany" + i++;
      folders.appendElement(testNativeFolder, false);
    } while (i < folderCount && folders.length < batchCount);
    request = createSoapRequest(gNativeMailbox);
    response = new EwsSoapResponse();
    request.createFolders(response, parent, folders);
    request.invoke();
    yield false;
  }
}

function* testDiscoverFolders() {
  gNativeMailbox.discoverFolders(gEwsEventListener);
  yield false;
}

function run_test()
{
  async_run_tests(tests, 1200);
}
