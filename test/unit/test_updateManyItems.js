/* ***** BEGIN LICENSE BLOCK *****
 * ***** END LICENSE BLOCK ***** */
 
 // This tests updateManyItems native machine
 
load('soapRequestUtils.js');

var tests = [
  taskSetupServer,
  taskSetupTestFolder,
  taskCreateItemWithAttachment,
  taskCreateItemWithAttachment,
  taskUpdateManyItems,
]

function* taskUpdateManyItems() {

  let listener = machineListener();
  gNativeMailbox.allIds(gTest1NativeFolder.folderId, listener);
  var result = yield listener.promise;
  let itemIds = result.data.QueryInterface(Ci.msqIStringArray).wrappedJSObject;

  let items = Cc["@mozilla.org/array;1"].createInstance(Ci.nsIMutableArray);
  for (let i = 0; i < 4; i++)
  {
    let item;
    if (i >= itemIds.length)
    {
      // We'll use a temporary ID
      let uuid = Cc["@mozilla.org/uuid-generator;1"].getService(Ci.nsIUUIDGenerator)
                                                    .generateUUID().toString();
      item = gNativeMailbox.createItem(uuid, "IPM.Note", gTest1NativeFolder);
      item.raiseFlags(Ci.msqIEwsNativeItem.HasTempId);
      item.properties = oPL(testFolderMessage);
      item.properties.setBoolean("IsRead", true);
 
      let attachment = item.addAttachment("");
      let file = do_get_file('data/attachment.txt');
      attachment.fileURL = getFileURL(file);
      attachment.name = file.leafName;
      attachment.contentType = "text/plain";
    }
    else
    {
      item = gTest1NativeFolder.getItem(itemIds.getAt(i));
      Assert.ok(!item.properties.getBoolean("IsRead"));
      let newProperties = item.properties.clone(null);
      newProperties.setBoolean("IsRead", true);
      item.mergeChanges(newProperties);
    }
    items.appendElement(item, false);
    dl("showPL for item in updateManyItems");
    showPL(item.properties);
  }

  listener = machineListener();
  gNativeMailbox.updateManyItems(items, listener);
  result = yield listener.promise;

  listener = machineListener();
  gNativeMailbox.getNewItems(gTest1NativeFolder, listener);
  result = yield listener.promise;

  for (let i = 0; i < 4; i++)
  {
    let item = items.queryElementAt(i, Ci.msqIEwsNativeItem);
    Assert.ok(item.properties.getBoolean("IsRead"));
    Assert.ok(item.changeKey.length > 0);
  }
}  

function run_test()
{
  tests.forEach(x => add_task(x));
  run_next_test();
}
