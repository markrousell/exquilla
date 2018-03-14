/* ***** BEGIN LICENSE BLOCK *****
 * ***** END LICENSE BLOCK ***** */
 
// This tests the module that stores item metadata

// TODO: add tests for dl expansion

load('soapRequestUtils.js');

// the datastore, which might be either a component or a module depending on my mood.
//Cu.import("resource:///modules/exquilla/datastore.js");
// var gDs = EwsDataStore;
//var gDs = Cc['@mesquilla.com/ewsdatastore;1']
//             .createInstance(Ci.msqIEwsDatastore);
var gDs;

var gNativeItem;

var tests = [
  testSetupServer,
  testSetup,
  testPut,
  testGet,
  testChangeId,
  testBody,
  testGetSync,
  testQueries,
  testSyncState,
  testDelete,
  testDeleteDataFromFolder,
  /**/
  testShutdown
];

// the completion result, used in tests
var gCompletionResult = 0;
// the completion data, used in tests
var gCompletionData = null;

var gEwsListener =
{
  onEvent: function onEvent(aItem, aEvent, aData, result)
  {
    dl('onEvent <' + aEvent + '> result: ' + result);

    if (aEvent == 'StatementComplete')
    {
      gCompletionResult = result;
      gCompletionData = aData;
      async_driver();
    }

    if (aEvent == 'StatementError')
    {
      throw "Error from datastorage";
      Assert.ok(false);
    }

    if (aEvent == "DatastoreClose")
      async_driver();
  }
}

function run_test()
{
  async_run_tests(tests);
}

const fakeFolderId = "theFolderIdxxxxxxxxx";
const fakeParentId = "theParentIdxxxxxxxxx";
// fake native item
let fakeItem = { itemId: 'theItemId',
                 changeKey: 'theChangeKey',
                 propertiesString: '<Message ewstype="2010sp1"><Subject>This message has multiple To recipients</Subject></Message>',
                 folderId: fakeFolderId,
                 parentId: fakeParentId,
                 originalStart: 'theOriginalStart',
                 instanceIndex: '3',
                 flags: 23,
                 localProperties: { aLocalProperty: 'localPropertyValue',
                                    anotherProp: 'anotherValue'}
               };

// fake native item
let fakeItem2 = { itemId: 'theItemId2',
                 changeKey: 'theChangeKey2',
                 propertiesString: '<Message ewstype="2010sp1"><Subject>I am 2</Subject></Message>',
                 folderId: fakeFolderId,
                 flags: 23,
                 localProperties: { aLocalProperty: 'localPropertyValue',
                                    anotherProp: 'anotherValue'}
               };
               
function* testSetup()
{
  let prefService = Cc["@mozilla.org/preferences-service;1"].
                      getService(Ci.nsIPrefService);
  let branch = prefService.getBranch("extensions.exquilla.datastore");
  branch.setBoolPref("dump", true);
  gNativeItem = gNativeMailbox.createItem(fakeItem.itemId, 'IPM.Note', gNativeInbox);
  gNativeItem.changeKey = fakeItem.changeKey;
  gNativeItem.folderId = fakeItem.folderId;
  gNativeItem.flags = fakeItem.flags;
  gNativeItem.parentId = fakeItem.parentId;
  gNativeItem.originalStart = fakeItem.originalStart;
  gNativeItem.instanceIndex = fakeItem.instanceIndex;
  let localPropertiesPL = new PropertyList();
  for (let name in fakeItem.localProperties)
    localPropertiesPL.appendString(name, fakeItem.localProperties[name]);
  gNativeItem.localProperties = localPropertiesPL;

  gDs = gNativeMailbox.datastore;
  gNativeItem.propertiesString = fakeItem.propertiesString;
  yield true;
}

function* testPut()
{
  gDs.putItem(gNativeItem, gEwsListener);
  yield false;
  Assert.equal(gCompletionResult, 0);
}

function* testGet()
{
  // null the item properties so that restore is checked
  gNativeItem.propertiesString = '';
  gNativeItem.changeKey = null;
  gNativeItem.itemClass = null;
  gNativeItem.localProperties = null;
  gDs.getItem(gNativeItem, gEwsListener);
  yield false;
  Assert.equal(gCompletionResult, 0);
  Assert.equal(gNativeItem.propertiesString, fakeItem.propertiesString);
  Assert.equal(gNativeItem.changeKey, fakeItem.changeKey);
  Assert.equal(gNativeItem.folderId, fakeItem.folderId);
  Assert.equal(gNativeItem.parentId, fakeItem.parentId);
  Assert.equal(gNativeItem.instanceIndex, fakeItem.instanceIndex);
  Assert.equal(gNativeItem.flags, fakeItem.flags | Ci.msqIEwsNativeItem.Persisted);
  Assert.equal(gNativeItem.itemClass, "IPM.Note");

  let localPropertiesPL = gNativeItem.localProperties;
  for (name in fakeItem.localProperties)
  {
    Assert.equal(fakeItem.localProperties[name], localPropertiesPL.getAString(name));
  }
}

