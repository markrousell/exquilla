/* ***** BEGIN LICENSE BLOCK *****
 * ***** END LICENSE BLOCK ***** */
 
 // This tests getNewItems for ewsNativeMailbox
 
load('soapRequestUtils.js');

var tests = [
  taskSetupServer,
  taskSetupTestContactFolder,
  testCreateTestContact,
  testGetNewMessages,
  taskShutdown
]

var gContactsNativeFolder;

// fake contact
// fake item for test folder
var testProperties = oPL(
                      {
                        Culture: 'en-US',
                        FileAs: 'SomeFileAs',
                        DisplayName: 'The display name',
                        GivenName: 'SomeGivenName',
                        EmailAddresses: aPL('Entry',
                        [
                          oPL(
                          {
                            $value: 'somebody@example.org',
                            $attributes: oPL({Key: 'EmailAddress1'})
                          }),
                          oPL(
                          {
                            $value: 'second@example.com',
                            $attributes: oPL({Key: 'EmailAddress2'})
                          }),
                        ]),
                        PhysicalAddresses: aPL('Entry',
                        [
                          oPL(
                          {
                            $attributes: oPL({Key: 'Home'}),
                            Street: 'One Microsoft Way',
                            City: 'Redmond',
                            State: 'WA',
                          }),
                          oPL(
                          {
                            $attributes: oPL({Key: 'Business'}),
                            Street: '10110 177th Ave NE',
                            City: 'Redmond',
                            State: 'WA',
                          }),
                        ]),
                        Surname: 'SomeSurname',
                       });



function* testGetNewMessages() {
  let l1 = machineListener();
  gNativeMailbox.getNewItems(gTestNativeContactsHost, l1);
  let r1 = yield l1.promise;
  Assert.equal(r1.status, Cr.NS_OK);

  dl('yield after getNewItems');
  let l2 = machineListener();
  gNativeMailbox.allIds(gTestNativeContactsHost.folderId, l2);
  let r2 = yield l2.promise;
  Assert.equal(r2.status, Cr.NS_OK);

  let itemIds = gCompletionData.QueryInterface(Ci.msqIStringArray).wrappedJSObject;
  dl("itemIds.length is " + itemIds.length);
  let itemId = itemIds.getAt(0);
  Assert.ok(itemId.length > 0);
  let nativeItem = gTestNativeContactsHost.getItem(itemId);
  Assert.ok(safeInstanceOf(nativeItem, Ci.msqIEwsNativeItem));
  let properties = nativeItem.properties;
  // debug output of property list
  //showPropertyList(properties);

  // check some properties from the sync call
  Assert.equal(nativeItem.itemClass, "IPM.Contact");
  Assert.ok(properties.getAString("GivenName").length > 0);

  // the sync state should also be set in the datastore
  let syncState = gNativeMailbox.datastore.getSyncState(gTestNativeContactsHost, null);
  //dl('syncState is ' + syncState);
  Assert.ok(syncState.length > 0);

}

function* testCreateTestContact() {

  let gTestNativeContact = gNativeMailbox.createItem(null, "IPM.Contact", gTestNativeContactsHost);
  gTestNativeContact.properties = testProperties;

  let listener = machineListener();
  gNativeMailbox.saveNewItem(gTestNativeContact, listener);
  let result = yield listener.promise;
  Assert.equal(result.status, Cr.NS_OK);

  return;
}

function run_test()
{
  tests.forEach(x => add_task(x));
  run_next_test();
}

