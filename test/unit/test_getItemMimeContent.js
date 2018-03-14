/* ***** BEGIN LICENSE BLOCK *****
 * ***** END LICENSE BLOCK ***** */
 
 // This tests GetItemsMimeContent request
 
load('utilities.js');
load('soapRequestUtils.js');
Components.utils.import("resource://exquilla/Base64.jsm");
// Use the asian message
// No, that does not work, because the body comes in base64 encoded GB2312
//gTestFolderMessage = testFolderMessage2;
gTestFolderMessage = testFolderMessage;

var tests = [
  testBase64,
  taskSetupEwsServer,
  taskSetupTestFolder,
  taskCreateTestItem,
  taskGetItemsMimeContent,
  taskGetItemsMimeContentMailbox,
  taskShutdown
]

/*
  /// get mime content for items
  void getItemsMimeContent(in msqIEwsSoapResponse aResponse,
                           in nsIMutableArray aNativeItems); // array of msqIEwsNativeItem objects

*/

// demo of Base64 usage
function* testBase64() {
  let str = '金牌面试';
  let encoder = new TextEncoder();
  let byteArray = encoder.encode(str);
  let strEncoded = Base64.fromByteArray(byteArray);

  dump("strEncoded is " + strEncoded + "\n")
  let decodedByteArray = Base64.toByteArray(strEncoded);
  let decoder = new TextDecoder();
  let decodedStr = decoder.decode(decodedByteArray);
  Assert.equal(str, decodedStr);
}

function* taskGetItemsMimeContent() {

  let listener = machineListener();
  gNativeMailbox.allIds(gTestNativeFolder.folderId, listener);
  let result = yield listener.promise;

  let itemIds = result.data.QueryInterface(Ci.msqIStringArray).wrappedJSObject;
  let itemId = itemIds.getAt(0);
  let item = gTestNativeFolder.getItem(itemId);

  let request = createSoapRequest();
  request.mailbox = gNativeMailbox;
  let items = Cc["@mozilla.org/array;1"].createInstance(Ci.nsIMutableArray);
  items.appendElement(item, false);
  
  let response = responseListener();
  response.showCall = true;
  response.showResponse = true;
  request.getItemsMimeContent(response, items);
  request.invoke();
  yield response.promise;

  // make sure that the mimeContent exists
  dump('MimeCharacterSet:' + item.mimeCharacterSet + '\n');
  ewsLog.info('MimeContent:\n' + item.mimeContent + '\n');
  Assert.ok(item.mimeContent.length > 0);

  // the message has a body "金牌面试"
  // The normal message has a body TheBody

  // Details of int'l body
  for (let jj = 1; jj < 8; jj ++)
    dump("mimeContent[length - " + jj + "] codePoint is " + item.mimeContent.codePointAt(item.mimeContent.length - jj) + "\n");

  // Expected values
  let bodyPL = testFolderMessage2.Body;
  showPL(bodyPL);
  let intlBody = bodyPL.getAString("$value");
  for (let jj = 0; jj < intlBody.length; jj++)
    dump("Expected body codePoint is " + intlBody.codePointAt(jj) + "\n");

  //Assert.ok(item.mimeContent.indexOf("金牌面试") > 0);
  Assert.ok(item.mimeContent.indexOf("TheBody") > 0);

  items.clear();
  item = null;
  Cu.forceGC();
}

// repeat the test using the mailbox/machine calls
function* taskGetItemsMimeContentMailbox() {
  let listener = machineListener();
  gNativeMailbox.allIds(gTestNativeFolder.folderId, listener);
  let result = yield listener.promise;

  let itemIds = result.data.QueryInterface(Ci.msqIStringArray).wrappedJSObject;
  let itemId = itemIds.getAt(0);
  let item = gTestNativeFolder.getItem(itemId);

  // null the item mimeContent
  item.mimeContent = "";
  item.mimeCharacterSet = "";
  listener = machineListener();
  gNativeMailbox.getItemMimeContent(item, listener);
  yield listener.promise;

  dump("item.mimeCharacterSet: " + item.mimeCharacterSet + "\n");
  dump("item.mimeContent\n" + item.mimeContent + "\n");
  Assert.ok(item.mimeContent.length > 0);
  Assert.ok(item.mimeCharacterSet.length > 0);
  // the message a a body "金牌面试"
  //Assert.ok(item.mimeContent.indexOf("金牌面试") > 0);
  Assert.ok(item.mimeContent.indexOf("TheBody") > 0);

  item = null;
}  

function run_test()
{
  tests.forEach(x => add_task(x));
  run_next_test();
}
