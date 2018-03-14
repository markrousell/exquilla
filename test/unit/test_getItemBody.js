/* ***** BEGIN LICENSE BLOCK *****
 * ***** END LICENSE BLOCK ***** */
 
 // This tests GetItemBodies request
 
var gCompletionData;
var gCompletionResult;
load('soapRequestUtils.js');

var tests = [
  testSetupEwsServer,
  testSetupTestFolder,
  testCreateTestItem,
  testGetItemBodies,
  testGetItemBodiesMailbox
]

var gInboxNativeFolder;

/*
  /// get item bodies in default format
  void getItemBodies(in msqIEwsSoapResponse aResponse,
                 in msqIEwsNativeMailbox aMailbox,
                 in nsIArray aNativeItems) // array of msqIEwsNativeItem objects
*/

function* testGetItemBodies() {
  gNativeMailbox.allIds(gTestNativeFolder.folderId, gEwsEventListener);
  yield false;

  let itemIds = gCompletionData.QueryInterface(Ci.msqIStringArray).wrappedJSObject;
  let itemId = itemIds.getAt(0);
  let item = gTestNativeFolder.getItem(itemId);

  let request = createSoapRequest();
  request.mailbox = gNativeMailbox;
  let items = Cc["@mozilla.org/array;1"].createInstance(Ci.nsIMutableArray);
  items.appendElement(item, false);
  
  let response = new EwsSoapResponse();
  response.showCall = true;
  response.showResponse = true;
  request.getItemBodies(response, items);
  request.invoke();
  yield false;

  let properties = item.properties;

  // make sure that the Body property exists
  //dump('Body: ' + item.body + '\n');
  Assert.ok(0 != (item.processingFlags & Ci.msqIEwsNativeItem.HasBody));
  Assert.ok(item.body.length > 0);
  if (item.flags & Ci.msqIEwsNativeItem.BodyIsHtml)
    dump('Body is HTML\n');
  else
    dump('Body is plain text\n');

  items.clear();
  item = null;
  Cu.forceGC();

}

// repeat the test using the mailbox/machine calls
function* testGetItemBodiesMailbox() {
  gNativeMailbox.allIds(gTestNativeFolder.folderId, gEwsEventListener);
  yield false;

  let itemIds = gCompletionData.QueryInterface(Ci.msqIStringArray).wrappedJSObject;
  let itemId = itemIds.getAt(0);
  let item = gTestNativeFolder.getItem(itemId);

  // null the item body
  item.body = "";
  item.processingFlags &= ~Ci.msqIEwsNativeItem.HasBody;
  gShowRequestXml = true;
  gNativeMailbox.getItemBody(item, gEwsEventListener);
  gShowRequestXml = false;
  yield false;

  Assert.ok(item.body.length > 0);
  Assert.ok( (item.flags & Ci.msqIEwsNativeItem.HasOfflineBody) != 0);

  // try again, this time it should use the persisted store
  item.body = "";
  item.processingFlags &= ~Ci.msqIEwsNativeItem.HasBody;
  gNativeMailbox.getItemBody(item, gEwsEventListener);
  // todo - add a test that confirms that persisted store was used
  yield false;

  Assert.ok(item.body.length > 0);
  item = null;
  Cu.forceGC();

}  

function run_test()
{
  async_run_tests(tests);
}
