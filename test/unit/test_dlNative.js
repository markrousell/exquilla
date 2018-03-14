/* ***** BEGIN LICENSE BLOCK *****
 * ***** END LICENSE BLOCK ***** */
 
 // This tests distribution lists
 
 // Current I do not have the capability to add a distribution list programmatically, so this
 //  uses a manually created distribution list in the folder Contacts/hasDistList
 
load('soapRequestUtils.js');

var tests = [
  testSetupServer,
  testGetDL,
  testShutdown
]

function* testGetDL() {
  let nativeContacts = gNativeMailbox.getNativeFolder('contacts');

  let subfolderIds = nativeContacts.subfolderIds;
  let hasDlNativeFolder = null;
  for (let i = 0; i < subfolderIds.length; i++)
  {
    let folder = gNativeMailbox.getNativeFolder(subfolderIds.getAt(i));
    if (folder.displayName == "hasDistList")
    {
      hasDlNativeFolder = folder;
      break;
    }
  }
  Assert.ok(safeInstanceOf(hasDlNativeFolder, Ci.msqIEwsNativeFolder));

  gNativeMailbox.getNewItems(hasDlNativeFolder, gEwsEventListener);
  yield false;

  gNativeMailbox.allIds(hasDlNativeFolder.folderId, gEwsEventListener);
  yield false;

  let itemIds = gCompletionData.QueryInterface(Ci.msqIStringArray).wrappedJSObject;
  Assert.ok(itemIds.length > 0);

  let dlItem = null;
  for (let i = 0; i < itemIds.length; i++)
  {
    let item = gNativeMailbox.getItem(itemIds.getAt(i));
    if (item.itemClass == "IPM.DistList")
    {
      dlItem = item;
      break;
    }
  }
  Assert.ok(safeInstanceOf(dlItem, Ci.msqIEwsNativeItem));
  let dlExpansion = dlItem.dlExpansion;
  Assert.ok(safeInstanceOf(dlExpansion, Ci.msqIPropertyList));
  showPL(dlExpansion);

  // make sure the dlExpansion has at least one item
  let email = dlExpansion.getAString("Mailbox/EmailAddress");
  dl('found email ' + email);
  Assert.ok(email.length > 0);
}

function run_test()
{
  async_run_tests(tests);
}
