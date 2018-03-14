/* ***** BEGIN LICENSE BLOCK *****
 * This file is part of ExQuilla by Mesquilla.
 *
 * Copyright 2016 R. Kent James
 *
 * All Rights Reserved
 *
 * ***** END LICENSE BLOCK ***** */

// Tests js-implementation of soap requests deleteItem and getAllIds.

Cu.import("resource://gre/modules/Task.jsm");

XPCOMUtils.defineLazyModuleGetter(this, "PromiseUtils",
                                  "resource://exquilla/PromiseUtils.jsm");

load('utilities.js');
load('soapRequestUtils.js');

function dl(a) { dump(a + "\n");}

// test item
// fake item for test folder
var itemObject =
{
  Culture: 'en-US',
  Subject: 'a test item',
  Body: oPL( {
               $value: 'the body',
               $attributes: oPL({ BodyType: 'Text'}),
             }
           ),
  Importance: 'Low',
  InReplyTo: 'repliedMessageId',
  Categories: aPL('String', ['cat1', 'cat2']),
};

var itemPL = oPL(itemObject);
var gItemId;

function* taskCreateItem()
{
  // tests the creation of a generic item
  let item = gNativeMailbox.createItem(null, "IPM.Item",
               gHostNativeFolder);
  item.properties = itemPL;
  let result = yield PromiseUtils.promiseSoapCall(gNativeMailbox, eventListener,
    "createItem", item, "SaveOnly");
  Assert.equal(result.status, Cr.NS_OK);

  // read the item back
  let items = new StringArray();
  Assert.ok(item.itemId.length > 0);
  items.append(item.itemId);
  item.properties = null;
  result = yield PromiseUtils.promiseSoapCall(gNativeMailbox, eventListener,
    "getChangedItemProperties", gHostNativeFolder, items, true);
  Assert.equal(result.status, Cr.NS_OK);
  showPL(item.properties);

  // Confirm that the item got created and downloaded.
  Assert.equal(item.itemClass, "IPM.Item");
  itemTypeTest(item);
  gItemId = item.itemId;

}

function itemTypeTest(item)
{
  let pl = item.properties;
  Assert.equal(pl.getAString("Culture"), "en-US");
  Assert.equal(pl.getAString("Subject"), "a test item");
  Assert.equal(pl.getAString("Importance"), "Low");
  Assert.equal(pl.getAString("InReplyTo"), "repliedMessageId");
}

function* taskDeleteItem()
{
/*
  /// delete items
  void deleteItems(in msqIEwsSoapResponse aResponse,
                   in msqIStringArray aItemIds,
                   in boolean aMoveToDeletedItems);
*/
  let itemIds = new StringArray();
  itemIds.append(gItemId);
  let result = yield PromiseUtils.promiseSoapCall(gNativeMailbox, eventListener,
    "deleteItems", itemIds, false);
}

function* taskGetAllIds()
{
  let result = yield PromiseUtils.promiseSoapCall(gNativeMailbox, eventListener,
    "getAllIds", gHostNativeFolder, 0, 500);
  Assert.equal(result.status, Cr.NS_OK);
}

var tests = [
  taskSetupNative,
  taskSoapSetupTestFolder,
  taskCreateItem,
  taskGetAllIds,
  taskDeleteItem,
  taskShutdown,
];

function run_test()
{
  tests.forEach(x => add_task(x));
  run_next_test();
}
