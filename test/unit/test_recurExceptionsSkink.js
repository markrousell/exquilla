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
  testRefreshCalendarItems,
  testClearCalendar,
  testRefreshCalendarItems,
  testEmpty,
  testAddItems,
  testGetAppointments,
  testDeleteOccurrence,
  testGetAppointments,
  testResetCalendar,
  //testDeleteItem,
  //testRefreshCalendarItems,
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
                          "RRULE:FREQ=DAILY;COUNT=6\n" +
                          "UID:123\n" +
                          "DTSTART:20110702T114500Z\n" +
                          "DTEND:20110702T124500Z\n" +
                          "END:VEVENT\n",
/**/
               exceptions:  [ "BEGIN:VEVENT\n" +
                              "SUMMARY:Recurrence rule test e1\n" +
                              "DTSTART:20110703T124500Z\n" +
                              "DTEND:20110703T134500Z\n" +
                              "UID:123\n" +
                              "RECURRENCE-ID:20110703T114500Z\n" +
                              "END:VEVENT\n",

                              "BEGIN:VEVENT\n" +
                              "SUMMARY:Recurrence rule test e2\n" +
                              "DTSTART:20110704T125500Z\n" +
                              "DTEND:20110704T135500Z\n" +
                              "UID:123\n" +
                              "RECURRENCE-ID:20110704T114500Z\n" +
                              "END:VEVENT\n"
                            ],

               tests:     { type: 'DAILY',
                            exStarts: ["2011-07-03T12:45:00Z", "2011-07-04T12:55:00Z"],
                            count: 6
                          }
/**/
             },
/**/
             // modify item
             { exceptions:  [ "BEGIN:VEVENT\n" +
                              "SUMMARY:Recurrence rule test e3\n" +
                              "DTSTART:20110705T114600Z\n" +
                              "DTSTART:20110705T125000Z\n" +
                              "UID:123\n" +
                              "RECURRENCE-ID:20110705T114500Z\n" +
                              "END:VEVENT\n",
                            ],

               tests:     { exStarts: ["2011-07-03T12:45:00Z", "2011-07-04T12:55:00Z", "2011-07-05T11:46:00Z"],
                          }
             },

/**/

           ];

var deletionId = '2011-07-06T11:45:00Z';

