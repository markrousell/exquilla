/* ***** BEGIN LICENSE BLOCK *****
 * ***** END LICENSE BLOCK ***** */
 
 // This tests getting the body using skink calls
 
load('utilities.js');
load('soapRequestUtils.js');

var tests = [
  testSetupEwsServer,
  testSetupTestFolder,
  testCreateTestItem,
  testSkinkBody,
  testShutdown,
]

function* testSkinkBody()
{
  gTest1ExqMailFolder.updateFolderWithListener(null, ewsUrlListener);
  yield false;
  let message = firstMsgHdr(gTestEwsMailFolder);

  // To show issues with persistence
  gNativeMailbox.clearCache();

  let itemId = message.getProperty('ewsItemId');
  dl('new itemId is ' + itemId);
  let newItem = gNativeMailbox.getItem(itemId);
  Assert.ok(safeInstanceOf(newItem.properties, Ci.msqIPropertyList));
  Assert.ok(newItem.properties.length > 0);
  dl('\ngetContentFromMessage');
  getContentFromMessageAsync(message);
  yield false;
  let theBody = gStreamListener._str;
  dl('body is\n' + theBody);
  Assert.ok(/TheBody/.test(theBody));
/**/
}

function run_test()
{
  async_run_tests(tests);
}

