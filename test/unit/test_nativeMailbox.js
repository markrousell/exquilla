/* ***** BEGIN LICENSE BLOCK *****
 * ***** END LICENSE BLOCK ***** */

// Tests aspects of the native mailbox that do not require
// a server connection.

XPCOMUtils.defineLazyModuleGetter(this, "PromiseUtils",
                                  "resource://exquilla/PromiseUtils.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "EwsNativeItem",
                                  "resource://exquilla/EwsNativeItem.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "EwsNativeService",
                                  "resource://exquilla/EwsNativeService.jsm");
Cu.import("resource://exquilla/ewsUtils.jsm");
// not sure why this spews uncaught errors
Utils.importLocally(this);

var tests = [syncPhase, asyncPhase, shutdown];
function run_test()
{
  tests.forEach(x => add_task(x));
  run_next_test();
}

var mailbox;
const kFolderId = "012345678901234567890123456789";

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

function syncPhase()
{

  // create a native mailbox
  mailbox = (new EwsNativeService()).getNativeMailbox("dummyURI");

  Assert.ok(mailbox instanceof Ci.msqIEwsNativeMailbox);

  Assert.equal(mailbox.getNativeFolderFromCache("msgfolderroot"), null);
  // create a folder for the root
  let folder = mailbox.getNativeFolder("msgfolderroot");
  Assert.equal(folder.distinguishedFolderId, "msgfolderroot");
  Assert.ok(folder === mailbox.getNativeFolderFromCache("msgfolderroot"));

  // set the folder id
  mailbox.setNativeFolderId(folder, kFolderId);

  // get this from the cache
  let folder2 = mailbox.getNativeFolder(kFolderId);

  // this should be the same folder
  Assert.equal(folder2.distinguishedFolderId, "msgfolderroot");
  Assert.equal(folder.folderId, kFolderId);
  Assert.ok(folder2 === folder);
  Assert.equal(folder2, folder);

  // recache
  let folder3 = mailbox.getNativeFolder(kFolderId + "_1");
  folder3.distinguishedFolderId = "msgfolderroot";
  Assert.ok(folder3 !== folder2);

  Assert.equal(mailbox.messageNamespace, "http://schemas.microsoft.com/exchange/services/2006/messages");
  Assert.equal(mailbox.typeNamespace, "http://schemas.microsoft.com/exchange/services/2006/types");

  // initialion tests
  let initTests = [
    ["needFolderDiscovery", true],
    ["isOnline", false],
    ["needOnlineCheck", true],
    ["didAutodiscover", false],
    ["connectionLimit", 1],
  ];
  initTests.forEach(test => {
    Assert.equal(mailbox[test[0]], test[1]);
  });

  // simple attribute tests
  let stringAttributes = [
    "ewsURL",
    "username",
    "domain",
    "email",
    "testType",
    "rootFolderId",
  ];
  stringAttributes.forEach( (attribute, index, array) => {
    mailbox[attribute] = "the" + attribute;
    Assert.equal(mailbox[attribute], "the" + attribute);
  });

  let boolAttributes = [
    "needFolderDiscovery",
    "needOnlineCheck",
    "didAutodiscover",
    "isOnline",
  ];
  boolAttributes.forEach( attribute => {
    mailbox[attribute] = true;
    Assert.ok(mailbox[attribute]);
    mailbox[attribute] = false;
    Assert.ok(!mailbox[attribute]);
  });

  mailbox.connectionLimit = 3;
  Assert.equal(mailbox.connectionLimit, 3);

  mailbox.serverURI = "exquilla://example.org/EWS";
  Assert.equal(mailbox.serverURI, "exquilla://example.org/EWS");

  mailbox.password = "dummy";
  Assert.equal(mailbox.password, "dummy");

  // try retrieving the password from the login manager
  let hostname = "https://example.org";
  let loginInfo = Cc["@mozilla.org/login-manager/loginInfo;1"]
                    .createInstance(Ci.nsILoginInfo);
  loginInfo.init(hostname, null, hostname, "thedomain\\theusername", "newpass", "", "");
  Services.logins.addLogin(loginInfo);
  mailbox.password = "";
  Assert.equal(mailbox.password, "newpass");

  // copied from soapRequestUtils testSetupServer
  let dirService = Cc["@mozilla.org/file/directory_service;1"].
                     getService(Ci.nsIProperties);
  mailbox.datastoreDirectory = dirService.get("ProfD", Ci.nsIFile);

  // setup logging
  let logFile = dirService.get("ProfD", Ci.nsIFile);
  logFile.append("soapLog.log");
  mailbox.soapLogFile = logFile;

  mailbox.writeToSoapLog("This is text for the soap log");
  // todo: some sort of test of result!

  mailbox.removeFolderFromCache("msgfolderroot");
  Assert.equal(mailbox.getNativeFolderFromCache("msgfolderroot"), null);
  mailbox.ensureCached(folder3);
  Assert.equal(mailbox.getNativeFolderFromCache("msgfolderroot"), folder3);
  Assert.equal(mailbox.getDistinguishedNativeFolder("msgfolderroot"), folder3);

  // allFolderIds
  // To start, there is only one folder (msgfolderroot) in the cache
  let folderIds = new StringArray();

  mailbox.updateSubfolderIds();
  mailbox.allFolderIds(folder3.folderId, folderIds);
  Assert.equal(folderIds.length, 0);

  // Add a subfolder to root
  let folderL2 = mailbox.getNativeFolder(kFolderId + "_L2");
  folderL2.parentFolderId = folder3.folderId;
  mailbox.updateSubfolderIds();
  folderIds.clear();
  mailbox.allFolderIds(folder3.folderId, folderIds);
  Assert.equal(folderIds.length, 1);

  // add another level of subfolder, and a sibling folder
  let folderL3 = mailbox.getNativeFolder(kFolderId + "_L3");
  folderL3.parentFolderId = folderL2.folderId;
  let folderL2A = mailbox.getNativeFolder(kFolderId + "_L2A");
  folderL2A.parentFolderId = folder3.folderId;
  mailbox.updateSubfolderIds();
  folderIds.clear();
  mailbox.allFolderIds(folder3.folderId, folderIds);
  Assert.equal(folderIds.length, 3);

  // native item cache tests
  let dummyItemId = "01234567890123456789";
  let dummyItemId2 = "2_01234567890123456789";
  let item1 = mailbox.getItem(dummyItemId);
  Assert.ok(item1.QueryInterface(Ci.msqIEwsNativeItem));
  Assert.equal(item1.itemId, dummyItemId);

  Assert.ok(item1 == mailbox.getItemFromCache(dummyItemId));

  // change the item id.
  item1.itemId = dummyItemId2;
  mailbox.ensureItemCached(item1);
  Assert.ok(item1 === mailbox.getItemFromCache(dummyItemId2));
  Assert.ok(null === mailbox.getItemFromCache(dummyItemId));

  // no folder id set
  let entries = mailbox.allCachedIds(kFolderId);
  Assert.equal(entries.length, 0);
  item1.folderId = kFolderId;
  entries = mailbox.allCachedIds(kFolderId);
  Assert.equal(entries.length, 1);
  Assert.equal(entries.getAt(0), dummyItemId2);

  // server version
  Assert.equal(mailbox.serverVersion, "2007sp1");
  mailbox.loadSchema("2010");
  Assert.equal(mailbox.serverVersion, "2010");

  // create using createItem
  let item3 = mailbox.createItem("3_01234567890123456789", "IPM.Item", folder3);
  let cachedItem3 = mailbox.getItemFromCache("3_01234567890123456789");
  Assert.ok(item3 === cachedItem3);
  mailbox.changeItemId(item3, "NewID");
  let cachedNewItem = mailbox.getItemFromCache("NewID");
  Assert.ok(!!cachedNewItem);
  Assert.equal(item3.itemId, "NewID");

  mailbox.removeItem(item3);
  let cachedItem4 = mailbox.getItemFromCache("NewID");
  Assert.ok(!cachedItem4);

  // add two items to a folder, one with and one without NeedsProperties
  let item2a = mailbox.createItem("item2a", "IPM.Item", folderL2);
  let item2b = mailbox.createItem("item2b", "IPM.Item", folderL2);
  item2a.needsProperties = true;;
  item2b.needsProperties = false;;
  let needsPropertiesArray = mailbox.needsPropertiesIds(folderL2);
  Assert.equal(needsPropertiesArray.length, 1);
  Assert.equal(needsPropertiesArray.getAt(0), "item2a");
  mailbox.persistItem(item2a, null);
  mailbox.persistItem(item2b, null);

}

