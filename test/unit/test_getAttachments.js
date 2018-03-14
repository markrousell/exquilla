/* ***** BEGIN LICENSE BLOCK *****
 * ***** END LICENSE BLOCK ***** */
 
 // This tests GetItemBodies request
 
load('soapRequestUtils.js');

var tests = [
  taskSetupServer,
  taskSetupTestFolder,
  taskCreateItemWithAttachment,
  taskGetAttachment,
  taskShutdown,
]

function* taskGetAttachment() {

  var listener = machineListener();
  gNativeMailbox.allIds(gTestNativeFolder.folderId, listener);
  var result = yield listener.promise;

  let itemIds = result.data.QueryInterface(Ci.msqIStringArray).wrappedJSObject;
  dl('folder has ' + itemIds.length + ' items');

  Assert.ok(itemIds.length > 0);
  let itemId = itemIds.getAt(0);
  Assert.ok(itemId.length > 0);
  let nativeItem = gNativeMailbox.getItem(itemId);
  Assert.ok(safeInstanceOf(nativeItem, Ci.msqIEwsNativeItem));

  // check some properties from the sync call
  let properties = nativeItem.properties;
  Assert.ok(properties.getBoolean("HasAttachments"));
  let attachments = properties.getPropertyList("Attachments");
  Assert.ok(safeInstanceOf(attachments, Ci.msqIPropertyList));

  let attachmentPL = attachments.getPropertyListAt(0);
  Assert.ok(safeInstanceOf(attachmentPL, Ci.msqIPropertyList));
  dl('first attachment name is ' + attachmentPL.getAString("Name"));
  let id = attachmentPL.getAString("AttachmentId/$attributes/Id");
  let name = attachmentPL.getAString("Name");
  Assert.ok(id.length > 0);
  let contentType = attachmentPL.getAString("ContentType");
  dl('contentType is ' + contentType);
  Assert.ok(contentType.length > 0);
  let nativeAttachment = nativeItem.getAttachmentById(id);
  Assert.ok(safeInstanceOf(nativeAttachment, Ci.msqIEwsNativeAttachment));
  
  // do a manual call to getAttachment
  /**/
  let request = createSoapRequest();
  request.mailbox = gNativeMailbox;

  let response = responseListener();
  request.getAttachment(response, nativeAttachment);
  request.invoke();
  var result = yield response.promise;

  // make sure that the file exists and has content
  dl('attachment fileURL is ' + nativeAttachment.fileURL);
  Assert.ok(nativeAttachment.fileURL.length > 0);
  Assert.ok(nativeAttachment.downloaded);
  /**/

  // repeat using the mailbox call
  nativeAttachment.fileURL = "";
  listener = machineListener();
  gNativeMailbox.getAttachmentContent(nativeAttachment, listener);
  result = yield listener.promise;
  attachment = result.data.QueryInterface(Ci.msqIEwsNativeAttachment).wrappedJSObject;
  Assert.ok(attachment.fileURL.length > 0);

  // see if the fileURL was persisted
  let savedId = nativeItem.itemId;
  let savedURL = nativeAttachment.fileURL;
  nativeAttachment = null;
  gNativeMailbox.removeItemFromCache(savedId);
  nativeItem = null;
  nativeItem = gNativeMailbox.getItem(savedId);
  Assert.equal(savedURL, nativeItem.getAttachmentByIndex(0).fileURL);

}

function run_test()
{
  tests.forEach(x => add_task(x));
  run_next_test();
}