function* testChangeId()
{
  // add a new item
  item2 = gNativeMailbox.createItem(fakeItem2.itemId, 'IPM.Note', gNativeInbox);
  item2.changeKey = fakeItem2.changeKey;
  item2.folderId = fakeItem2.folderId;
  item2.flags = fakeItem2.flags;
  let localPropertiesPL = new PropertyList();
  for (name in fakeItem2.localProperties)
    localPropertiesPL.appendString(name, fakeItem2.localProperties[name]);
  item2.localProperties = localPropertiesPL;

  item2.propertiesString = fakeItem.propertiesString;
  item2.body = "Change me!";

  gDs.putItem(item2, gEwsListener);
  yield false;
  Assert.equal(gCompletionResult, 0);
  gDs.putBody(item2, null);
  
  gDs.changeIdMeta(fakeItem2.itemId, "someNewId", gEwsListener);
  yield false;

  gDs.changeIdBody(fakeItem2.itemId, "someNewId", gEwsListener);
  yield false;

  let renamedItem = gNativeMailbox.createItem("someNewId", 'IPM.Note', gNativeInbox);
  // The changed item should have the same info as the old
  Assert.equal(renamedItem.changeKey, fakeItem2.changeKey);

  gDs.getBody(renamedItem, null);
  Assert.equal(renamedItem.body, "Change me!");

}

function* testBody()
{
  gNativeItem.body = 'the body';
  gDs.putBody(gNativeItem, gEwsListener);
  yield false;
  Assert.equal(gCompletionResult, 0);
  // null the body in the native item, then restore from the datastore
  gNativeItem.body = '';
  gDs.getBody(gNativeItem, gEwsListener);
  yield false;
  Assert.equal(gCompletionResult, 0);
  Assert.equal('the body', gNativeItem.body);

  // now test sync
  gNativeItem.body = 'another body';
  gDs.putBody(gNativeItem, null);
  gNativeItem.body = '';
  gDs.getBody(gNativeItem, null);
  Assert.equal('another body', gNativeItem.body);

  // delete body async
  gDs.deleteBody(gNativeItem, gEwsListener);
  yield false;
  Assert.equal('', gNativeItem.body);

  // now test sync
  // what happens if we delete when the body is not there?
  gDs.deleteBody(gNativeItem, null);
  gDs.deleteBody(gNativeItem, gEwsListener);
  yield false;

  gNativeItem.body = 'another body';
  gDs.putBody(gNativeItem, null);
  gDs.deleteBody(gNativeItem, null);
  Assert.equal('', gNativeItem.body);
  let notFound = null;
  try {
    gDs.getBody(gNativeItem, null);
  } catch(e) {notFound = e;}
  dl('expected error is: ' + notFound);
  Assert.ok(notFound != null);
  Assert.equal('', gNativeItem.body);

}

let syncMessage = '<Message ewstype="2010sp1"><Subject>This one is different</Subject></Message>'
// repeat the put/get using the sync version of the calls
function* testGetSync()
{
  const syncFolderId = 'syncFolderIdxxxxxxxx';
  gNativeItem.propertiesString = syncMessage;
  gNativeItem.changeKey = 'syncChangeKey';
  gNativeItem.folderId = syncFolderId;
  gNativeItem.flags = 123;
  let localPropertiesPL = new PropertyList();
  localPropertiesPL.appendString('getsyncname', 'getsyncvalue');
  gNativeItem.localProperties = localPropertiesPL;

  gDs.putItem(gNativeItem, null);
  // null the item properties so that restore is checked
  gNativeItem.propertiesString = '';
  gNativeItem.changeKey = null;
  gNativeItem.localProperties = null;
  gDs.getItem(gNativeItem, null);
  Assert.equal(gCompletionResult, 0);
  Assert.equal(gNativeItem.propertiesString, syncMessage);
  Assert.equal(gNativeItem.changeKey, 'syncChangeKey');
  Assert.equal(gNativeItem.folderId, syncFolderId);
  Assert.equal(gNativeItem.flags, 123 | Ci.msqIEwsNativeItem.Persisted);
  Assert.equal(gNativeItem.localProperties.getAString('getsyncname'), 'getsyncvalue');
}

