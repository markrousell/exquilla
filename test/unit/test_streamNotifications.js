/* ***** BEGIN LICENSE BLOCK *****
 * ***** END LICENSE BLOCK ***** */
 
// This tests reindex

load('soapRequestUtils.js');

var tests = [
  taskSetupEwsServer,
  taskSubscribe,
  taskGetEvents,
  taskUnsubscribe,
  //taskAbort,
  testShutdown,
]

// subscribe
let gSubscriptionId = "";
function *taskSubscribe() {
  let folders = Cc["@mozilla.org/array;1"].createInstance(Ci.nsIMutableArray);
  folders.appendElement(gNativeInbox, false);
  let response = new PromiseUtils.SoapResponse();
  let request = createSoapRequest(gNativeMailbox);
  request.subscribeNotifications(response, folders, false);
  request.invoke();
  let result = yield response.promise;
  Assert.equal(result.status, Cr.NS_OK);
  let subscriptionId = result.request.result.getAString("SubscriptionId");
  // Has it changed?
  let unchanged = gSubscriptionId == subscriptionId;
  dl("subscriptionId unchanged? " + unchanged + " is " + subscriptionId);
  Assert.ok(subscriptionId.length > 10);
  gSubscriptionId = subscriptionId;
}

function *taskAbort() {
  // test of EwsNotification abort
  let ewsNotification = gExqIncomingServer._ewsNotification;
  dl("ewsNotification is " + ewsNotification);
  ewsNotification._request.soapResponse.xhr.abort();
  ewsNotification._request = null;
}

let ewsEventListener = {
  onEvent(aItem, aEvent, aData, aResult) {
    dl("ewsEventListener aEvent " + aEvent);
  }
}
  
// listen for events
function *taskGetEvents() {
  let response = new PromiseUtils.SoapResponse(ewsEventListener);
  let request = createSoapRequest(gNativeMailbox);
  request.getNotifications(response, gSubscriptionId, 1);
  request.invoke();
  let result = yield response.promise;
  Assert.equal(result.status, Cr.NS_OK);
}

// unsubscribe
function *taskUnsubscribe() {
  let response = new PromiseUtils.SoapResponse(ewsEventListener);
  let request = createSoapRequest(gNativeMailbox);
  request.unsubscribeNotifications(response, gSubscriptionId);
  request.invoke();
  let result = yield response.promise;
  Assert.equal(result.status, Cr.NS_OK);
}

function run_test()
{
  tests.forEach(x => add_task(x));
  run_next_test();
}
