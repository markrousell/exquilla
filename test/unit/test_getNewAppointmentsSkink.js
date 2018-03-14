/* ***** BEGIN LICENSE BLOCK *****
 * ***** END LICENSE BLOCK ***** */
 
 // This tests reading an ewsCalendar using Skink methods
 
load('utilities.js');
load('soapRequestUtils.js');

var tests = [
  testCalendarExtensionsLoaded,
  testSetupEwsServer,
  testCalendarRegistered,
  testGetCalendarItems,
  testClearCalendarSkink,
  testCalendarEmpty,
  testAddItem,
  testGetCalendarItems,
  testAddItemCorrect,
  //testDeleteItem,
  //testGetCalendarItems,
  //testCalendarEmpty,
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

