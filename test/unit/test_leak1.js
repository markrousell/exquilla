/* ***** BEGIN LICENSE BLOCK *****
 * ***** END LICENSE BLOCK ***** */

 // This file leaks
 // This tests creating recurring exceptions using Skink methods
 
/* ***** BEGIN LICENSE BLOCK *****
 * ***** END LICENSE BLOCK ***** */
 
 // creating and reading recurring appointments using Skink methods
 
load('utilities.js');
load('soapRequestUtils.js');

var tests = [
  testSetupEwsServer,
  testCalendarRegistered,
  testGetItems,
  testClearCalendarSkink,
  testGetItems,
  testEmpty,
  testAddItems,
  //testDeleteItem,
  //testGetItems,
  testShutdownCalendar,
  testShutdown,
]

var gAppointmentsNativeFolder;

// statement results
let gEwsCalendar = null;
let gCalendarItems = [];

/**
 * Async operations are called back via this interface.  If you know that your
 * object is not going to get called back for either of these methods, having
 * them return NS_ERROR_NOT_IMPLEMENTED is reasonable.
 */
var gCalIOperationListener  = 
{
  /**
   * For add, modify, and delete.
   *
   * @param aCalendar       the calICalendar on which the operation took place
   * @param aStatus         status code summarizing what happened
   * @param aOperationType  type of operation that was completed
   * @param aId             UUID of element that was changed
   * @param aDetail         not yet fully specified.  If aStatus is an error
   *                        result, this will probably be an extended error
   *                        string (eg one returned by a server).
   */
  onOperationComplete: function _onOperationComplete(aCalendar,
                           aStatus,
                           aOperationType,
                           aId,
                           aDetail)
  {
    dl('onOperationComplete');
    async_driver();
  },

  /**
   * For getItem and getItems.
   * 
   * @param aStatus   status code summarizing what happened.
   * @param aItemType type of interface returned in the array (@see
   *                  calICalendar::GetItems).
   * @param aDetail   not yet fully specified.  If aStatus is an error
   *                  result, this will probably be an extended error
   *                  string (eg one returned by a server).
   * @param aCount    size of array returned, in items
   * @param aItems    array of immutable items
   *
   * Multiple onGetResults might be called 
   */
  onGetResult: function _onGetResult(aCalendar,
                    aStatus,
                    aItemType, 
                    aDetail,
                    aCount, 
                    aItems )
  {
    dl('onGetResult()');
    for (let item of aItems)
    {
      dl('item is ' + item.title);
      gCalendarItems.push(item);
    }
    async_driver();
  },
}

/*
interface calIObserver : nsISupports
{
  void onStartBatch();
  void onEndBatch();
  void onLoad( in calICalendar aCalendar );
  void onAddItem( in calIItemBase aItem );
  void onModifyItem( in calIItemBase aNewItem, in calIItemBase aOldItem );
  void onDeleteItem( in calIItemBase aDeletedItem );
  void onError( in calICalendar aCalendar, in nsresult aErrNo, in AUTF8String aMessage );

  /// Called after a property is changed.
  void onPropertyChanged(in calICalendar aCalendar,
                         in AUTF8String aName,
                         in nsIVariant aValue,
                         in nsIVariant aOldValue);

  /// Called before the property is deleted.
  void onPropertyDeleting(in calICalendar aCalendar,
                          in AUTF8String aName);
};
*/

let gCalItem = null;
var gCalIObserver = {
  onStartBatch: function onStartBatch() {dl('onStartBatch');},
  onEndBatch: function onEndBatch() {dl('onEndBatch');},
  onLoad: function onLoad()
  {
    // This may go away due to core issues of multiple redraws, so I may
    //  have to use the other listener methods eventually for async_driver
    dl('onLoad');
    async_driver();
  },

  onAddItem: function onAddItem(aItem)
  {
    if (!gCalItem)
    {
      gCalItem = aItem
    }
    gCalendarItems.push(aItem);
    dl('onAddItem ' + (aItem && aItem.title ? aItem.title : '')
       + '\n' + aItem.id
      );
  },

  onModifyItem: function onModifyItem(aNewItem, aOldItem) {
    dl('onModifyItem');
    this.onDeleteItem(aOldItem);
    this.onAddItem(aNewItem);
    },
  onDeleteItem: function onDeleteItem(aDeletedItem) {
    let index = -1;
    for (let i in gCalendarItems)
    {
      if (gCalendarItems[i].id == aDeletedItem.id)
      {
        index = i;
        break;
      }
    }
    if (index != -1)
      gCalendarItems.splice(index, 1);
    else
    {
      dl('could not find deleted item in gCalendarItems');
      dl('deleted item has id ' + aDeletedItem.id);
      dl('gCalendar item ids:');
      for (let item of gCalendarItems)
      {
        dl(item.id + '\n');
      }
    }
    dl('onDeleteItem');
  },
  onError: function onError() {dl('onError');},
  onPropertyChanged: function onPropertyChanged() {dl('onPropertyChanged');},
  onPropertyDeleting: function onPropertyDeleting() {dl('onPropertyDeleting');},
}

function* testSetup()
{
  let prefService = Cc["@mozilla.org/preferences-service;1"].
                      getService(Ci.nsIPrefService);
  let branch = prefService.getBranch("extensions.exquilla.datastore");
  branch.setBoolPref("dump", true);
  yield true;
}

function* testCalendarRegistered()
{
  let calendars = cal.getCalendarManager().getCalendars({});
  let found = false;
  for (calendar of calendars)
  {
    dl('calendar type is ' + calendar.type);
    if (calendar.type = 'exquilla')
    {
      found = true;
      gEwsCalendar = calendar;
    }
  }
  Assert.ok(found);

  const calProperties = cal.calGetStringBundle("chrome://calendar/locale/calendar.properties");
  dl('calProperties is ' + calProperties);
  const bundleTZString =
      calProperties.GetStringFromName("likelyTimezone");
  dl('bundleTZString is ' + bundleTZString);
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
             },
           ];

let gEventEwsId;
function* testAddItems()
{
  dl('\ntestAddItems\n');
  for (let rule of rules)
  {
    let event;
    {
      event = createEventFromIcalString(rule.baseItem);
      gEwsCalendar.addObserver(gCalIObserver);
      gEwsCalendar.addItem(event, gCalIOperationListener);
      yield false;

      gEwsCalendar.removeObserver(gCalIObserver);
    }
  }
}

function* testGetItems()
{
  //gCalendarItems = [];
  Assert.ok(gEwsCalendar instanceof Ci.calICalendar);
  gEwsCalendar.addObserver(gCalIObserver);
  gEwsCalendar.refresh();
  yield false;

  gEwsCalendar.removeObserver(gCalIObserver);

}

function* testEmpty()
{
  Assert.equal(gCalendarItems.length, 0);
}

function* testClearCalendar()
{
  let ids = new StringArray();
  for (item of gCalendarItems)
    ids.append(item.getProperty('X-EXQUILLA-BASEID'));
  dl('deleting ' + ids.length + ' items');
  if (ids.length)
  {
    gNativeMailbox.deleteItems(ids, false, gEwsEventListener);
    yield false;
  }
  //gCalendarItems = [];
}

function* testShutdownCalendar()
{
  let jso = gEwsCalendar.wrappedJSObject;
  jso.shutdownEwsCalendar();
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