let gUseRefresh = true;
let gEventEwsId;
function* testAddItems()
{
  dl('\ntestAddItems\n');
  for (let rule of rules)
  {
    let ruleId = '';
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
    // now add exceptions

    if (!rule.baseItem)
    {
      // modify exceptions one at a time
      for (let exception of rule.exceptions)
      {
        let occurrence = createEventFromIcalString(exception);
        dl('occurence.id is ' + occurrence.id);
        ruleId = occurrence.id;
        event = gEwsCalendar.wrappedJSObject.mItems[occurrence.id];
        occurrence.parentItem = event;
        let oldOccurrence = event.recurrenceInfo.getOccurrenceFor(occurrence.recurrenceId);
        // XXX todo:
        //This is inheriting properties from the master, including the item id!

        gEwsCalendar.addObserver(gCalIObserver);
        gEwsCalendar.modifyItem(occurrence, oldOccurrence, gCalIOperationListener);
        yield false;

        gEwsCalendar.removeObserver(gCalIObserver);
      }
    }
    else
    {
      event = createEventFromIcalString(rule.baseItem);
      ruleId = event.id;
      for (let exception of rule.exceptions)
      {
        let occurrence = createEventFromIcalString(exception);
        event.recurrenceInfo.modifyException(occurrence, true);
      }
      gEwsCalendar.addObserver(gCalIObserver);
      gEwsCalendar.addItem(event, gCalIOperationListener);
      yield false;

      gEwsCalendar.removeObserver(gCalIObserver);

      event = gEwsCalendar.wrappedJSObject
                          .mItems[ruleId];
      gEventEwsId = event.getProperty('X-EXQUILLA-BASEID');
      dl('after initial base addItem, gEventEwsId is \n' + gEventEwsId);
    }

    /**/
    // At this point, the parent item should have the exceptions persisted
    {
      let itemId = gEwsCalendar.wrappedJSObject
                               .mItems[ruleId]
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
    /**/
    let recurrenceItems = event.recurrenceInfo.getRecurrenceItems({});
    // debug of what we created
    {
      dl('length of recurrence items is ' + event.recurrenceInfo.getRecurrenceItems({}).length);
      let exids = event.recurrenceInfo.getExceptionIds({});
      dl('exids length is ' + exids.length);
      for (let i = 0; i < rule.tests.exStarts.length; i++)
      {
        let exid = exids[i];
        dl('exid is ' + exid);
        let exceptionItem = event.recurrenceInfo.getExceptionFor(exid);
        Assert.ok(exceptionItem instanceof Ci.calIEvent);
        dl('exceptionItem.id is ' + exceptionItem.id);
        Assert.equal(rule.tests.exStarts[i], zuluDateTime(exceptionItem.startDate));
      }
    }

    // locate the recurrence rule
    let recurrenceRule;
    for (let recurrenceItem of recurrenceItems)
    {
      dl('recurrenceItem is ' + recurrenceItem);
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
    { // get items
      //gCalendarItems = [];
      gEwsCalendar.addObserver(gCalIObserver);
      gEwsCalendar.refresh();
      yield false;

      gEwsCalendar.removeObserver(gCalIObserver);
    }
/**/
  }
}

// test that a non-exception occurrence can be deleted
function* testDeleteOccurrence()
{
  // presumably we just did a refresh
  let recurrenceId = cal.fromRFC3339(deletionId, cal.UTC());
  dl('\nrecurrence date to delete is ' + recurrenceId);

  dl('old item count is ' + gCalendarItems[0].recurrenceInfo.countRecurrenceItems());
  let occurrence = gCalendarItems[0].recurrenceInfo
                                    .getOccurrenceFor(recurrenceId);
  let oldItem = gCalendarItems[0].clone();
  Assert.ok(!isDeletedDate(deletionId));
  gCalendarItems[0].recurrenceInfo.removeOccurrenceAt(recurrenceId);
  dl('new item count is ' + gCalendarItems[0].recurrenceInfo.countRecurrenceItems());
  // try to find the negative item
  Assert.ok(isDeletedDate(deletionId));

  gEwsCalendar.addObserver(gCalIObserver);
  gEwsCalendar.modifyItem(gCalendarItems[0], oldItem, gCalIOperationListener);
  yield false;

  gEwsCalendar.removeObserver(gCalIObserver);
  Assert.ok(isDeletedDate(deletionId));
/*
  { // get items
    //gCalendarItems = [];
    gEwsCalendar.addObserver(gCalIObserver);
    gEwsCalendar.refresh();
    yield false;

    gEwsCalendar.removeObserver(gCalIObserver);
  }
  Assert.ok(isDeletedDate(deletionId));
*/

}

function* testGetAppointments() {
  let nativeCalendar = gNativeMailbox.getNativeFolder('calendar');
  nativeCalendar.changeKey = 0;
  nativeCalendar.syncState = "";
  gNativeMailbox.datastore.setSyncState(nativeCalendar, "", null);
  gNativeMailbox.getNewItems(nativeCalendar, gEwsEventListener);
  yield false;

}


// Here we clear the calendar and re-read it.
function* testResetCalendar()
{
  for (let item of gCalendarItems)
  {
    dl('exceptions at:');
    for (let exception of item.recurrenceInfo.getExceptionIds({}))
      dl(exception);
  }
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

  for (item of gCalendarItems)
  {
    dl('exceptions at:');
    for (let exception of item.recurrenceInfo.getExceptionIds({}))
      dl(exception);
  }

  // make sure that the deleted occurrence is correct
  Assert.ok(isDeletedDate(deletionId));

/**/
  { // get items
    //gCalendarItems = [];
    gEwsCalendar.addObserver(gCalIObserver);
    gEwsCalendar.refresh();
    yield false;

    gEwsCalendar.removeObserver(gCalIObserver);
  }
  Assert.ok(isDeletedDate(deletionId));
/**/
}

function* testDeleteItem()
{
  gEwsCalendar.addObserver(gCalIObserver);
  let itemId = gCalendarItems[0].getProperty('X-EXQUILLA-BASEID');
  gEwsCalendar.deleteItem(gCalendarItems[0], gCalIOperationListener);
  yield false;

  gEwsCalendar.removeObserver(gCalIObserver);

// refresh so that the delete sticks
  gEwsCalendar.addObserver(gCalIObserver);
  gEwsCalendar.refresh();
  yield false;
  gEwsCalendar.removeObserver(gCalIObserver);

  // check that the children are also deleted
  gNativeMailbox.datastore.getIdsForParent(itemId, gEwsEventListener);
  yield false;

  Assert.ok((gCompletionData = gCompletion.QueryInterface(Ci.msqIStringArray));
  Assert.equal(gCompletionData.length, 0);
}

function run_test()
{
  async_run_tests(tests);
}

function zuluDateTime(aCalDateTime)
{
  let zuluDate = aCalDateTime.getInTimezone(cal.UTC());
  zuluDate.isDate = false;
  return cal.toRFC3339(zuluDate);
}

function isDeletedDate(aDateString)
{
  let recurrenceId = cal.fromRFC3339(aDateString, cal.UTC());
  let recurrenceItems = gCalendarItems[0].recurrenceInfo.getRecurrenceItems({});
  let foundIt = false;
  for (let recurrenceItem of recurrenceItems)
  {
    if (recurrenceItem instanceof Ci.calIRecurrenceDate)
    {
      dl('recurrenceItem date is ' + recurrenceItem.date);
      dl('recurrenceId is ' + recurrenceId);
      dl('recurrenceItem.isNegative is ' + recurrenceItem.isNegative);
      if (recurrenceItem.isNegative && (recurrenceItem.date.compare(recurrenceId) == 0))
      {
        dl('found matching negative date');
        foundIt = true;
      }
    }
  }
  return foundIt;
}
