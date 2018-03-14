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
  taskCreateItemWithAttachment,
  taskCreateItemWithAttachment,
  taskGetMultipleItems,
]

function* taskGetMultipleItems() {

  // the mailbox connection limit is >1 except in Gecko24
  if (!!Ci.nsIAsyncStreamCopier2) // This interface was added in Gecko31
    Assert.ok(gNativeMailbox.connectionLimit > 1)
  else
    Assert.equal(gNativeMailbox.connectionLimit, 1);

  let listener = machineListener();
  gNativeMailbox.allIds(gTestNativeFolder.folderId, listener);
  var result = yield listener.promise;
  let itemIds = result.data.QueryInterface(Ci.msqIStringArray).wrappedJSObject;

  let promises = [];
  let item;
  for (let i = 0; i < 3; i++)
  {
    item = gTest1NativeFolder.getItem(itemIds.getAt(i));

    // null the item body
    item.body = "";
    item.processingFlags &= ~Ci.msqIEwsNativeItem.HasBody;
    item.flags &= ~Ci.msqIEwsNativeItem.HasOfflineBody;

    // and the attachment
    let attachment = item.getAttachmentByIndex(0);
    attachment.fileURL = "";

    listener = machineListener();
    gNativeMailbox.getItemOffline(item, listener);
    promises.push(listener.promise);
  }
  result = yield Promise.all(promises);

  Assert.ok( (item.flags & Ci.msqIEwsNativeItem.HasOfflineBody) != 0);
  Assert.ok(item.body.length > 0);
  Assert.ok(item.getAttachmentByIndex(0).fileURL.length > 0);
}  

function run_test()
{
  tests.forEach(x => add_task(x));
  run_next_test();
}
