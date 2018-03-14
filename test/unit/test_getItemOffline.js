/* ***** BEGIN LICENSE BLOCK *****
 * ***** END LICENSE BLOCK ***** */
 
 // This tests GetItemBodies request
 
var gCompletionData;
var gCompletionResult;
load('soapRequestUtils.js');

var tests = [
  taskSetupServer,
  taskSetupTestFolder,
  taskCreateItemWithAttachment,
  taskGetItemOffline,
]

function* taskGetItemOffline() {
  let listener = machineListener();
  gNativeMailbox.allIds(gTestNativeFolder.folderId, listener);
  var result = yield listener.promise;

  let itemIds = result.data.QueryInterface(Ci.msqIStringArray).wrappedJSObject;
  let item = gTest1NativeFolder.getItem(itemIds.getAt(0));

  // null the item body
  item.body = "";
  item.processingFlags &= ~Ci.msqIEwsNativeItem.HasBody;
  item.flags &= ~Ci.msqIEwsNativeItem.HasOfflineBody;

  // and the attachment
  let attachment = item.getAttachmentByIndex(0);
  attachment.fileURL = "";

  listener = machineListener();
  gNativeMailbox.getItemOffline(item, listener);
  result = yield listener.promise;

  Assert.ok( (item.flags & Ci.msqIEwsNativeItem.HasOfflineBody) != 0);
  Assert.ok(item.body.length > 0);
  Assert.ok(item.getAttachmentByIndex(0).fileURL.length > 0);
}  

function run_test()
{
  tests.forEach(x => add_task(x));
  run_next_test();
}
