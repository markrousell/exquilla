/* ***** BEGIN LICENSE BLOCK *****
 * ***** END LICENSE BLOCK ***** */

Cu.import("resource://exquilla/ewsUtils.jsm");
// not sure why this spews uncaught errors
Utils.importLocally(this);
 
 var strAttributes = [
   'folderId',
   'distinguishedFolderId',
   'parentFolderId',
   'displayName',
   'folderClass',
   'searchParameters',
   'managedFolderInformation',
   'changeKey',
   'syncState',
   'folderURI',
 ];

XPCOMUtils.defineLazyModuleGetter(this, "EwsNativeFolder",
                                  "resource://exquilla/EwsNativeFolder.jsm");

function run_test()
{
  // create a native folder
  let folder = new EwsNativeFolder();
  Assert.ok(safeInstanceOf(folder, Ci.msqIEwsNativeFolder));
  //folder.folderId = '123';
  dump('run_test folderId is ' + folder.folderId + '\n');
  folder.folderId = 'setting from run_test';
  for (let attrib of strAttributes)
  {
    folder[attrib] = attrib + '-value';
    Assert.equal(folder[attrib], attrib + '-value')
  }
 
  // test of [itemClass, position, parameter]
  let typeTests = [
    ["IPM.Note", 3, "item:DisplayTo"],
    ["IPM.Appointment", 11, "calendar:UID"],
    ["IPM.random", 2, "item:DateTimeReceived"],
    ["IPM.Post", 16, "message:InternetMessageId"],
    ["IPM.Contact", 9, "contacts:CompanyName"],
    ["IPM.DistList", 7, "contacts:DisplayName"],
    ["IPM.OLE.CLASS.{00061055-0000-0000-C000-000000000046}", 12, "calendar:RecurrenceId"],
  ];

  for (let typeTest of typeTests) {
    let itemClass = typeTest[0];
    let position = typeTest[1];
    let value = typeTest[2];
    let names = folder.getItemPropertyNames(itemClass);
    dl("Item class is " + itemClass);
    Assert.ok((names = names.QueryInterface(Ci.msqIStringArray)));
    Assert.equal(names.getAt(position), value);
  }

  Assert.ok(folder.subfolderIds.QueryInterface(Ci.msqIStringArray));
  Assert.ok(folder.newItems instanceof Ci.nsIMutableArray);

  // boolean attributes
  folder.verifiedOnline = true;
  Assert.ok(folder.verifiedOnline);
  folder.syncItemsPending = true;
  Assert.ok(folder.syncItemsPending);

  // integer attributes
  folder.unreadCount = 7;
  Assert.equal(folder.unreadCount, 7);
  folder.totalCount = 10;
  Assert.equal(folder.totalCount, 10);
  folder.childFolderCount = 3;
  Assert.equal(folder.childFolderCount, 3);

}
