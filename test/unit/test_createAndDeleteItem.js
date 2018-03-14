/* ***** BEGIN LICENSE BLOCK *****
 * ***** END LICENSE BLOCK ***** */

 // This tests sending a new message with createItem

load('soapRequestUtils.js');

var tests = [
  taskSetupEwsServer,
  taskSetupTestFolder,
  taskCreateMessageItem,
  taskCreateAttachment,
  taskDeleteItem,
  taskShutdown
];

var testMessage = oPL(
                    { ItemClass: "IPM.Note",
                      Subject:   "This is a test message",
                      Body: oPL(
                                 {$value: 'TheBody',
                                  $attributes: oPL({BodyType: 'Text'})
                                 }),
                      ToRecipients: oPL(
                      {
                        Mailbox: oPL(
                        { EmailAddress: "kenttest@caspia.com"
                        })
                      })
                    });


let itemToSend;
function* taskCreateMessageItem() {
  // setup logging
  let dirService = Cc["@mozilla.org/file/directory_service;1"].
                     getService(Ci.nsIProperties);
  let logFile = dirService.get("ProfD", Ci.nsIFile);
  dl('logFile is ' + logFile);
  logFile.append("soapLog.log");
  dl('logFile is ' + logFile.path);
  gNativeMailbox.soapLogFile = logFile;
  // create an item
  itemToSend = gNativeMailbox.createItem(null, "IPM.Note", gTest1NativeFolder);
  itemToSend.properties = testMessage;

  /*
  let request = createSoapRequest(gNativeMailbox);

  let response = new EwsSoapResponse();
  response.showCall = true;
  response.showResponse = true;
  request.createItem(response, itemToSend, "SaveOnly");
  request.invoke();
  yield false;
  */
  let saveResponse = yield PromiseUtils.promiseSoapCall(gNativeMailbox, null, "createItem", itemToSend, "SaveOnly");
  Assert.equal(saveResponse.status, Cr.NS_OK);

  dl('created item id is ' + itemToSend.itemId);
  // update folder
  /*
  let getNewListener = new PromiseUtils.MachineListener();
  gNativeMailbox.getNewItems(gTest1NativeFolder, getNewListener);
  let getNewResponse = yield getNewListener.promise;
  */
  let getNewResponse = yield PromiseUtils.promiseMachineCall(gNativeMailbox, null, "getNewItems", gTest1NativeFolder);
  Assert.equal(getNewResponse.status, Cr.NS_OK);

  dl('yield after getNewItems');
  Assert.equal(gTest1NativeFolder.totalCount, 1);
  let allIdsListener = new PromiseUtils.MachineListener();
  gNativeMailbox.allIds(gTest1NativeFolder.folderId, allIdsListener);
  let allIdsResult = yield allIdsListener.promise;
  Assert.equal(allIdsResult.status, Cr.NS_OK);

  let itemIds = allIdsResult.data.QueryInterface(Ci.msqIStringArray).wrappedJSObject;
  dl('found ' + itemIds.length + ' items');
  // something isn't right - see bug 498
  //Assert.equal(itemIds.length, 1);
  Assert.ok(itemIds.indexOf(itemToSend.itemId) != -1);
  for (let i = 0; i < itemIds.length; i++)
    dl('itemId for # ' + i + ' is ' + itemIds.getAt(i));
  Assert.ok(!itemToSend.deletedOnServer);
}

function* taskDeleteItem()
{
  // now delete the item
  let itemIds = new StringArray();
  itemIds.append(itemToSend.itemId);
  dl('itemIds.append(itemToSend.itemId);');
  itemToSend.localProperties;

  /*
  let request = createSoapRequest(gNativeMailbox);
  let response = new EwsSoapResponse();
  response.showCall = true;
  response.showResponse = true;
  request.deleteItems(response, itemIds, false);
  request.invoke();
  */
  let deleteListener = new PromiseUtils.MachineListener();
  gNativeMailbox.deleteItems(itemIds, false, deleteListener);
  let deleteResult = yield deleteListener.promise;
  Assert.equal(deleteResult.status, Cr.NS_OK);

  // now prove it was deleted
  let getNewListener = new PromiseUtils.MachineListener();
  gNativeMailbox.getNewItems(gTest1NativeFolder, getNewListener);
  let getNewResult = yield getNewListener.promise;
  Assert.equal(getNewResult.status, Cr.NS_OK);

  Assert.equal(gTest1NativeFolder.totalCount, 0);

  // I purposely am leaving this in as a test of multiple database closing
  let closeListener = new PromiseUtils.EwsEventListener("DatastoreClose");
  gNativeMailbox.datastore.asyncClose(closeListener);
  let closeResult = yield closeListener.promise;
  Assert.equal(closeResult.status, Cr.NS_OK);
  return;
}

function* taskCreateAttachment()
{
  let nativeAttachment = itemToSend.addAttachment("");
  let file = do_get_file('data/attachment.txt');
  nativeAttachment.fileURL = getFileURL(file);
  nativeAttachment.name = "thefile.txt";
  nativeAttachment.contentType = "text/plain";
  /*
  let request = createSoapRequest(gNativeMailbox);
  let response = new EwsSoapResponse();
  response.showCall = true;
  response.showResponse = true;
/*
  void createAttachment(in msqIEwsSoapResponse aResponse,
                        in msqIEwsNativeAttachment aAttachment);
*/
/*
  request.createAttachment(response, nativeAttachment);
  request.invoke();
  yield false;
*/
  let createAttachmentResponse = yield PromiseUtils.promiseSoapCall(gNativeMailbox, null, "createAttachment", nativeAttachment);
  Assert.equal(createAttachmentResponse.status, Cr.NS_OK);

  //gNativeMailbox.getNewItems(gTest1NativeFolder, gEwsEventListener);
  //yield false;
  let getNewResponse = yield PromiseUtils.promiseMachineCall(gNativeMailbox, null, "getNewItems", gTest1NativeFolder);
  Assert.equal(getNewResponse.status, Cr.NS_OK);

  // check some properties from the sync call
  let properties = itemToSend.properties;
  Assert.ok(properties.getBoolean("HasAttachments"));
  let attachments = properties.getPropertyList("Attachments");
  Assert.ok(safeInstanceOf(attachments, Ci.msqIPropertyList));
  Assert.equal(itemToSend.attachmentCount, 1);

  // get the attachment content
  //gNativeMailbox.getAttachmentContent(nativeAttachment, gEwsEventListener);
  //yield false;
  let attachmentContentResponse = yield PromiseUtils.promiseMachineCall(gNativeMailbox, null, "getAttachmentContent", nativeAttachment);
  Assert.equal(attachmentContentResponse.status, Cr.NS_OK);

  dl('file URL is ' + nativeAttachment.fileURL);
  itemToSend.localProperties;

}

function run_test()
{
  tests.forEach(x => add_task(x));
  run_next_test();
}

