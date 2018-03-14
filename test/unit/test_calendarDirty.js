/* ***** BEGIN LICENSE BLOCK *****
 * ***** END LICENSE BLOCK ***** */
 
 // This tests reading an ewsCalendar using Skink methods
 
load('soapRequestUtils.js');

var tests = [
  testCalendarExtensionsLoaded,
  testSetupEwsServer,
  testCalendarRegistered,
  testGetCalendarItems,
  testClearCalendarSkink,
  testCalendarEmpty,
  testAddItem,
  testGetCalendarItemsSkink,
  testAddItemCorrect,
  testRefreshCalendarItems,
  testAddItemCorrect,
  testEmptyProperty,
  testGetCalendarItemsSkink,
  testDirtyItem,
  //testDeleteItem,
  testRefreshCalendarItems,
  testDirtyItemClean,
  testMakeInvalidItem,
  testRefreshCalendarItems,
  testGetCalendarItemsSkink,
  testDirtyItemClean,
  testShutdownCalendar,
  testShutdown,
]

var gAppointmentsNativeFolder;

function* testSetup()
{
  let prefService = Cc["@mozilla.org/preferences-service;1"].
                      getService(Ci.nsIPrefService);
  let branch = prefService.getBranch("extensions.exquilla.datastore");
  branch.setBoolPref("dump", true);
  yield true;
}

function* testCalendarExtensionsLoaded()
{
  let protHandler = Components.classes["@mozilla.org/network/io-service;1"]
                       .getService(Components.interfaces.nsIIOService2)
                       .getProtocolHandler("resource")
                       .QueryInterface(Components.interfaces.nsIResProtocolHandler);

  dl('calendar resource is at ' + protHandler.getSubstitution("calendar").spec);
  let calendarManager = Cc["@mozilla.org/calendar/manager;1"]
                          .getService(Ci.calICalendarManager);

  Assert.ok(calendarManager instanceof Ci.calICalendarManager);

  // now using cal module
  let calMgr = cal.getCalendarManager();
  Assert.ok(calMgr instanceof Ci.calICalendarManager);

  let ewsCalendar = Cc["@mozilla.org/calendar/calendar;1?type=exquilla"]
                      .createInstance(Ci.calICalendar);
  Assert.ok(ewsCalendar instanceof Ci.calICalendar);
}

function* testAddItem()
{
  let event = createEventFromIcalString("BEGIN:VEVENT\n" +
                                        "SUMMARY:A test event\n" +
                                        "DTSTART;VALUE=DATE:20110601T114500Z\n" +
                                        "DTEND;VALUE=DATE:20110601T124500Z\n" +
                                        "END:VEVENT\n");
  gEwsCalendar.addObserver(gCalIObserver);
  gEwsCalendar.addItem(event, gCalIOperationListener);
  yield false;

  gEwsCalendar.removeObserver(gCalIObserver);
  Assert.equal(gCalendarItems.length, 1);
  Assert.equal(gCalendarItems[0].title, 'A test event');

}

function* testAddItemCorrect()
{
  Assert.equal(gCalendarItems.length, 1);
  Assert.equal(gCalendarItems[0].title, 'A test event');
}

var gCalendarFolderId;
var gTestItemId;

function* testEmptyProperty()
{
  // force an item to have null properties
  let nativeItem = gNativeMailbox.getItem(gCalendarItems[0].getProperty('X-EXQUILLA-BASEID'));
  gTestItemId = nativeItem.itemId;
  gCalendarFolderId = nativeItem.folderId;
  nativeItem.properties = null;
  gNativeMailbox.persistItem(nativeItem, gEwsEventListener);
  yield false;
}

function* testDirtyItem()
{
  Assert.equal(gCalendarItems.length, 0);
  gNativeMailbox.allIds(gCalendarFolderId, gEwsEventListener);
  yield false;

  let itemIds = gCompletionData.QueryInterface(Ci.msqIStringArray).wrappedJSObject;
  // the test item, though not in the calendar, should be in the datastore
  Assert.ok(itemIds.indexOf(gTestItemId) != -1);

  // now make sure this appears in the changed ids
  gNativeMailbox.changedOnFolderIds(gCalendarFolderId, gEwsEventListener);
  yield false;

  itemIds = gCompletionData.QueryInterface(Ci.msqIStringArray).wrappedJSObject;
  Assert.ok(itemIds.indexOf(gTestItemId) != -1);

  // I now want to force the mailbox to reread from the datastore
  gNativeMailbox.removeItemFromCache(gTestItemId);
  let eItem = gNativeMailbox.getItem(gTestItemId);
  Assert.equal(eItem.properties, null);
}

function* testDirtyItemClean()
{
  Assert.equal(gCalendarItems.length, 1);
  let nativeItem = gNativeMailbox.getItem(gCalendarItems[0].getProperty('X-EXQUILLA-BASEID'));
  let properties = nativeItem.properties;
  Assert.ok(safeInstanceOf(properties, Ci.msqIPropertyList));
  Assert.ok(properties.length > 0);
  Assert.ok(gCalendarItems[0].getProperty('X-EXQUILLA-BASEID') != 'invalid');
}

function* testMakeInvalidItem()
{
  // The calendar item will exist with an improper id. Dirty processing should remove
  //  this item, but create a correct one.
  let nativeItem = gNativeMailbox.getItem(gCalendarItems[0].getProperty('X-EXQUILLA-BASEID'));
  nativeItem.itemId = 'invalid';
  gCalendarItems[0].setProperty('X-EXQUILLA-BASEID', nativeItem.itemId);
  nativeItem.raiseFlags(Ci.msqIEwsNativeItem.Dirty);
  gNativeMailbox.persistItem(nativeItem, gEwsEventListener);
  yield false;
}
  
function* testDeleteItem()
{
  gEwsCalendar.addObserver(gCalIObserver);
  gEwsCalendar.deleteItem(gCalendarItems[0], gCalIOperationListener);
  yield false;

  gEwsCalendar.removeObserver(gCalIObserver);
}

function run_test()
{
  async_run_tests(tests);
}

