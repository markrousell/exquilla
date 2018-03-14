/* ***** BEGIN LICENSE BLOCK *****
 * ***** END LICENSE BLOCK ***** */
 
 // This tests getNewItems for ewsNativeMailbox
 
load('soapRequestUtils.js');

var tests = [
  testSetupServer,
  testSetup,
  testGetNewItems,
  testConfirmEmpty,
  testShutdown
]

var gAppointmentsNativeFolder;

// statement results
var gCompletionResult;
var gCompletionData;

function* testSetup()
{
  let prefService = Cc["@mozilla.org/preferences-service;1"].
                      getService(Ci.nsIPrefService);
  let branch = prefService.getBranch("extensions.exquilla.datastore");
  branch.setBoolPref("dump", true);

  //gNativeMailbox.discoverFolders(gEwsEventListener);
  //yield false;

  gAppointmentsNativeFolder = gNativeMailbox.getNativeFolderFromCache('calendar');
  Assert.ok(safeInstanceOf(gAppointmentsNativeFolder, Ci.msqIEwsNativeFolder));
  let itemCount = gAppointmentsNativeFolder.totalCount;
  dl('destination item count is ' + itemCount);

  if (itemCount > 0)
  {
    // empty the test folder
    gNativeMailbox.getNewItems(gAppointmentsNativeFolder, gEwsEventListener);
    yield false;

    gNativeMailbox.allIds(gAppointmentsNativeFolder.folderId, gEwsEventListener);
    yield false;

    let itemIds = gCompletionData.QueryInterface(Ci.msqIStringArray).wrappedJSObject;
    for (i = itemIds.length - 1; i >= 0; i--)
    {
      let itemId = itemIds.getAt(i);
      dl('itemId is ' + itemId);
      if (itemId.match(/OriginalStart/))
      {
        // This is an exception, that will be deleted when its parent is deleted
        itemIds.removeAt(i);
        dl('itemId removed');
      }
    }
    for (i = 0; i < itemIds.length; i++)
      dl('deleting itemId ' + itemIds.getAt(i));
    gNativeMailbox.deleteItems(itemIds, false, gEwsEventListener);
    //let request = createSoapRequest(gNativeMailbox);
    //let response = new EwsSoapResponse();
    //request.deleteItems(response, itemIds, false);
    //request.invoke();
    yield false;
  }

}

function* testGetNewItems() {
  gNativeMailbox.getNewItems(gAppointmentsNativeFolder, gEwsEventListener);
  yield false;
  dl('yield after getNewItems');
}

function* testConfirmEmpty()
{
  gNativeMailbox.allIds(gAppointmentsNativeFolder.folderId, gEwsEventListener);
  yield false;

  let itemIds = gCompletionData.QueryInterface(Ci.msqIStringArray).wrappedJSObject;
  Assert.equal(itemIds.length, 0);
}
 
function run_test()
{
  async_run_tests(tests);
}

