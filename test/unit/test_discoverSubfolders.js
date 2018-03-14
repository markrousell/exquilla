/* ***** BEGIN LICENSE BLOCK *****
 * ***** END LICENSE BLOCK ***** */
 
 // This tests discoverSubfolders request
 
load('soapRequestUtils.js');

var tests = [
  testSetupServer,
  testGetFolders,
  testGetRootSubfolders,
  testShutdown
]

var gInboxNativeFolder;
function* testGetFolders()
{
  let folders = Cc["@mozilla.org/array;1"].createInstance(Ci.nsIMutableArray);

  // get the folder id for the inbox
  let request = createSoapRequest();
  request.mailbox = gNativeMailbox;

  let folder = gNativeMailbox.getNativeFolder();
  folder.distinguishedFolderId = 'inbox';
  folders.appendElement(folder, false);

  folder = gNativeMailbox.getNativeFolder();
  folder.distinguishedFolderId = 'msgfolderroot';
  folders.appendElement(folder, false);

  let response = new EwsSoapResponse();
  request.getFolders(response, folders);
  request.invoke();
  yield false;

  Assert.ok(folder.folderId.length > 2);
}

function* testGetRootSubfolders() {
  let parentFolder = gNativeMailbox.getDistinguishedNativeFolder('msgfolderroot');
  /*
  let request = createSoapRequest();
  request.mailbox = gNativeMailbox;
  let response = new EwsSoapResponse();
  //response.showCall = true;
  //response.showResponse = true;
  request.discoverSubfolders(response, parentFolder, 50, 1);
  request.invoke();
  /**/
  gNativeMailbox.discoverSubfolders(parentFolder, gEwsEventListener);
  yield false;
  
  dl('yield after discoverSubfolders');
  //dumpXMLResponse(request.soapResponse.envelope);

  /*
  let rootFolderElement = request.soapResponse
                                 .envelope
                                 .getElementsByTagNameNS(
                                   "http://schemas.microsoft.com/exchange/services/2006/messages",
                                   "RootFolder")[0];
  dl('showing root folder IncludesLastItemInView ' + rootFolderElement.getAttribute("IncludesLastItemInRange"));
  */
  //dumpXMLResponse(rootFolderElement);

  let inboxFolder = gNativeMailbox.getNativeFolder('inbox');
  Assert.equal('Inbox', inboxFolder.displayName);
  Assert.ok(inboxFolder.folderId.length > 0);
  let inboxParentFolderId = inboxFolder.parentFolderId;
  let inboxParentFolder = gNativeMailbox.getNativeFolder(inboxParentFolderId);
  Assert.equal('msgfolderroot', inboxParentFolder.distinguishedFolderId);

  // update subfolderIds string array, and show that it works
  gNativeMailbox.updateSubfolderIds();
  let rootSubfolders = parentFolder.subfolderIds;
  let inboxFound = false;
  dl('rootSubfolders.length is ' + rootSubfolders.length);
  for (let i = 0; i < rootSubfolders.length; i++)
  {
    let child = gNativeMailbox.getNativeFolder(rootSubfolders.getAt(i));
    if ('inbox' == child.distinguishedFolderId)
    {
      inboxFound = true;
      break;
    }
  }
  Assert.ok(inboxFound);

  // now test getting all subfolders
  let allIds = new StringArray();
  gNativeMailbox.allFolderIds(gNativeMailbox.getNativeFolder("msgfolderroot").folderId, allIds);
  dl('found ' + allIds.length + ' folder ids');
  Assert.ok(allIds.length > 5);
  for (let index = 0; index < allIds.length; index++)
  {
    let folder = gNativeMailbox.getNativeFolder(allIds.getAt(index));
    Assert.ok(folder.verifiedOnline);
  }

  // clear the cache, and show that the folder is not found
  gNativeMailbox.clearCache();
  inboxFolder = gNativeMailbox.getNativeFolder('inbox');
  Assert.ok(inboxFolder.folderId.length == 0);

}

function* testShutdown()
{
  gNativeMailbox.datastore.asyncClose(gEwsEventListener);
  yield false;
}
 
function run_test()
{
  async_run_tests(tests);
}