function* testQueries()
{
  // add 2 items in a different folder;
  let fakeFolder = { folderId: "FakeFolderId"};
  let fakeItem1 = gNativeMailbox.createItem("FakeItemId1", "IPM.Note", fakeFolder);
  let fakeItem2 = gNativeMailbox.createItem("FakeItemId2", "IPM.Note", fakeFolder);
  fakeItem2.parentId = fakeItem1.itemId;
  fakeItem2.originalStart = 'dummyStart';

  // I stopped doing persist by default, so persist locally. Use both a sync and async
  gDs.putItem(fakeItem1, null);
  gDs.putItem(fakeItem2, gEwsListener);
  yield false;

  // get items from this folder
  gDs.getIdsForFolder("FakeFolderId", gEwsListener);
  yield false;

  // check that the ids are returned
  Assert.ok(safeInstanceOf(gCompletionData, Ci.msqIStringArray));
  // debug list of completion contents
  for (let i = 0; i < gCompletionData.length; i++)
    dump('id #' + i + ' is ' + gCompletionData.getAt(i) + '\n');
  Assert.equal(gCompletionData.length, 2);

  Assert.notEqual(gCompletionData.indexOf("FakeItemId1"), Ci.msqIStringArray.noIndex);
  Assert.notEqual(gCompletionData.indexOf("FakeItemId2"), Ci.msqIStringArray.noIndex);
  Assert.equal(gCompletionData.indexOf("IDoNotExist"), Ci.msqIStringArray.noIndex);

  // get an items children
  gDs.getIdsForParent("FakeItemId1", gEwsListener);
  yield false;

  // check that the ids are returned
  Assert.ok(safeInstanceOf(gCompletionData, Ci.msqIStringArray));
  Assert.equal(gCompletionData.length, 1);
  Assert.equal(gCompletionData.getAt(0), "FakeItemId2");
  
  // set changed and query
  fakeItem2.newOnServer = true;
  gDs.putItem(fakeItem2, null);
  gDs.changedOnFolder("FakeFolderId", gEwsListener);
  yield false;

  Assert.ok(safeInstanceOf(gCompletionData, Ci.msqIStringArray));
  Assert.equal(gCompletionData.length, 1);
  Assert.equal(gCompletionData.indexOf("FakeItemId2"), 0);

}

function* testSyncState()
{
  let folderId = "syncStateFolderIdxxx";
  let distinguishedFolderId = "distinguished";
  // sync versions
  let dummyFolder = gNativeMailbox.getNativeFolder(folderId);
  gDs.setSyncState(dummyFolder, "dummySyncState", null);
  Assert.equal("dummySyncState", gDs.getSyncState(dummyFolder, null));

  let dFolder = gNativeMailbox.getNativeFolder(distinguishedFolderId);
  Assert.equal(distinguishedFolderId, dFolder.distinguishedFolderId);
  Assert.equal("", dFolder.folderId);
  gDs.setSyncState(dFolder, "distinguishedSyncState", null);
  Assert.equal("distinguishedSyncState", gDs.getSyncState(dFolder, null));

  // async version
  let secondFolder = gNativeMailbox.getNativeFolder("secondFolderId");
  gDs.setSyncState(secondFolder, "secondSyncState", gEwsListener);
  yield false;

  gDs.getSyncState(secondFolder, gEwsListener);
  yield false;

  dl("gCompletion data is " + gCompletionData);
  let syncState = gCompletionData.QueryInterface(Ci.nsISupportsString).data;
  Assert.equal(syncState, "secondSyncState");
}

function* testDelete()
{
  gDs.deleteItem(gNativeItem, gEwsListener);
  yield false;

  // now try to get that item. The get should fail.
  Assert.equal(gCompletionResult, 0);
  gDs.getItem(gNativeItem, gEwsListener);
  yield false;

  // xxx test something that shows the get failed
  Assert.equal(gCompletionResult, Cr.NS_ERROR_NOT_AVAILABLE);

  // let's also try the sync get failure
  gDs.getItem(gNativeItem, null);
  Assert.ok(!(gNativeItem.flags & Ci.msqIEwsNativeItem.Persisted));
}

function* testDeleteDataFromFolder()
{
  Assert.ok(!(gNativeItem.flags & Ci.msqIEwsNativeItem.NeedsResync));
  gDs.putItem(gNativeItem, null);
  gDs.deleteDataFromFolder(gNativeItem.folderId, gEwsListener);
  yield false;

  // now try to get that item. The get should fail.
  gDs.getItem(gNativeItem, gEwsListener);
  yield false;

  Assert.ok(!!(gNativeItem.flags & Ci.msqIEwsNativeItem.NeedsResync));
}

var completionCallback = {
  close: function close()
  {
    async_driver();
  }
}

function* testShutdown()
{
  gDs.asyncClose(gEwsListener);
  yield false;
}
