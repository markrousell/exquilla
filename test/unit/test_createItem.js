/* ***** BEGIN LICENSE BLOCK *****
 * This file is part of ExQuilla by Mesquilla.
 *
 * Copyright 2016 R. Kent James
 *
 * All Rights Reserved
 *
 * ***** END LICENSE BLOCK ***** */

// Tests js-implementation of soap request.

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

var postObject =
{
  // Post-specific fields
  Sender: oPL(
  {
    Mailbox: oPL(
    { Name: "Fred Bailey",
      EmailAddress: "loser@example.com",
      RoutingType: "SMTP"
    }),
  }),
  IsRead: true,
  //InternetMessageId: "abcde@example.com",
  From: oPL(
  {
    Mailbox: oPL(
    {
      Name: "Golden Boy",
      EmailAddress: "theboy@example.net",
      RoutingType: "SMTP",
    })
  }),
  References: "xxx@example.org, yyy@example.net",
};

var postPL = oPL(itemObject);
for (let attr in postObject)
  postPL.replaceOrAppendElement(attr, postObject[attr]);

// message-specific fields not included in Post
var messageObject =
{
  ToRecipients: aPL('Mailbox', [
    oPL(
    { Name: "First To",
      EmailAddress: "firstto@example.com",
      RoutingType: "SMTP"
    }),
    oPL(
    { Name: "Second To",
      EmailAddress: "secondto@example.com",
      RoutingType: "SMTP"
    }),
  ]),
  CcRecipients: aPL('Mailbox', [
    oPL(
    { Name: "First Cc",
      EmailAddress: "firstcc@example.com",
      RoutingType: "SMTP"
    }),
  ]),
  BccRecipients: aPL('Mailbox', [
    oPL(
    { Name: "First Bcc",
      EmailAddress: "firstbcc@example.com",
      RoutingType: "SMTP"
    }),
    oPL(
    { Name: "Second Bcc",
      EmailAddress: "secondbcc@example.com",
      RoutingType: "SMTP"
    }),
    oPL(
    { Name: "Third Bcc",
      EmailAddress: "thirdbcc@example.com",
      RoutingType: "SMTP"
    }),
  ]),
  IsReadReceiptRequested: true,
  IsDeliveryReceiptRequested: true,
  IsRead: true,
  IsResponseRequested: false,
  ReplyTo: aPL('Mailbox', [
    oPL(
    { Name: "Reply To",
      EmailAddress: "firstreplyto@example.com",
      RoutingType: "SMTP"
    }),
  ]),
  /* EWS claims this cannot be set
  ReceivedBy: oPL(
  {
    Mailbox: oPL(
    { Name: "Received By",
      EmailAddress: "receivedby@example.com",
      RoutingType: "SMTP"
    }),
  }),
  */
  /* EWS claims this cannot be set
  ReceivedRepresenting: oPL(
  {
    Mailbox: oPL(
    { Name: "Received Representing",
      EmailAddress: "rr@example.com",
      RoutingType: "SMTP"
    }),
  }),
  */
};

var messagePL = oPL(itemObject);
for (let attr in postObject)
  messagePL.replaceOrAppendElement(attr, postObject[attr]);
for (let attr in messageObject)
  messagePL.replaceOrAppendElement(attr, messageObject[attr]);

var contactPLext =
{
  FileAs: "file as",
  DisplayName: "display name",
  GivenName: "given name",
  Initials: "initials",
  MiddleName: "middle name",
  CompanyName: "company name",
  AssistantName: "assistant name",
  BusinessHomePage: "http://example.com",
  Department: "department",
  Generation: "generation",
  JobTitle: "job title",
  Manager: "manager",
  Mileage: "mileage",
  OfficeLocation: "office location",
  Profession: "profession",
  SpouseName: "spouse name",
  Surname: "surname",

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
      CountryOrRegion: 'the country',
      PostalCode: 'somezip',
    }),
    oPL(
    {
      $attributes: oPL({Key: 'Business'}),
      Street: '10110 177th Ave NE',
      City: 'Redmond',
      State: 'WA',
    }),
  ]),

  PhoneNumbers: aPL('Entry',
  [
    oPL(
    {
      $value: '123-456-7890',
      $attributes: oPL({Key: 'HomePhone'}),
    }),
    oPL(
    {
      $value: '234-567-8901',
      $attributes: oPL({Key: 'Pager'}),
    }),
  ]),

  ImAddresses: aPL('Entry',
  [
    oPL(
    {
      $value: '@somebody1',
      $attributes: oPL({Key: 'ImAddress1'})
    }),
    /* nativeFolder only gets one IM address!
    oPL(
    {
      $value: '@somebody2',
      $attributes: oPL({Key: 'ImAddress2'})
    }),
    */
  ]),

};

