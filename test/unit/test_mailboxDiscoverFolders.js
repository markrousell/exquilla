/* ***** BEGIN LICENSE BLOCK *****
 * ***** END LICENSE BLOCK ***** */
 
 // This tests discover folders called into the mailbox machine
 
load('soapRequestUtils.js');

var tests = [
  testSetupServer,
  testDiscoverFolders,
]

var gInboxNativeFolder;
//gShowRequestXml = true;

function* testDiscoverFolders()
{
  // we need to setup the listeners
  gNativeMailbox.discoverFolders(gEwsEventListener);
  yield false;
  dl('after yield for discoverFolders');

  // some simple tests of folder discovery

  // root folder and its id
  let rootNativeFolder = gNativeMailbox.getNativeFolder('msgfolderroot');
  Assert.ok(safeInstanceOf(rootNativeFolder, Ci.msqIEwsNativeFolder));
  Assert.ok(rootNativeFolder.folderId.length > 10);
  Assert.equal(rootNativeFolder.distinguishedFolderId, 'msgfolderroot');

  // the inbox folder will have some non-distinguished subfolders
  let inboxFolder = gNativeMailbox.getNativeFolder('inbox');
  Assert.ok(safeInstanceOf(inboxFolder, Ci.msqIEwsNativeFolder));
  Assert.ok(inboxFolder.folderId.length > 10);
  Assert.ok(inboxFolder.childFolderCount > 0);

  let subfolder0Id = inboxFolder.subfolderIds.getAt(0);
  dl('subfolder id is ' + subfolder0Id);
  let subfolder = gNativeMailbox.getNativeFolder(subfolder0Id);
  Assert.ok(safeInstanceOf(subfolder, Ci.msqIEwsNativeFolder));
  dl('subfolder name is ' + subfolder.displayName);
  Assert.ok(subfolder.displayName.length > 0);

  // Trigger autodiscover
  gNativeMailbox.isOnline = false;
  gNativeMailbox.ewsURL = "https://example.com";
  // we need to setup the listeners
  gNativeMailbox.discoverFolders(gEwsEventListener);
  yield false;
  dl('after yield for discoverFolders');

  Assert.equal(gNativeMailbox.ewsURL.toLowerCase(), account.ewsURL.toLowerCase());

}

function run_test()
{
  async_run_tests(tests);
}
