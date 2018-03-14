/* ***** BEGIN LICENSE BLOCK *****
 * ***** END LICENSE BLOCK ***** */
 
 // This tests creating recurring exceptions using Skink methods
 
/* ***** BEGIN LICENSE BLOCK *****
 * ***** END LICENSE BLOCK ***** */
 
 // creating and reading recurring appointments using Skink methods
 
load('utilities.js');
load('soapRequestUtils.js');

var tests = [
  testSetupEwsServer,
  testCalendarRegistered,
  testAddItems,
  testRefreshCalendarItems,
  testClearCalendarSkink,
  testRefreshCalendarItems,
  testCalendarEmpty,
  testAddItems,
  testResetCalendar,
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

let rules = [
/**/
             // simple daily
             { baseItem:  "BEGIN:VEVENT\n" +
                          "SUMMARY:Recurrence rule test\n" +
                          "RRULE:FREQ=WEEKLY;COUNT=6\n" +
                          "UID:123\n" +
                          "DTSTART:20110702T041500Z\n" +
                          "DTEND:20110702T051500Z\n" +
                          "END:VEVENT\n",
/**/
               
               tests:     { type: 'WEEKLY',
                            count: 6,
                            daysOfWeek: [5,5,5,5,5,5],
                          },
/**/
             },             
/**/

           ];

let gUseRefresh = true;
let gEventEwsId;
function* testAddItems()
{
  dl('\ntestAddItems\n');
  for (let rule of rules)
  {
    /**/
    // I don't really understand why my calls to testDeleteItem() did not
    //  work, so I am duping the code here.
    if (gCalendarItems && gCalendarItems[0] && rule.baseItem)
    { // delete items
      gEwsCalendar.addObserver(gCalIObserver);
      gEwsCalendar.deleteItem(gCalendarItems[0], gCalIOperationListener);
      yield false;

      gEwsCalendar.removeObserver(gCalIObserver);
    }
    else
      dl('skipping delete');

    let event;
    event = createEventFromIcalString(rule.baseItem);

    // check the date meeting times
    let theDates = event.recurrenceInfo
                        .getOccurrenceDates(createCalDate(2000,1,1),
                                            createCalDate(2100,1,1),
                                            10, {});
    for (let aDate of theDates)
      dl('Occurrence for cal-created event at ' + aDate);

    gEwsCalendar.addObserver(gCalIObserver);
    gEwsCalendar.addItem(event, gCalIOperationListener);
    yield false;

    gEwsCalendar.removeObserver(gCalIObserver);

    event = gEwsCalendar.wrappedJSObject
                        .mItems[event.id];
    gEventEwsId = event.getProperty('X-EXQUILLA-BASEID');
    dl('after initial base addItem, gEventEwsId is \n' + gEventEwsId);

    /**/
    // At this point, the parent item should have the exceptions persisted
    {
      let itemId = gEwsCalendar.wrappedJSObject
                               .mItems[event.id]
                               .getProperty('X-EXQUILLA-BASEID');
      if (itemId != gEventEwsId)
        dl('\nWarning! gEventEwsId changed');
      let nativeItem = gNativeMailbox.getItem(itemId);
      gNativeMailbox.datastore.getItem(nativeItem, null);
    }

    if (gUseRefresh)
    {  
      gEwsCalendar.addObserver(gCalIObserver);
      gEwsCalendar.refresh();
      yield false;

      gEwsCalendar.removeObserver(gCalIObserver);
    }
    else
    {
      gCalendarItems = [];
      gEwsCalendar.wrappedJSObject
                  .shutdownEwsCalendar();
      gEwsCalendar.getItems(Ci.calICalendar.ITEM_FILTER_TYPE_EVENT,
                            0,
                            createCalDate(2000,1,1),
                            createCalDate(2100,1,1),
                            gCalIOperationListener);
      yield false;
    }


    Assert.equal(gCalendarItems.length, 1);
    // stop leak
    if (event && event.recurrenceInfo)
      event.recurrenceInfo = null;
    event = gCalendarItems[0];

    // check the date meeting times
    let occurrenceDates = event.recurrenceInfo
                        .getOccurrenceDates(createCalDate(2000,1,1),
                                            createCalDate(2100,1,1),
                                            10, {});
    for (let aDate of occurrenceDates)
      dl('Occurrence at ' + aDate + ' weekDay is ' + aDate.weekday);

    /**/
    let recurrenceItems = event.recurrenceInfo.getRecurrenceItems({});
    // debug of what we created
    {
      dl('length of recurrence items is ' + event.recurrenceInfo.getRecurrenceItems({}).length);
      let exids = event.recurrenceInfo.getExceptionIds({});
      dl('exids length is ' + exids.length);
    }

    // locate the recurrence rule
    let recurrenceRule;
    for (let recurrenceItem of recurrenceItems)
    {
      if (recurrenceItem instanceof Ci.calIRecurrenceRule)
      {
        recurrenceRule = recurrenceItem;
        break;
      }
    }
    Assert.ok(recurrenceRule instanceof Ci.calIRecurrenceRule);
    Assert.equal(recurrenceItems.length, 1); 
    if (rule.tests.type)
      Assert.equal(recurrenceRule.type, rule.tests.type);
    if (rule.tests.count)
      Assert.equal(recurrenceRule.count, rule.tests.count);
    if (rule.tests.until)
    {
      // see bug 877 "Fix issues with UNTIL for daily recurrences"
      dl('\nuntilDate is ' + recurrenceRule.untilDate);
    }
    if (rule.tests.daysOfWeek)
    {
     for (i = 0; i < rule.tests.daysOfWeek.length; i++)
       Assert.equal(occurrenceDates[i].weekday, rule.tests.daysOfWeek[i]);
    }
    { 
      gEwsCalendar.addObserver(gCalIObserver);
      gEwsCalendar.refresh();
      yield false;

      gEwsCalendar.removeObserver(gCalIObserver);
    }
/**/
  }
}

// Here we clear the calendar and re-read it.
function* testResetCalendar()
{
  gCalendarItems = [];
  gEwsCalendar.wrappedJSObject
              .shutdownEwsCalendar();
//calIOperation getItems(in unsigned long aItemFilter,
//                       in unsigned long aCount,
//                       in calIDateTime aRangeStart,
//                       in calIDateTime aRangeEndEx,
//                       in calIOperationListener aListener);
  gEwsCalendar.getItems(Ci.calICalendar.ITEM_FILTER_TYPE_EVENT,
                        0,
                        createCalDate(2000,1,1),
                        createCalDate(2100,1,1),
                        gCalIOperationListener);
  yield false;

  for (let item of gCalendarItems)
  {
    dl('item is ' + item.icalString);
  }

/**/
  { // get items
    //gCalendarItems = [];
    gEwsCalendar.addObserver(gCalIObserver);
    gEwsCalendar.refresh();
    yield false;

    gEwsCalendar.removeObserver(gCalIObserver);
  }
/**/
}

function run_test()
{
  async_run_tests(tests);
}