var contactPL = oPL(itemObject);
for (let attr in contactPLext)
  contactPL.replaceOrAppendElement(attr, contactPLext[attr]);

for (let attr in contactPLext)
  contactPL.replaceOrAppendElement(attr, contactPLext[attr]);

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
  // items do not get the body by default
  Assert.equal(item.body, "");

}

function itemTypeTest(item)
{
  let pl = item.properties;
  Assert.equal(pl.getAString("Culture"), "en-US");
  Assert.equal(pl.getAString("Subject"), "a test item");
  Assert.equal(pl.getAString("Importance"), "Low");
  Assert.equal(pl.getAString("InReplyTo"), "repliedMessageId");
}

function* taskCreatePost()
{
  // tests the creation of a generic item
  let item = gNativeMailbox.createItem(null, "IPM.Post",
               gHostNativeFolder);
  item.properties = postPL;
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

  // item fields
  Assert.equal(item.itemClass, "IPM.Post");
  itemTypeTest(item);
  // items do not get the body by default
  Assert.equal(item.body, "");

  // post fields
  postTypeTest(item);
}

function postTypeTest(item)
{
  let pl = item.properties;
  let sm = pl.getPropertyList("Sender/Mailbox");
  Assert.equal(sm.getAString("Name"), "Fred Bailey");
  Assert.equal(sm.getAString("EmailAddress"), "loser@example.com");
  Assert.equal(sm.getAString("RoutingType"), "SMTP");
  /**/
  Assert.ok(pl.getBoolean("IsRead"));

  // the internet message ID is created by the server
  //Assert.ok(pl.getAString("InternetMessageId"), "abcde@example.com");
  let fm = pl.getPropertyList("From/Mailbox");
  Assert.equal(fm.getAString("Name"), "Golden Boy");
  Assert.equal(fm.getAString("EmailAddress"), "theboy@example.net");
  Assert.equal(fm.getAString("RoutingType"), "SMTP");
  Assert.equal(pl.getAString("References"), "xxx@example.org, yyy@example.net");
}

function* taskCreateMessage()
{
  // tests the creation of a generic item
  let item = gNativeMailbox.createItem(null, "IPM.Note",
               gHostNativeFolder);
  item.properties = messagePL;
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

  // item fields
  Assert.equal(item.itemClass, "IPM.Note");
  itemTypeTest(item);
  Assert.equal(item.body, "the body");

  // post fields
  postTypeTest(item);

  // just spot check to make sure that message got created.

  let pl = item.properties;
  let br = pl.getPropertyLists("BccRecipients/Mailbox");
  Assert.equal(br.length, 3);
  let third = br.queryElementAt(2, Ci.msqIPropertyList).wrappedJSObject;
  Assert.equal(third.getAString("Name"), "Third Bcc");
  Assert.equal(third.getAString("EmailAddress"), "thirdbcc@example.com");
}

