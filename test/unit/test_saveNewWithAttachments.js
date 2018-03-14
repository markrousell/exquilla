/* ***** BEGIN LICENSE BLOCK *****
 * ***** END LICENSE BLOCK ***** */
 
 // This tests GetItemBodies request
dump("Setting log level\n");
Services.prefs.setCharPref("extensions.exquilla.log.level", "Debug");
load('soapRequestUtils.js');

var tests = [
  taskSetupServer,
  taskSetupTestFolder,
  taskCreateItem1,
  taskGetAttachment,
  taskShutdown,
]

function* taskCreateItem1() {

  // use mailbox commands to add a message to the test folder
  let itemToSend = gNativeMailbox.createItem(null, "IPM.Note", gTest1NativeFolder);
  itemToSend.properties = oPL(testFolderMessage);

  let attachment = itemToSend.addAttachment("");
  /* compose does this
    let nativeAttachment = this._item.addAttachment("");
    nativeAttachment.fileURL = attachment.url;
    nativeAttachment.name = attachment.name;
    nativeAttachment.contentType = attachment.contentType;
    request.createAttachment(response, nativeAttachment);
  */
  let file = do_get_file('data/pdfFragment.bin');
  attachment.fileURL = getFileURL(file);
  attachment.name = file.leafName;
  attachment.contentType = "application/octet-stream";
  let attachments = Cc["@mozilla.org/array;1"].createInstance(Ci.nsIMutableArray);
  attachments.appendElement(attachment, false);

  let attachment2 = itemToSend.addAttachment("");
  let file2 = do_get_file('data/ascii.bin');
  attachment2.fileURL = getFileURL(file2);
  attachment2.name = file2.leafName;
  attachment2.contentType = "application/octet-stream";
  attachments.appendElement(attachment2, false);

  dl('new item properties: ' + stringPL(itemToSend.properties));
  let listener = machineListener();
  gNativeMailbox.saveNewItem(itemToSend, listener);
  yield listener.promise;

  dl('created item id is ' + itemToSend.itemId);
  // update folder
  listener = machineListener();
  gNativeMailbox.getNewItems(gTestNativeFolder, listener);
  yield listener.promise;
}

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
  dl('received item properties: ' + stringPL(properties));
  Assert.ok(properties.getBoolean("HasAttachments"));
  let attachments = properties.getPropertyList("Attachments");
  Assert.ok(safeInstanceOf(attachments, Ci.msqIPropertyList));
  Assert.equal(attachments.length, 2);

  for (let index = 0; index < attachments.length; index++) {
    let attachmentPL = attachments.getPropertyListAt(index);
    Assert.ok(safeInstanceOf(attachmentPL, Ci.msqIPropertyList));
    dl('attachment name is ' + attachmentPL.getAString("Name"));
    let id = attachmentPL.getAString("AttachmentId/$attributes/Id");
    let name = attachmentPL.getAString("Name");
    Assert.equal(name, (index == 0) ? "pdfFragment.bin" : "ascii.bin");
    Assert.ok(id.length > 0);
    let contentType = attachmentPL.getAString("ContentType");
    dl('contentType is ' + contentType);
    Assert.equal(contentType, "application/octet-stream");
    
    let nativeAttachment = nativeItem.getAttachmentById(id);
    Assert.ok(safeInstanceOf(nativeAttachment, Ci.msqIEwsNativeAttachment));

    // do a manual call to getAttachment
    nativeAttachment.fileURL = "";
    listener = machineListener();
    gNativeMailbox.getAttachmentContent(nativeAttachment, listener);
    result = yield listener.promise;
    var attachmentJS = result.data.QueryInterface(Ci.msqIEwsNativeAttachment).wrappedJSObject;
    dl("fileURL is " + attachmentJS.fileURL);
    Assert.ok(attachmentJS.fileURL.length > 0);

    // make sure that the file exists and has content
    dl('attachment fileURL is ' + nativeAttachment.fileURL);
    Assert.ok(nativeAttachment.fileURL.length > 0);
    Assert.ok(nativeAttachment.downloaded);

  }
}

function run_test()
{
  tests.forEach(x => add_task(x));
  run_next_test();
}
