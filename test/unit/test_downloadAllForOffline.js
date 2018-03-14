/* ***** BEGIN LICENSE BLOCK *****
 * ***** END LICENSE BLOCK ***** */
 
// This tests downloadAllForOffline
 
load('soapRequestUtils.js');
load('utilities.js');

var tests = [
  taskSetupEwsServer,
  taskSetupTestFolder,
  taskCreateTestItem,
  taskCreateItemWithAttachmentNoGet,
  testUpdateSkinkFolders,
  testDownloadAll,
  taskShutdown,
]

function* taskCreateItemWithAttachmentNoGet() {

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
  let file = do_get_file('data/attachment.txt');
  attachment.fileURL = getFileURL(file);
  attachment.name = file.leafName;
  attachment.contentType = "text/plain";
  let attachments = Cc["@mozilla.org/array;1"].createInstance(Ci.nsIMutableArray);
  attachments.appendElement(attachment, false);

  dl('new item properties: ' + stringPL(itemToSend.properties));
  let listener = machineListener();
  gNativeMailbox.saveNewItem(itemToSend, listener);
  yield listener.promise;

  dl('created item id is ' + itemToSend.itemId);
}

// update skink versions of ews folders
function* testUpdateSkinkFolders() {
  // We don't want the folder offline so we can get it later.
  gTest1EwsMailFolder.clearFlag(Ci.nsMsgFolderFlags.Offline);

  let listener = new PromiseUtils.UrlListener();
  gTest1ExqMailFolder.updateFolderWithListener(null, listener);
  let result = yield listener.promise;
  Assert.equal(result, Cr.NS_OK);
}

function* testDownloadAll() {
  let listener = new PromiseUtils.UrlListener();

  // force download
  let database = gTest1EwsMailFolder.msgDatabase;
  let enumer = database.EnumerateMessages();
  let count = 0;
  while (enumer.hasMoreElements()) {
    let msg = enumer.getNext().QueryInterface(Ci.nsIMsgDBHdr);
    count++;
    if (count == 1)
      msg.AndFlags(~Ci.nsMsgMessageFlags.Offline);
    if (count == 2) {
      // reset the attachment status
      let itemId = msg.getProperty("ewsItemId");
      let nativeItem = gNativeMailbox.getItem(itemId);
      let attachment = nativeItem.getAttachmentByIndex(0);
      attachment.fileURL = "";
    }
  }

  gTest1EwsMailFolder.downloadAllForOffline(listener, null);
  let result = yield listener.promise;
  Assert.equal(result, Cr.NS_OK);
}

function run_test()
{
  tests.forEach(x => add_task(x));
  run_next_test();
}
