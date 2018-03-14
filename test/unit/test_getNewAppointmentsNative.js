/* ***** BEGIN LICENSE BLOCK *****
 * ***** END LICENSE BLOCK ***** */
 
 // This tests getNewItems for ewsNativeMailbox
 
load('soapRequestUtils.js');

var tests = [
  testSetupServer,
  testSetup,
  testGetNewItems,
  testCreateItem,
  testGetNewItems,
  testConfirmAppointmentExists,
  testShutdown
]

var gAppointmentsNativeFolder;

// statement results
var gCompletionResult;
var gCompletionData;

var testItem = oPL(
                    { ItemClass: "IPM.Appointment",
                      Subject:   "This is a test appointment",
                      UID: "This is a UID",
                      //Sensitivity: "Normal",
                      //Importance: "Normal",
                      //HasAttachments: false,
                      Start: "2011-06-23T22:00:00Z",
                      End: "2011-06-23T23:00:00Z",
                    });

function* testSetup()
{
  let prefService = Cc["@mozilla.org/preferences-service;1"].
                      getService(Ci.nsIPrefService);
  let branch = prefService.getBranch("extensions.exquilla.datastore");
  branch.setBoolPref("dump", true);

  gNativeMailbox.discoverFolders(gEwsEventListener);
  yield false;

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
    gNativeMailbox.deleteItems(itemIds, false, gEwsEventListener);
    //let request = createSoapRequest(gNativeMailbox);
    //let response = new EwsSoapResponse();
    //request.deleteItems(response, itemIds, false);
    //request.invoke();
    yield false;
  }

}

function* testCreateItem()
{
  // create an item
  let calendarFolder = gNativeMailbox.getNativeFolderFromCache('calendar');
  Assert.ok(safeInstanceOf(calendarFolder, Ci.msqIEwsNativeFolder));
  let nativeItem = gNativeMailbox.createItem(null, "IPM.Appointment", calendarFolder);
  nativeItem.properties = testItem;
  gShowRequestXml = true;
  gNativeMailbox.saveNewItem(nativeItem, gEwsEventListener);
  yield false;
  gShowRequestXml = false;
}

function* testGetNewItems() {
  gNativeMailbox.getNewItems(gAppointmentsNativeFolder, gEwsEventListener);
  yield false;
  dl('yield after getNewItems');
}

function* testConfirmAppointmentExists()
{
  gNativeMailbox.allIds(gAppointmentsNativeFolder.folderId, gEwsEventListener);
  yield false;

  let itemIds = gCompletionData.QueryInterface(Ci.msqIStringArray).wrappedJSObject;
  let itemId = itemIds.getAt(0);
  Assert.ok(itemId.length > 0);
  let nativeItem = gAppointmentsNativeFolder.getItem(itemId);
  Assert.ok(safeInstanceOf(nativeItem, Ci.msqIEwsNativeItem));
  let properties = nativeItem.properties;
  // debug output of property list
  //showPropertyList(properties);

  // check some properties from the sync call
  Assert.equal(nativeItem.itemClass, "IPM.Appointment");
  let start = properties.getValue("Start");
  dl('start is ' + start + ' type ' + typeof(start));
  Assert.ok(start.length > 0);

  // the sync state should also be set in the datastore
  let syncState = gNativeMailbox.datastore.getSyncState(gAppointmentsNativeFolder, null);
  //dl('syncState is ' + syncState);
  Assert.ok(syncState.length > 0);

}
 
function run_test()
{
  async_run_tests(tests);
}

