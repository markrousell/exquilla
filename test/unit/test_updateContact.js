/* ***** BEGIN LICENSE BLOCK *****
 * ***** END LICENSE BLOCK ***** */
 
 // This tests updateItem requests
 
load('soapRequestUtils.js');

var tests = [
  taskSetupEwsServer,
  taskSetupTestContactFolder,
  testAddSkinkDirectory,
  testCreateTestContact,
  testModifyContactMailbox,
  taskShutdown
]

var gTestDirectory = null;
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

/*
  // locate the directory associated with the test contact folder
  let abManager = Cc['@mozilla.org/abmanager;1']
                    .getService(Ci.nsIAbManager);
  let directories = abManager.directories;
  while (directories.hasMoreElements())
  {
    let directory = directories.getNext();
    directory instanceof Ci.nsIAbDirectory;
    dl('found nsIAbDirectory ' + directory.dirName);
    if (!(directory instanceof Ci.msqIOverride))
      continue;
    gJsTestDirectory = directory.jsParent;
    if (!(gJsTestDirectory instanceof Ci.msqIEwsAbDirectory))
      continue;
    dl('found ews directory, name ' + gJsTestDirectory.nativeFolder.displayName);
    if (gJsTestDirectory.nativeFolder.displayName == '_test_')
    {
      dl('found test contact directory');
      gTestDirectory = directory;
      break;
    }
  }
*/
  gTestDirectory = gDirectory;
  Assert.ok(gTestDirectory instanceof Ci.nsIAbDirectory);
  let gJsTestDirectory = safeGetJS(gTestDirectory);
  Assert.ok(safeInstanceOf(gJsTestDirectory, Ci.msqIEwsAbDirectory));

  // test an update
  let listener1 = new PromiseUtils.MachineListener();
  gJsTestDirectory.updateDirectory(listener1);
  let result1 = yield listener1.promise;
  Assert.equal(result1.status, Cr.NS_OK);

  dl('after updateDirectory');

  gTestNativeContact = gNativeMailbox.createItem(null, "IPM.Contact", gTestNativeContactsHost);
  gTestNativeContact.properties = testProperties;

  /*
  let request = createSoapRequest(gNativeMailbox);
  let response = new EwsSoapResponse();
  response.showCall = true;
  response.showResponse = true;
  request.createItem(response, gTestNativeContact, '');
  request.invoke();
  yield false;
  */
  let listener2 = new PromiseUtils.MachineListener();
  gNativeMailbox.saveNewItem(gTestNativeContact, listener2);
  let result2 = yield listener2.promise;
  Assert.equal(result2.status, Cr.NS_OK);

  dl('created item id is ' + gTestNativeContact.itemId);

  // update folder
  let listener3 = new PromiseUtils.MachineListener(gEwsListener.onEvent);
  gJsTestDirectory.getChildCardsWithListener(listener3);
  let result3 = yield listener3.promise;
  Assert.equal(result3.status, Cr.NS_OK);

  return;
}

// modify the contact, but use the mailbox/machine method
function* testModifyContactMailbox()
{
  let newProperties = gTestNativeContact.properties.clone(null);

  // Find the second email address and change it
  newProperties.getPropertyList("EmailAddresses")
               .getPropertyListByAttribute("Entry", "Key", "EmailAddress2")
               .setAString("$value", "mailboxmachine@example.net");
  gTestNativeContact.raiseFlags(Ci.msqIEwsNativeItem.UpdatedLocally);
  let listener1 = new PromiseUtils.MachineListener();
  gNativeMailbox.updateItemProperties(gTestNativeContact, newProperties, listener1);
  let result1 = yield listener1.promise;
  Assert.equal(result1.status, Cr.NS_OK);

  // the contact's properties should be updated
  // Find the second email address
  let newEmail = gTestNativeContact.properties
                                   .getPropertyList("EmailAddresses")
                                   .getPropertyListByAttribute("Entry", "Key", "EmailAddress2")
                                   .getAString("$value");
  Assert.equal(newEmail, "mailboxmachine@example.net");

  // this should also be persisted, so replace the contact from the datastore and recheck
  gTestNativeContact.properties = null;
  gNativeMailbox.datastore.getItem(gTestNativeContact, null);
  newEmail = gTestNativeContact.properties
                               .getPropertyList("EmailAddresses")
                               .getPropertyListByAttribute("Entry", "Key", "EmailAddress2")
                               .getAString("$value");
  Assert.equal(newEmail, "mailboxmachine@example.net");

}

var gEwsListener =
{
  onEvent: function onEvent(aItem, aEvent, aData, result)
  {
    dl('onEvent <' + aEvent + '> result: ' + result);
    if (aEvent == 'StopMachine')
    {
      Assert.ok(result == 0);
      try {
        let enumerator = aData.QueryInterface(Ci.nsISimpleEnumerator);
        while (enumerator.hasMoreElements())
        {
          let card = enumerator.getNext().QueryInterface(Ci.nsIAbCard);
          Assert.equal(card.primaryEmail, 'somebody@example.org');
        }
      }
      catch (e) {dl(e);}
    }

    if (aEvent == 'MachineError')
      do_throw('Machine Error, result is ' + result);
  },
}

function run_test()
{
  tests.forEach(x => add_task(x));
  run_next_test();
}
