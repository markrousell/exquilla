/* ***** BEGIN LICENSE BLOCK *****
 * ***** END LICENSE BLOCK ***** */
 
 // This tests EwsIncomingServer with online operations.

var Cu = Components.utils;
Cu.import("resource://exquilla/ewsUtils.jsm");
Cu.import("resource:///modules/mailServices.js");
Utils.importLocally(this);
Cu.import("resource://exquilla/EwsNotification.jsm");
load('utilities.js');
load('soapRequestUtils.js');

var tests = [
  taskSetupEwsServer,
  taskSetupTestFolder,
  taskStartNotification,
  taskCreateItemWithAttachment,
  taskWait,
  taskUnsubscribe,
  taskWait,
  // task shutdown causes errors in logging shutdown.
  taskShutdown,
];

let gEwsNotification = null;
function *taskStartNotification() {
  gEwsIncomingServer.setBoolValue("check_all_folders_for_new", true);
  gEwsNotification = new EwsNotification(gEwsIncomingServer);
  gEwsNotification.startNotifications();
}

// give time for the notification before shutdown
function* taskWait() {
  let WAIT_SECONDS = 15;
  yield PromiseUtils.promiseDelay(WAIT_SECONDS * 1000);
}

function* taskUnsubscribe() {
  // inject an unsubscribe request to test reset of subscription
  let response = new PromiseUtils.SoapResponse();
  let request = createSoapRequest(gNativeMailbox);
  request.unsubscribeNotifications(response, gEwsNotification._subscriptionId);
  request.invoke();
  let result = yield response.promise;
  Assert.equal(result.status, Cr.NS_OK);
}

function run_test()
{
  tests.forEach(x => add_task(x));
  run_next_test();
}
