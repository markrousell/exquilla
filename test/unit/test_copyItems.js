/* ***** BEGIN LICENSE BLOCK *****
 * ***** END LICENSE BLOCK ***** */

 // This tests CopyItems request

load('soapRequestUtils.js');

var tests = [
  taskSetupEwsServer,
  taskSetupTestFolder,
  taskCreateTestItem,
  taskCopyItems,
  taskShutdown,
]

function* taskCopyItems() {

  // debug
  //Services.io.offline = true;

  var p1 = machineListener();
  gNativeMailbox.allIds(gTestNativeFolder.folderId, p1);
  let r1 = yield p1.promise;
  Assert.equal(r1.status, Cr.NS_OK);

  let srcItemIds = r1.data.QueryInterface(Ci.msqIStringArray).wrappedJSObject;
  let itemId1 = srcItemIds.getAt(0);
  Assert.ok(itemId1.length > 0);

  let itemIds = new StringArray();
  itemIds.append(itemId1);

  // do a manual call to copyItem
  let r2 = yield PromiseUtils.promiseSoapCall(gNativeMailbox, eventListener,
    "copyItems", gTest2NativeFolder, itemIds, false);
  Assert.equal(r2.status, Cr.NS_OK);
  dl('after copyItems');

  // update the folder to get counts
  // do a manual call to copyItem
  let r3 = yield PromiseUtils.promiseSoapCall(gNativeMailbox, eventListener,
    "getFolder", gTest2NativeFolder);
  Assert.equal(r3.status, Cr.NS_OK);

  Assert.equal(gTest2NativeFolder.totalCount, 1);

  // repeat using the local mailbox copy call
  let p4 = machineListener();
  // first update
  gNativeMailbox.getNewItems(gTest2NativeFolder, p4);
  let r4 = yield p4.promise;
  Assert.equal(r4.status, Cr.NS_OK);

  let p5 = machineListener();
  gNativeMailbox.copyItems(gTest2NativeFolder, itemIds, false, p5);
  let r5 = yield p5.promise;
  Assert.equal(r5.status, Cr.NS_OK);

  /**/
  Assert.equal(itemIds.getAt(0), gOldItemIds.getAt(0));

  let oldNativeItem = gNativeMailbox.getItem(gOldItemIds.getAt(0));
  dl('gNewItems is ' + gNewItems);
  dl('gNewItems.length is ' + gNewItems.length);
  let newNativeItem = gNewItems.queryElementAt(0, Ci.msqIEwsNativeItem);
  Assert.ok(itemIds.getAt(0) != newNativeItem.itemId);
  dl('new subject is ' + newNativeItem.properties.getAString("Subject"));
  Assert.equal(newNativeItem.properties.getAString("Subject"), oldNativeItem.properties.getAString("Subject"));

  let p6 = machineListener();
  gNativeMailbox.getNewItems(gTest2NativeFolder, p6);
  let r6 = yield p6.promise;
  Assert.equal(r6.status, Cr.NS_OK);
  Assert.equal(gTest2NativeFolder.totalCount, 2);
  /**/
}

function run_test()
{
  tests.forEach(x => add_task(x));
  run_next_test();
}
