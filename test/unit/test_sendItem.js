/* ***** BEGIN LICENSE BLOCK *****
 * ***** END LICENSE BLOCK ***** */

 // This tests sending a new messagewith createItem

load('soapRequestUtils.js');

var tests = [
  taskSetupServer,
  taskSendMessageItem,
  taskSendSaveMessageItem,
  taskShutdown
];

var gInboxNativeFolder;

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
                        { EmailAddress: account.emailaddress,
                        })
                      })
                    });

function* taskSendMessageItem() {

  // we need to test online, because we are using a combo of mailbox and
  //  response messages, and we do not go through normal startup
  //gNativeMailbox.checkOnline(gEwsEventListener);
  //yield false;

  // create an item
  // We'll use a temporary ID
  /**/
  let uuid = Cc["@mozilla.org/uuid-generator;1"].getService(Ci.nsIUUIDGenerator)
              .generateUUID().toString();
  let itemToSend = gNativeMailbox.createItem(uuid, "IPM.Note",
                     gNativeMailbox.getNativeFolder("outbox"));
  itemToSend.properties = testMessage;
  itemToSend.properties.setAString("Subject", uuid);

  yield PromiseUtils.promiseSoapCall(gNativeMailbox, null, "createItem", itemToSend, "SaveOnly");

  // now send the message
  yield PromiseUtils.promiseSoapCall(gNativeMailbox, null, "sendItem", itemToSend, false, "");

  // scan through the inbox messages, looking for newly sent message. Message can be slow to arrive,
  // so retry until we find it.
  let foundIt = false;
  let sentItem = null;
  for (let trial = 1; !foundIt && trial <= 10; trial++)
  {
    let listener1 = machineListener();
    gNativeMailbox.getNewItems(gNativeInbox, listener1);
    yield listener1.promise;

    let listener2 = machineListener();
    gNativeMailbox.allIds(gNativeInbox.folderId, listener2);
    let result = yield listener2.promise;

    let itemIds = result.data.QueryInterface(Ci.msqIStringArray).wrappedJSObject;
    dl("Looking for subject: " + uuid);
    for (let i = 0; i < itemIds.length; i++) {
      let nativeItem = gNativeInbox.getItem(itemIds.getAt(i));
      let subject = nativeItem.properties.getAString("Subject");
      dl("Item has subject: " + subject);
      if (subject == uuid) {
        foundIt = true;
        sentItem = nativeItem;
        dl("Subject match found on trial# " + trial);
        break;
      }
    }
  }
  Assert.ok(foundIt);

  // Delete the sent item.
  let deleteIds = new StringArray();
  deleteIds.append(sentItem.itemId);
  let deleteListener = machineListener();
  gNativeMailbox.deleteItems(deleteIds, false, deleteListener);
  yield deleteListener.promise;
}

function* taskSendSaveMessageItem() {
  // We save an item, specifying the Sent Items folder to save it

  // create an item
  // We'll use a temporary ID
  /**/
  let uuid = Cc["@mozilla.org/uuid-generator;1"].getService(Ci.nsIUUIDGenerator)
              .generateUUID().toString();
  let itemToSend = gNativeMailbox.createItem(uuid, "IPM.Note",
                     gNativeMailbox.getNativeFolder("outbox"));
  itemToSend.properties = testMessage;
  itemToSend.properties.setAString("Subject", uuid);

  yield PromiseUtils.promiseSoapCall(gNativeMailbox, null, "createItem", itemToSend, "SaveOnly");

  let sentItemsFolder = gNativeMailbox.getNativeFolder("sentitems");

  // now send and save the message
  yield PromiseUtils.promiseSoapCall(gNativeMailbox, null, "sendItem", itemToSend, true, sentItemsFolder.folderId);

  // scan through the inbox messages, looking for newly sent message. Message can be slow to arrive,
  // so retry until we find it.
  let foundIt = false;
  let sentItem = null;
  for (let trial = 1; !foundIt && trial <= 10; trial++)
  {
    let listener1 = machineListener();
    gNativeMailbox.getNewItems(gNativeInbox, listener1);
    yield listener1.promise;

    let listener2 = machineListener();
    gNativeMailbox.allIds(gNativeInbox.folderId, listener2);
    let result = yield listener2.promise;

    let itemIds = result.data.QueryInterface(Ci.msqIStringArray).wrappedJSObject;
    dl("Looking for subject: " + uuid);
    for (let i = 0; i < itemIds.length; i++) {
      let nativeItem = gNativeInbox.getItem(itemIds.getAt(i));
      let subject = nativeItem.properties.getAString("Subject");
      dl("Item has subject: " + subject);
      if (subject == uuid) {
        foundIt = true;
        sentItem = nativeItem;
        dl("Subject match found on trial# " + trial);
        break;
      }
    }
  }
  Assert.ok(foundIt);

  // Find the message in sentItems
  foundIt = false;
  let savedItem = null;
  {
    let listener1 = machineListener();
    gNativeMailbox.getNewItems(sentItemsFolder, listener1);
    yield listener1.promise;

    let listener2 = machineListener();
    gNativeMailbox.allIds(sentItemsFolder.folderId, listener2);
    let result = yield listener2.promise;

    let itemIds = result.data.QueryInterface(Ci.msqIStringArray).wrappedJSObject;
    dl("Looking for subject: " + uuid);
    for (let i = 0; i < itemIds.length; i++) {
      let nativeItem = sentItemsFolder.getItem(itemIds.getAt(i));
      let subject = nativeItem.properties.getAString("Subject");
      dl("Item has subject: " + subject);
      if (subject == uuid) {
        foundIt = true;
        savedItem = nativeItem;
        break;
      }
    }
  }
  Assert.ok(foundIt);

  // delete the saved and sent items
  let deleteIds = new StringArray();
  deleteIds.append(sentItem.itemId);
  deleteIds.append(savedItem.itemId);
  let deleteListener = machineListener();
  gNativeMailbox.deleteItems(deleteIds, false, deleteListener);
  yield deleteListener.promise;

}
function run_test()
{
  tests.forEach(x => add_task(x));
  run_next_test();
}
