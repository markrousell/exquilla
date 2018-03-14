/* ***** BEGIN LICENSE BLOCK *****
 * ***** END LICENSE BLOCK ***** */
 
  // This tests create and delete of contacts (not really offline)
 
load('soapRequestUtils.js');

var tests = [
  taskSetupEwsServer,
  taskSetupTestContactFolder,
  testAddSkinkDirectory,
  testCreateTestContact,
  testModifyContact,
  testDeleteContact,
  testShutdown
]

var gTestNativeContact;

// we'll try for this property
/*
<Contact xmlns="http://schemas.microsoft.com/exchange/services/2006/types">
  <Culture>en-US</Culture>
  <GivenName>SomeName</GivenName>
  <EmailAddresses>
    <Entry Key="EmailAddress1">somebody@example.org</Entry>
  </EmailAddresses>
</Contact>
*/

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

var gJsTestDirectory;
function* testCreateTestContact() {

  gJsTestDirectory = safeGetJS(gDirectory);
  // test an update
  let listener = machineListener();
  gJsTestDirectory.updateDirectory(listener);
  yield listener.promise;

  dl('after updateDirectory');

  gTestNativeContact = gNativeMailbox.createItem(null, "IPM.Contact", gJsTestDirectory.nativeFolder);
  gTestNativeContact.properties = testProperties;

  let l2 = machineListener();
  gNativeMailbox.saveNewItem(gTestNativeContact, l2);
  yield l2.promise;

  dl('created item id is ' + gTestNativeContact.itemId);
  // update folder
  let l3 = machineListener();
  gJsTestDirectory.getChildCardsWithListener(l3);
  yield l3.promise;
}

function* testModifyContact()
{
  Assert.equal(gTestNativeContact.properties.getAString("FileAs"), "SomeFileAs");
  let oldProperties = gTestNativeContact.properties;
  let newProperties = gTestNativeContact.properties.clone(null);
  newProperties.setAString("FileAs", "new FileAs");

  // Find the second email address and change it
  newProperties.getPropertyList("EmailAddresses")
               .getPropertyListByAttribute("Entry", "Key", "EmailAddress2")
               .setAString("$value", "changed@example.net");

  // Find the home address, and add a zip code
  newProperties.getPropertyList("PhysicalAddresses")
               .getPropertyListByAttribute("Entry", "Key", "Home")
               .appendString("PostalCode", "98052-3286");

  gTestNativeContact.raiseFlags(Ci.msqIEwsNativeFolder.UpdatedLocally);
  let l1 = machineListener();
  gNativeMailbox.updateItemProperties(gTestNativeContact, newProperties, l1);
  yield l1.promise;

  dl('after updateItemProperties');

  // test an update (which means to get changes from the server)
  let l2 = machineListener();
  gJsTestDirectory.updateDirectory(l2);
  yield l2.promise;

  dl('after testModifyContact updateDirectory');
  //showPropertyList(gTestNativeContact.properties);
  Assert.equal(gTestNativeContact.properties.getAString("FileAs"), "new FileAs");

  // Find the second email address
  let newEmail = gTestNativeContact.properties
                                   .getPropertyList("EmailAddresses")
                                   .getPropertyListByAttribute("Entry", "Key", "EmailAddress2")
                                   .getAString("$value");
  Assert.equal(newEmail, "changed@example.net");

  // Find the home address zip code
  let newZip = gTestNativeContact.properties
                                 .getPropertyList("PhysicalAddresses")
                                 .getPropertyListByAttribute("Entry", "Key", "Home")
                                 .getAString("PostalCode");
  Assert.equal(newZip, "98052-3286");
}

function* testDeleteContact()
{
  let cards = Cc["@mozilla.org/array;1"].createInstance(Ci.nsIMutableArray);
  let l1 = machineListener();
  gJsTestDirectory.getChildCardsWithListener(l1);
  yield l1.promise;
  let cardEnum = gJsTestDirectory.getChildCardsWithListener(null);
  while (cardEnum.hasMoreElements())
    cards.appendElement(cardEnum.getNext(), false);

  gNativeMailbox.testType = "DeleteOffline";
  let l2 = machineListener();
  gJsTestDirectory.deleteCardsWithListener(cards, l2);
  yield l2.promise;

  // count cards  
  gNativeMailbox.testType = "";
  let count;

  for (count = 0, cardEnum = gJsTestDirectory.getChildCardsWithListener(null);
       cardEnum.hasMoreElements();
       count++, cardEnum.getNext());
  Assert.equal(count, 0);

  // because no update has occurred, this is true whether test DeleteOffline is set or not. Mail
  //  has the concept of pending messages, which keeps the counts correct. Perhaps we need that
  //  concept at the native level as well to support offline operation?
  Assert.equal(gJsTestDirectory.nativeFolder.totalCount, 1);

  // update folder
  let l3 = machineListener();
  gJsTestDirectory.getChildCardsWithListener(l3);
  yield l3.promise;

  for (count = 0, cardEnum = gJsTestDirectory.getChildCardsWithListener(null);
       cardEnum.hasMoreElements();
       count++, cardEnum.getNext());

  Assert.equal(count, 0);

  // this fails if DeleteOffline is set, but not implemented
  Assert.equal(gJsTestDirectory.nativeFolder.totalCount, 0);
}

function run_test()
{
  tests.forEach(x => add_task(x));
  run_next_test();
}

