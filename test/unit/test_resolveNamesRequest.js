/* ***** BEGIN LICENSE BLOCK *****
 * ***** END LICENSE BLOCK ***** */
 
// This tests the resolveNames soap request. For this to work, the
// EWS account should have a contact that will resolve something
// when asked for "Test"
 
load('soapRequestUtils.js');

var tests = [
  taskSetupNative,
  taskResolveNames,
  taskShutdown
]

var gNewFolderId;

function* taskResolveNames() {
  let result = yield PromiseUtils.promiseSoapCall(gNativeMailbox, eventListener,
    "resolveNames", "Test", true);
  Assert.equal(result.status, Cr.NS_OK);

  let request = result.request;
  dl('resolveNames result:');
  showPL(request.result);
  let resolutions = request.result.getPropertyLists("ResolutionSet/Resolution");
  Assert.ok(resolutions instanceof Ci.nsIArray);
  Assert.ok(resolutions.length > 1);
  let resolution = resolutions.queryElementAt(1, Ci.msqIPropertyList).wrappedJSObject;
  Assert.ok(safeInstanceOf(resolution, Ci.msqIPropertyList));
  Assert.equal(resolution.getAString("Mailbox/MailboxType"), "Mailbox");

  // repeat the request using the mailbox
  gCompletionData = null;
  let listener1 = machineListener();
  gNativeMailbox.resolveNames("Test", true, listener1);
  yield listener1.promise;

  resolutions = gCompletionData;
  Assert.ok(resolutions instanceof Ci.nsIArray);
  Assert.ok(resolutions.length > 1);
  resolution = resolutions.queryElementAt(1, Ci.msqIPropertyList).wrappedJSObject;
  Assert.ok(safeInstanceOf(resolution, Ci.msqIPropertyList));
  Assert.equal(resolution.getAString("Mailbox/MailboxType"), "Mailbox");

  // no results
  gCompletionData = null;
  let listener2 = machineListener();
  gNativeMailbox.resolveNames("idonotexist", true, listener2);
  yield listener2.promise;

  dl('gCompletionData is ' + gCompletionData);
  if ((gCompletionData instanceof Ci.nsIArray) && !gCompletionData.length)
    gCompletionData = null;
  Assert.ok(gCompletionData === null);

}

function run_test()
{
  tests.forEach(x => add_task(x));
  run_next_test();
}
