/* ***** BEGIN LICENSE BLOCK *****
 * ***** END LICENSE BLOCK ***** */
 
 // This tests creating recurring exceptions using the native methods only
 
load('utilities.js');
load('soapRequestUtils.js');

var tests = [
  testSetupServer,
  testSetup,
  testGetNewItems,
  testCreateItem,
  testGetNewItems,
  testBaseItem,
  testMakeException,
  testGetNewItems,
  testShutdown,
]

var gAppointmentsNativeFolder;
var gItemIds;
var gMaster;
var gException;

var testItem =  oPL(
                { ItemClass: "IPM.Appointment",
                  Subject:   "This is a test appointment",
                  Sensitivity: "Normal",
                  Importance: "Normal",
                  //HasAttachments: false, // got an error trying to set this in create
                  Start: "2011-06-23T22:00:00Z",
                  End: "2011-06-23T23:00:00Z",
                  IsAllDayEvent: false,
                  Recurrence: oPL(
                  { DailyRecurrence: oPL(
                    { Interval: 1,
                    }),
                    NumberedRecurrence: oPL(
                    { StartDate: '2011-06-02Z',
                      NumberOfOccurrences: 10,
                    }),
                  }),
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
    gShowRequestXml = true;
    gNativeMailbox.deleteItems(itemIds, false, gEwsEventListener);
    //let request = createSoapRequest(gNativeMailbox);
    //let response = new EwsSoapResponse();
    //request.deleteItems(response, itemIds, false);
    //request.invoke();
    yield false;
  }

}

function* testGetNewItems() {
  gShowRequestXml = true;
  gNativeMailbox.getNewItems(gAppointmentsNativeFolder, gEwsEventListener);
  yield false;
  //dl('yield after getNewItems');

  gNativeMailbox.allIds(gAppointmentsNativeFolder.folderId, gEwsEventListener);
  yield false;

  gItemIds = gCompletionData.QueryInterface(Ci.msqIStringArray).wrappedJSObject;
  //if (gItemIds.length)
  //  dl('first item id is ' + gItemIds.getAt(0));
}

let newItemId = "";
function* testCreateItem()
{
  // create an item
  let nativeItem = gNativeMailbox.createItem(null, "IPM.Appointment", gAppointmentsNativeFolder);
  nativeItem.properties = testItem;
  gShowRequestXml = true;
  gNativeMailbox.saveNewItem(nativeItem, gEwsEventListener);
  yield false;
  newItemId = nativeItem.itemId;
}

function* testBaseItem()
{
  Assert.ok(gItemIds.length > 0);
  let nativeItem = gNativeMailbox.getItem(newItemId);
  Assert.ok(safeInstanceOf(nativeItem, Ci.msqIEwsNativeItem));
  let properties = nativeItem.properties;
  Assert.equal(10, properties.getValue("Recurrence/NumberedRecurrence/NumberOfOccurrences"));
}

function* testMakeException()
{
  let gMaster = gNativeMailbox.getItem(gItemIds.getAt(0));
  // create the exception item
  let gException = gNativeMailbox.createItem(null, "IPM.Appointment", gAppointmentsNativeFolder);
  gException.parentId = gMaster.itemId;
  gException.changeKey = gMaster.changeKey;
  let newProperties = gMaster.properties.clone(null);
  gException.properties = gMaster.properties;
  gException.instanceIndex = 3;
  // shouldn't have to set both this and instance index!
  gException.originalStart = "2011-06-04T22:00:00Z";
  newProperties.setAString("Subject", "I am an exception");
  gException.raiseFlags(Ci.msqIEwsNativeItem.UpdatedLocally);
  Assert.ok(gException.flags & Ci.msqIEwsNativeItem.UpdatedLocally ? true : false);
  showPL(newProperties);
  dl('updateItemProperties');
  gNativeMailbox.updateItemProperties(gException, newProperties, gEwsEventListener);
  showPL(gException.properties);
  yield false;

  // what can I test? At least the subject!
  Assert.equal(gException.properties.getAString("Subject"), "I am an exception");
  //Assert.ok(!gException.flags & Ci.msqIEwsNativeItem.UpdatedLocally ? true : false);
}
 
function run_test()
{
  async_run_tests(tests);
}

