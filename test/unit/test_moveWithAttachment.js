/* ***** BEGIN LICENSE BLOCK *****
 * ***** END LICENSE BLOCK ***** */
 
 // This tests MoveItems with attachments
 
load('soapRequestUtils.js');
load('utilities.js');

var tests = [
  testSetupEwsServer,
  testSetupTestFolder,
  testCreateItemWithAttachment,
  testCreateItemWithAttachment,
  testCopyItems,
  testShutdown,
]

function* testCopyItems() {

  dl('yield after getNewItems');
  gNativeMailbox.allIds(gTestNativeFolder.folderId, gEwsEventListener);
  yield false;

  let srcItemIds = gCompletionData.QueryInterface(Ci.msqIStringArray).wrappedJSObject;
  let itemId1 = srcItemIds.getAt(0);
  let itemId2 = srcItemIds.getAt(1);
  dl('itemId1 is ' + itemId1);
  Assert.ok(itemId1.length > 0);
  Assert.ok(itemId2.length > 0);

  // We should have gotten all of the subfolders
  let subFolders = gTestNativeFolder.subfolderIds;
  dl('number of subfolders is ' + subFolders.length);

  Assert.ok(safeInstanceOf(gTest2NativeFolder, Ci.msqIEwsNativeFolder));

  let itemIds = new StringArray();
  itemIds.append(itemId1);
  itemIds.append(itemId2);

  // do a mailbox call to copyItem
  gNativeMailbox.copyItems(gTest2NativeFolder, itemIds, true, gEwsEventListener);
  yield false;
  dl('after copyItems');

  // update the folder to get counts
  gNativeMailbox.getNewItems(gTest2NativeFolder, gEwsEventListener);
  yield false;

  // update the folder to get counts
  gNativeMailbox.getNewItems(gTestNativeFolder, gEwsEventListener);
  yield false;

  Assert.equal(gTest2NativeFolder.totalCount, 2);
  Assert.equal(gTestNativeFolder.totalCount, 0);

  //gNativeMailbox.persistNewItems(gTest2NativeFolder, gEwsEventListener);
  //yield false;

  gNativeMailbox.allIds(gTest2NativeFolder.folderId, gEwsEventListener);
  yield false;

  srcItemIds = gCompletionData.QueryInterface(Ci.msqIStringArray).wrappedJSObject;
  let newItemId1 = srcItemIds.getAt(0);
  let newItemId2 = srcItemIds.getAt(1);
  dl('newItemId1: ' + newItemId1);
  dl('newItemId2: ' + newItemId2);

  // get the item attachments
  let movedItem = gNativeMailbox.getItem(newItemId1);
  let attachment = movedItem.getAttachmentByIndex(0);
  dl("attachment is " + attachment);
  Assert.ok(safeInstanceOf(attachment, Ci.msqIEwsNativeAttachment));
  gNativeMailbox.getAttachmentContent(attachment, gEwsEventListener);
  yield false;

  dl("attachment fileURL is " + attachment.fileURL);
  let content = fileUrlText(attachment.fileURL);
  Assert.equal(content, "This is a short test\nof attachments.\n");
}

function run_test()
{
  async_run_tests(tests);
}