function* asyncPhase()
{
  // allIds in folder2 (there should be 2)
  let ml1 = new PromiseUtils.MachineListener();
  mailbox.allIds(kFolderId + "_L2", ml1);
  let allIdsObject = yield ml1.promise;
  let allIdsArray = allIdsObject.data.QueryInterface(Ci.msqIStringArray).wrappedJSObject;
  Assert.equal(allIdsArray.length, 2);

  // Case 1: async item create with minimal information
  let promiseOnDone = new PromiseUtils.EwsEventListener("OnDone");
  mailbox.getItemAsync("dummyItemId", promiseOnDone);
  let resultObject = yield promiseOnDone.promise;
  let item = resultObject.item.QueryInterface(Ci.msqIEwsNativeItem);
  Assert.equal(item.itemId, "dummyItemId");

  // Case 2: reading an item's properties from the database.
  // create an item and store its properties.
  let item2 = new EwsNativeItem();
  item2.mailbox = mailbox;
  item2.itemId = "item2Id";
  item2.itemClass = "IPM.Note";
  item2.folderId = kFolderId + "_L2";
  item2.properties = testMessage;
  mailbox.datastore.putItem(item2, null);

  // now get that item, uncached
  mailbox.removeItemFromCache(item2.itemId);
  let promiseOnDone2 = new PromiseUtils.EwsEventListener("OnDone");
  mailbox.getItemAsync("item2Id", promiseOnDone2);
  resultObject = yield promiseOnDone2.promise;
  let item2X = resultObject.item.QueryInterface(Ci.msqIEwsNativeItem);
  Assert.equal(item2X.itemId, "item2Id");
  Assert.equal(item2X.properties.getAString("Subject"), "This is a test message");

  // case 3: return an item from the cache
  let promiseOnDone3 = new PromiseUtils.EwsEventListener("OnDone");
  mailbox.getItemAsync("item2Id", promiseOnDone3);
  let resultObject3 = yield promiseOnDone3.promise;
  let item3 = resultObject3.item.QueryInterface(Ci.msqIEwsNativeItem);
  Assert.ok(item3 === item2X);

  // case 4: auto dirty of item with missing properties
  let promiseOnDone4 = new PromiseUtils.EwsEventListener("OnDone");
  item3.properties = null;
  mailbox.datastore.putItem(item3, null);
  mailbox.removeItemFromCache(item3.itemId);

  mailbox.getItemAsync("item2Id", promiseOnDone4);
  let resultObject4 = yield promiseOnDone4.promise;
  let item4 = resultObject4.item.QueryInterface(Ci.msqIEwsNativeItem);
  Assert.ok( !!(item4.flags & Ci.msqIEwsNativeItem.Dirty));

  // case 5: create an item with no id
  let promiseOnDone5 = new PromiseUtils.EwsEventListener("OnDone");
  mailbox.getItemAsync("", promiseOnDone5);
  let resultObject5 = yield promiseOnDone5.promise;
  Assert.ok(resultObject5.item.QueryInterface(Ci.msqIEwsNativeItem));
}

function shutdown()
{
  mailbox.shutdown();
  Assert.equal(mailbox.getNativeFolderFromCache("msgfolderroot"), null);
}

