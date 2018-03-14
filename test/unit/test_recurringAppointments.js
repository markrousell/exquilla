/* ***** BEGIN LICENSE BLOCK *****
 * ***** END LICENSE BLOCK ***** */
 
 // creating and reading recurring appointments using Skink methods
 
load('utilities.js');
load('soapRequestUtils.js');

var tests = [
  testSetupEwsServer,
  testCalendarRegistered,
  testGetCalendarItems,
  testClearCalendarSkink,
  testGetCalendarItems,
  testEmpty,
  testAddItems,
  //testDeleteItem,
  //testGetCalendarItems,
  testShutdownCalendar,
  testShutdown,
]

function* testSetup()
{
  let prefService = Cc["@mozilla.org/preferences-service;1"].
                      getService(Ci.nsIPrefService);
  let branch = prefService.getBranch("extensions.exquilla.datastore");
  branch.setBoolPref("dump", true);
  yield true;
}

function* testThisLeaks()
{
  let event = Cc["@mozilla.org/calendar/event;1"].createInstance(Ci.calIEvent);
  event.icalString =  "BEGIN:VEVENT\n" +
                      "SUMMARY:Daily count 3\n" +
                      "RRULE:FREQ=DAILY;COUNT=3\n" +
                      "DTSTART:20110602T114500Z\n" +
                      "END:VEVENT\n";
  //event.recurrenceInfo = null;
}

let rules = [
/**/
             // simple daily
             { addToIcal: "RRULE:FREQ=DAILY;COUNT=3\n",
               tests: { type: 'DAILY',
                        count: 3
                      }
             },
/**/
             // vary the count
             { addToIcal: "RRULE:FREQ=DAILY;COUNT=6\n",
               tests: { type: 'DAILY',
                        count: 6
                      }
             },
             // UNTIL date
             { addToIcal: "RRULE:FREQ=DAILY;UNTIL=20110609T000000Z\n",
               tests: { type: 'DAILY',
                        until: '20110609',
                      }
             },
             // Weekly count
             { addToIcal: "RRULE:FREQ=WEEKLY;COUNT=3;BYDAY=FR\n",
               tests: { type: 'WEEKLY',
                        count: 3,
                      }
             },

             // Weekly count
             { addToIcal: "RRULE:FREQ=WEEKLY;COUNT=15;BYDAY=SU,MO,TU,WE,TH,FR,SA\n",
               tests: { type: 'WEEKLY',
                        count: 15,
                      }
             },

             // no end recurrence
             { addToIcal: "RRULE:FREQ=WEEKLY;BYDAY=WE,TH,FR,SA\n",
               tests: { type: 'WEEKLY',
                      }
             },

             // Absolute Monthly day
             { addToIcal: "RRULE:FREQ=MONTHLY;BYMONTHDAY=2\n",
               tests: { type: 'MONTHLY',
                      }
             },

             // Relative Monthly
             { addToIcal: "RRULE:FREQ=MONTHLY;BYSETPOS=2;BYDAY=TH\n",
               tests: { type: 'MONTHLY',
                      }
             },

             // Absolute Yearly
             { addToIcal: "RRULE:FREQ=YEARLY;BYMONTHDAY=9;BYMONTH=6\n",
               tests: { type: 'YEARLY',
                      }
             },

             // Relative Yearly
             { addToIcal: "RRULE:FREQ=YEARLY;BYSETPOS=2;BYDAY=TH;BYMONTH=6\n",
               tests: { type: 'YEARLY',
                      }
             },
/**/

           ];

function* testAddItems()
{
  for (let rule of rules)
  {
    dl('starting test with addToIcal ' + rule.addToIcal);
    /**/
    // I don't really understand why my calls to testDeleteItem() did not
    //  work, so I am duping the code here.
    if (gCalendarItems && gCalendarItems[0])
    { // delete items
      gEwsCalendar.addObserver(gCalIObserver);
      gEwsCalendar.deleteItem(gCalendarItems[0], gCalIOperationListener);
      yield false;

      gEwsCalendar.removeObserver(gCalIObserver);
    }
    else
      dl('skipping delete');
    let event = createEventFromIcalString("BEGIN:VEVENT\n" +
                                          "SUMMARY:Recurrence rule test\n" +
                                          rule.addToIcal +
                                          "DTSTART:20110602T014500Z\n" +
                                          "END:VEVENT\n");
    gEwsCalendar.addObserver(gCalIObserver);
    gEwsCalendar.addItem(event, gCalIOperationListener);
    yield false;

    gEwsCalendar.removeObserver(gCalIObserver);
    { // get items
      //gCalendarItems = [];
      gEwsCalendar.addObserver(gCalIObserver);
      gEwsCalendar.refresh();
      yield false;

      gEwsCalendar.removeObserver(gCalIObserver);
    }

    Assert.equal(gCalendarItems.length, 1);
    // stop leak
    event.recurrenceInfo = null;
    event = gCalendarItems[0];
    /**/
    let recurrenceInfo = event.recurrenceInfo;
    let recurrenceItems = recurrenceInfo.getRecurrenceItems({});
    Assert.equal(recurrenceItems.length, 1); 
    let recurrenceRule = recurrenceItems[0].QueryInterface(Ci.calIRecurrenceRule);
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
  }
}

function* testDeleteItem()
{
  gEwsCalendar.addObserver(gCalIObserver);
  gEwsCalendar.deleteItem(gCalendarItems[0], null);
  yield false;

  gEwsCalendar.removeObserver(gCalIObserver);
}

function run_test()
{
  async_run_tests(tests);
}

