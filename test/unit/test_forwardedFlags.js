/* ***** BEGIN LICENSE BLOCK *****
 * ***** END LICENSE BLOCK ***** */

 // This tests replied and forward flags

load('soapRequestUtils.js');

var tests = [
  testSetupEwsServer,
  testSetupTestFolder,
  testCreateTestItem,
  testFlags,
  testShutdown,
];

function* testFlags()
{
  const PR_LAST_VERB_EXECUTED = "0x1081";
  const EXCHIVERB_REPLYTOALL = "103";
  const EXCHIVERB_REPLYTOSENDER = "102";
  const EXCHIVERB_FORWARD = "104";
  // find the test message
  gNativeMailbox.allIds(gTestNativeFolder.folderId, gEwsEventListener);
  yield false;

  let srcItemIds = gCompletionData.QueryInterface(Ci.msqIStringArray).wrappedJSObject;
  let itemId = srcItemIds.getAt(0);
  Assert.ok(itemId.length > 0);

  let testItem = gNativeMailbox.getItem(itemId);
  dl('Value of PR_LAST_VERB_EXECUTED is ' + testItem.getExtendedProperty(PR_LAST_VERB_EXECUTED));

  let clonedProperties = testItem.properties.clone(null);
  testItem.setExtendedProperty(PR_LAST_VERB_EXECUTED, "Integer", EXCHIVERB_REPLYTOSENDER, clonedProperties);
  Assert.equal(clonedProperties.getAString("ExtendedProperty/ExtendedFieldURI/$attributes/PropertyTag"), PR_LAST_VERB_EXECUTED);
  Assert.equal(clonedProperties.getAString("ExtendedProperty/Value"), EXCHIVERB_REPLYTOSENDER);

  // now try to update
  gNativeMailbox.updateItemProperties(testItem, clonedProperties, gEwsEventListener);
  yield false;

  // see if the pl changed
  gNativeMailbox.getNewItems(gTestNativeFolder, gEwsEventListener);
  yield false;
  Assert.equal(testItem.getExtendedProperty(PR_LAST_VERB_EXECUTED), EXCHIVERB_REPLYTOSENDER);

  // now set the other possibilities
  
  clonedProperties = testItem.properties.clone(null);
  testItem.setExtendedProperty(PR_LAST_VERB_EXECUTED, "Integer", EXCHIVERB_REPLYTOALL, clonedProperties);

  // now try to update
  gNativeMailbox.updateItemProperties(testItem, clonedProperties, gEwsEventListener);
  yield false;
  return;

  // see if the pl changed
  gNativeMailbox.getNewItems(gTestNativeFolder, gEwsEventListener);
  yield false;
  Assert.equal(testItem.getExtendedProperty(PR_LAST_VERB_EXECUTED), EXCHIVERB_REPLYTOALL);

  clonedProperties = testItem.properties.clone(null);
  testItem.setExtendedProperty(PR_LAST_VERB_EXECUTED, "Integer", EXCHIVERB_FORWARD, clonedProperties);

  // now try to update
  gNativeMailbox.updateItemProperties(testItem, clonedProperties, gEwsEventListener);
  yield false;

  // see if the pl changed
  gNativeMailbox.getNewItems(gTestNativeFolder, gEwsEventListener);
  yield false;
  Assert.equal(testItem.getExtendedProperty(PR_LAST_VERB_EXECUTED), EXCHIVERB_FORWARD);

  // now try to remove the properties
  clonedProperties = testItem.properties.clone(null);
  testItem.setExtendedProperty(PR_LAST_VERB_EXECUTED, "Integer", "", clonedProperties);

  // now try to update
  gNativeMailbox.updateItemProperties(testItem, clonedProperties, gEwsEventListener);
  yield false;

  // see if the pl changed
  gNativeMailbox.getNewItems(gTestNativeFolder, gEwsEventListener);
  yield false;
  Assert.equal(testItem.getExtendedProperty(PR_LAST_VERB_EXECUTED), "");

}

function run_test()
{
  async_run_tests(tests);
}
