/* ***** BEGIN LICENSE BLOCK *****
 * ***** END LICENSE BLOCK ***** */
 
 // This tests a folder create in EWS
 
load('soapRequestUtils.js');

var tests = [
  testSetupServer,
  testGetInbox,
  testGetRootSubfolders
]

var gInboxNativeFolder;
function* testGetInbox()
{
  // get the folder id for the inbox
  let request = createSoapRequest();
  request.mailbox = gNativeMailbox;

  gInboxNativeFolder = gNativeMailbox.getNativeFolder('inbox');

  response = new EwsSoapResponse();
  request.getFolder(response,
                    gInboxNativeFolder);
  request.invoke();
  yield false;

  dl('testGetInbox: after yield');
  Assert.ok(gInboxNativeFolder.folderId.length > 2);
}

function* testGetRootSubfolders() {
  let request = createSoapRequest();
  request.mailbox = gNativeMailbox;

  let parentFolder = gNativeMailbox.getNativeFolder('msgfolderroot');

  response = new EwsSoapResponse();
  request.discoverSubfolders(response, parentFolder, 0, 0);
  request.invoke();
  yield false;
  
  dl('yield after listSubfolders');
  //dumpXMLResponse(request.soapResponse.envelope);
  //showPropertyList(request.result);

  // use the msqIStringArray to find the inbox id
  let saFolderIds = parentFolder.subfolderIds;
/*
  for (i = 0; i < saFolderIds.length; i++)
  {
    folderIdObject = {};
    saFolderIds.getAt(i, folderIdObject);
    dl('folderIds[' + i + '] is ' + folderIdObject.value);
  }
*/
  let inboxIndex = saFolderIds.indexOf(gInboxNativeFolder.folderId);
  dl('inboxIndex is ' + inboxIndex);
  Assert.ok(inboxIndex != Ci.msqIStringArray.noIndex);
}
 
function run_test()
{
  async_run_tests(tests);
}