function contactItemTests(item)
{
  let pl = item.properties;
  // commented out items are not currently downloaded by default
  Assert.equal(pl.getAString("FileAs"), "file as");
  Assert.equal(pl.getAString("DisplayName"), "display name");
  Assert.equal(pl.getAString("GivenName"), "given name");
  //Assert.equal(pl.getAString("Initials"), "initials");
  Assert.equal(pl.getAString("MiddleName"), "middle name");
  Assert.equal(pl.getAString("CompanyName"), "company name");
  //Assert.equal(pl.getAString("AssistantName"), "assistant name");
  Assert.equal(pl.getAString("BusinessHomePage"), "http://example.com");
  Assert.equal(pl.getAString("Department"), "department");
  //Assert.equal(pl.getAString("Generation"), "generation");
  Assert.equal(pl.getAString("JobTitle"), "job title");
  //Assert.equal(pl.getAString("Manager"), "manager");
  //Assert.equal(pl.getAString("Mileage"), "mileage");
  //Assert.equal(pl.getAString("OfficeLocation"), "office location");
  //Assert.equal(pl.getAString("Profession"), "profession");
  Assert.equal(pl.getAString("SpouseName"), "spouse name");
  Assert.equal(pl.getAString("Surname"), "surname");

  // Email addresses
  {
    let entries = pl.getPropertyLists("EmailAddresses/Entry");
    Assert.equal(entries.length, 2);
    let entry1 = entries.queryElementAt(0, Ci.msqIPropertyList).wrappedJSObject;
    let entry2 = entries.queryElementAt(1, Ci.msqIPropertyList).wrappedJSObject;
    Assert.equal(entry1.getAString("$attributes/Key"), "EmailAddress1");
    Assert.equal(entry2.getAString("$attributes/Key"), "EmailAddress2");
    Assert.equal(entry1.getAString("$value"), "somebody@example.org");
    Assert.equal(entry2.getAString("$value"), "second@example.com");
  }

  //Physical addresses
  {
    let entries = pl.getPropertyLists("PhysicalAddresses/Entry");
    Assert.equal(entries.length, 2);
    let entry1 = entries.queryElementAt(0, Ci.msqIPropertyList).wrappedJSObject;
    let entry2 = entries.queryElementAt(1, Ci.msqIPropertyList).wrappedJSObject;
    Assert.equal(entry1.getAString("$attributes/Key"), "Business");
    Assert.equal(entry2.getAString("$attributes/Key"), "Home");
    Assert.equal(entry1.getAString("Street"), "10110 177th Ave NE");
    Assert.equal(entry1.getAString("City"), "Redmond");
    Assert.equal(entry1.getAString("State"), "WA");
    Assert.equal(entry2.getAString("Street"), "One Microsoft Way");
    Assert.equal(entry2.getAString("City"), "Redmond");
    Assert.equal(entry2.getAString("State"), "WA");
    Assert.equal(entry2.getAString("CountryOrRegion"), "the country");
    Assert.equal(entry2.getAString("PostalCode"), "somezip");
  }

  // Phone Numbers
  {
    let entries = pl.getPropertyLists("PhoneNumbers/Entry");
    Assert.equal(entries.length, 2);
    let entry1 = entries.queryElementAt(0, Ci.msqIPropertyList).wrappedJSObject;
    let entry2 = entries.queryElementAt(1, Ci.msqIPropertyList).wrappedJSObject;
    Assert.equal(entry1.getAString("$attributes/Key"), "HomePhone");
    Assert.equal(entry2.getAString("$attributes/Key"), "Pager");
    Assert.equal(entry1.getAString("$value"), "123-456-7890");
    Assert.equal(entry2.getAString("$value"), "234-567-8901");
  }

  // Im addresses
  {
    let entries = pl.getPropertyLists("ImAddresses/Entry");
    Assert.equal(entries.length, 1);
    let entry1 = entries.queryElementAt(0, Ci.msqIPropertyList).wrappedJSObject;
    Assert.equal(entry1.getAString("$attributes/Key"), "ImAddress1");
    Assert.equal(entry1.getAString("$value"), "@somebody1");
  }

}

function* taskCreateContact()
{
  // tests the creation of a generic item
  let item = gNativeMailbox.createItem(null, "IPM.Contact",
               gTestContactsFolder);
  item.properties = contactPL;
  let result = yield PromiseUtils.promiseSoapCall(gNativeMailbox, eventListener,
    "createItem", item, "SaveOnly");
  Assert.equal(result.status, Cr.NS_OK);

  // read the item back
  let items = new StringArray();
  Assert.ok(item.itemId.length > 0);
  items.append(item.itemId);
  item.properties = null;
  result = yield PromiseUtils.promiseSoapCall(gNativeMailbox, eventListener,
    "getChangedItemProperties", gTestContactsFolder, items, true);
  Assert.equal(result.status, Cr.NS_OK);
  showPL(item.properties);

  // Confirm that the item got created and downloaded.

  // item fields
  Assert.equal(item.itemClass, "IPM.Contact");
  // Not all of these work, like Subject.
  //itemTypeTest(item);

  // contact fields
  contactItemTests(item);
}

var tests = [
  taskSetupNative,
  taskSoapSetupTestFolder,
  taskCreateItem,
  taskCreatePost,
  taskCreateMessage,
  taskSoapSetupTestContactsFolder,
  taskCreateContact,
  taskShutdown,
];

function run_test()
{
  tests.forEach(x => add_task(x));
  run_next_test();
}
