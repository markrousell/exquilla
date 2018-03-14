/* ***** BEGIN LICENSE BLOCK *****
 * This file is part of ExQuilla by Mesquilla.
 *
 * Copyright 2016 R. Kent James
 *
 * All Rights Reserved
 *
 * ***** END LICENSE BLOCK ***** */

// Tests module EWStoPL

Cu.import("resource://exquilla/EWStoPL.js");
Cu.import("resource://exquilla/ewsUtils.jsm");
// not sure why this spews uncaught errors
Utils.importLocally(this);

load('utilities.js');

function dl(a) { dump(a + "\n");}

// a simple, safe element text content extractor
function domContent(dom, name) {
  let elements = dom.getElementsByTagName(name);
  if (!elements.length) return "";
  return elements[0].textContent;
}

// test item
// fake item for test folder

var itemPLext =
{
  Culture: 'en-US',
  Subject: 'a test item',
  Body: oPL( {
               $value: 'the body',
               $attributes: oPL({ BodyType: 'Text'}),
             }
           ),
  Invalid: 'thisShouldNotBeHere',
  Importance: 'Low',
  InReplyTo: 'repliedMessageId',
  Categories: aPL('String', ['cat1', 'cat2']),
};

var itemPL = oPL(itemPLext);

/*
Sender: oPL(
{
  Mailbox: oPL(
  { Name: "Kent James",
    EmailAddress: "kenttest@caspia.com",
    RoutingType: "SMTP"
  })
})
*/

var postPLext =
{
  Sender: oPL(
  {
    Mailbox: oPL(
    { Name: "Kent James",
      EmailAddress: "kenttest@caspia.com",
      RoutingType: "SMTP"
    })
  }),
  IsRead: true,
  InternetMessageId: "imessage@example.com",
  From: oPL(
  {
    Mailbox: oPL(
    { Name: "From Me",
      EmailAddress: "me@mesquilla.com",
      RoutingType: "SMTP"
    })
  }),
  References: "the_ref",
};

var postPL = oPL(itemPLext);
for (let attr in postPLext)
  postPL.replaceOrAppendElement(attr, postPLext[attr]);

var messagePLext =
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
};

var messagePL = oPL(itemPLext);
for (let attr in postPLext)
  messagePL.replaceOrAppendElement(attr, postPLext[attr]);
for (let attr in messagePLext)
  messagePL.replaceOrAppendElement(attr, messagePLext[attr]);

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
      Street: "the street",
      City: "the city",
      State: "the state",
      CountryOrRegion: "the country",
      PostalCode: "the postal code",
    }),
    oPL(
    {
      $attributes: oPL({Key: 'Business'}),
      Street: "another street",
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
    oPL(
    {
      $value: '@somebody2',
      $attributes: oPL({Key: 'ImAddress2'})
    }),
  ]),

};

var contactPL = oPL(itemPLext);
for (let attr in contactPLext)
  contactPL.replaceOrAppendElement(attr, contactPLext[attr]);

function contactItemTests(element)
{
  Assert.equal(domContent(element, "FileAs"), "file as");
  Assert.equal(domContent(element, "DisplayName"), "display name");
  Assert.equal(domContent(element, "GivenName"), "given name");
  Assert.equal(domContent(element, "Initials"), "initials");
  Assert.equal(domContent(element, "MiddleName"), "middle name");
  Assert.equal(domContent(element, "CompanyName"), "company name");
  Assert.equal(domContent(element, "AssistantName"), "assistant name");
  Assert.equal(domContent(element, "BusinessHomePage"), "http://example.com");
  Assert.equal(domContent(element, "Department"), "department");
  Assert.equal(domContent(element, "Generation"), "generation");
  Assert.equal(domContent(element, "JobTitle"), "job title");
  Assert.equal(domContent(element, "Manager"), "manager");
  Assert.equal(domContent(element, "Mileage"), "mileage");
  Assert.equal(domContent(element, "OfficeLocation"), "office location");
  Assert.equal(domContent(element, "Profession"), "profession");
  Assert.equal(domContent(element, "SpouseName"), "spouse name");
  Assert.equal(domContent(element, "Surname"), "surname");

  {
    let EmailAddresses = element.getElementsByTagName("EmailAddresses")[0];
    let Entries = EmailAddresses.getElementsByTagName("Entry");
    let entry1 = Entries[0];
    Assert.equal(entry1.textContent, "somebody@example.org");
    Assert.equal(entry1.getAttribute("Key"), "EmailAddress1");
    let entry2 = Entries[1];
    Assert.equal(entry2.textContent, "second@example.com");
    Assert.equal(entry2.getAttribute("Key"), "EmailAddress2");
  }

  {
    let PhysicalAddresses = element.getElementsByTagName("PhysicalAddresses")[0];
    let entries = PhysicalAddresses.getElementsByTagName("Entry");
    let entry1 = entries[0];
    Assert.equal(entry1.getAttribute("Key"), "Home");
    Assert.equal(domContent(entry1, "Street"), "the street");
    Assert.equal(domContent(entry1, "City"), "the city");
    Assert.equal(domContent(entry1, "State"), "the state");
    Assert.equal(domContent(entry1, "CountryOrRegion"), "the country");
    Assert.equal(domContent(entry1, "PostalCode"), "the postal code");
    let entry2 = entries[1];
    Assert.equal(entry2.getAttribute("Key"), "Business");
    Assert.equal(domContent(entry2, "Street"), "another street");
  }

  {
    let PhoneNumbers = element.getElementsByTagName("PhoneNumbers")[0];
    let Entries = PhoneNumbers.getElementsByTagName("Entry");
    let entry1 = Entries[0];
    Assert.equal(entry1.textContent, "123-456-7890");
    Assert.equal(entry1.getAttribute("Key"), "HomePhone");
    let entry2 = Entries[1];
    Assert.equal(entry2.textContent, "234-567-8901");
    Assert.equal(entry2.getAttribute("Key"), "Pager");
  }

  {
    let ImAddresses = element.getElementsByTagName("ImAddresses")[0];
    let Entries = ImAddresses.getElementsByTagName("Entry");
    let entry1 = Entries[0];
    Assert.equal(entry1.textContent, "@somebody1");
    Assert.equal(entry1.getAttribute("Key"), "ImAddress1");
    let entry2 = Entries[1];
    Assert.equal(entry2.textContent, "@somebody2");
    Assert.equal(entry2.getAttribute("Key"), "ImAddress2");
  }
}


// test item properties on a DOM element
function itemTests(element)
{
  Assert.equal(domContent(element, "Culture"), "en-US");
  Assert.equal(domContent(element, "Subject"), "a test item");
  Assert.equal(domContent(element, "Body"), "the body");
  Assert.equal(domContent(element, "Invalid"), "");
  Assert.equal(domContent(element, "Importance"), "Low");
  Assert.equal(domContent(element, "InReplyTo"), "repliedMessageId");

  let categories = element.getElementsByTagName("Categories")[0];
  let strings = categories.getElementsByTagName("String");
  Assert.equal(strings[0].textContent, "cat1");
  Assert.equal(strings[1].textContent, "cat2");

  let bodyElement = element.getElementsByTagName("Body")[0];
  Assert.equal(bodyElement.getAttribute("BodyType"), "Text");
}

// test postItem properties on a DOM element
function postItemTests(element)
{
  Assert.equal(domContent(element, "References"), "the_ref");
  let Sender = element.getElementsByTagName("Sender")[0];
  let sMailbox = Sender.getElementsByTagName("Mailbox")[0];
  Assert.equal(domContent(sMailbox, "Name"), "Kent James");
  Assert.equal(domContent(sMailbox, "EmailAddress"), "kenttest@caspia.com");
  Assert.equal(domContent(element, "RoutingType"), "SMTP");
  let From = element.getElementsByTagName("From")[0];
  let fMailbox = From.getElementsByTagName("Mailbox")[0];
  Assert.equal(domContent(fMailbox, "Name"), "From Me");
  Assert.equal(domContent(fMailbox, "EmailAddress"), "me@mesquilla.com");
  Assert.equal(domContent(fMailbox, "RoutingType"), "SMTP");
}

function* testItemType() {
  let item = Cc["@mesquilla.com/ewsnativeitem;1"]
               .createInstance(Ci.msqIEwsNativeItem);
  item.itemId = "123456789012345678901234567890";
  item.changeKey = "theChangeKey";
  item.itemClass = "IPM.Item";
  item.properties = itemPL;
  let xml = EWStoPL.itemToItemXML(item);
  dl(xml);
  let elementXML = `<Item>${xml}</Item>`;

  let element = Cc["@mozilla.org/xmlextras/domparser;1"]
                  .createInstance(Ci.nsIDOMParser)
                  .parseFromString(elementXML, "text/xml")
                  .documentElement;
  Assert.equal(domContent(element, "ItemClass"), "IPM.Item");
  let itemIdElement = element.getElementsByTagName("ItemId")[0];
  Assert.equal(itemIdElement.getAttribute("Id"),
               "123456789012345678901234567890");
  Assert.equal(itemIdElement.getAttribute("ChangeKey"), "theChangeKey");

  itemTests(element);
}

function* testPostType() {
  dl("testPostType with properties");
  showPL(postPL);

  let item = Cc["@mesquilla.com/ewsnativeitem;1"]
               .createInstance(Ci.msqIEwsNativeItem);
  item.itemId = "2-23456789012345678901234567890";
  item.changeKey = "2ChangeKey";
  item.itemClass = "IPM.Post";
  item.properties = postPL;
  let xml = EWStoPL.itemToPostXML(item);
  dl(xml);

  // item tests
  let elementXML = `<PostItem>${xml}</PostItem>`;

  let element = Cc["@mozilla.org/xmlextras/domparser;1"]
                  .createInstance(Ci.nsIDOMParser)
                  .parseFromString(elementXML, "text/xml")
                  .documentElement;
  itemTests(element);
  Assert.equal(domContent(element, "ItemClass"), "IPM.Post");
  let itemIdElement = element.getElementsByTagName("ItemId")[0];
  Assert.equal(itemIdElement.getAttribute("Id"),
               "2-23456789012345678901234567890");
  Assert.equal(itemIdElement.getAttribute("ChangeKey"), "2ChangeKey");

  // PostItem tests
  postItemTests(element);
}

function* testMessageType() {
  let item = Cc["@mesquilla.com/ewsnativeitem;1"]
               .createInstance(Ci.msqIEwsNativeItem);
  item.itemId = "3-23456789012345678901234567890";
  item.changeKey = "3ChangeKey";
  item.itemClass = "IPM.Note";
  item.properties = messagePL;
  let xml = EWStoPL.itemToMessageXML(item);
  dl(xml);

  // item tests
  let elementXML = `<Message>${xml}</Message>`;

  let element = Cc["@mozilla.org/xmlextras/domparser;1"]
                  .createInstance(Ci.nsIDOMParser)
                  .parseFromString(elementXML, "text/xml")
                  .documentElement;
  Assert.equal(domContent(element, "ItemClass"), "IPM.Note");
  let itemIdElement = element.getElementsByTagName("ItemId")[0];
  Assert.equal(itemIdElement.getAttribute("Id"),
               "3-23456789012345678901234567890");
  Assert.equal(itemIdElement.getAttribute("ChangeKey"), "3ChangeKey");

  itemTests(element);
  postItemTests(element);

  // Message tests
  let ToRecipients = element.getElementsByTagName("ToRecipients")[0];
  let Mailboxes = ToRecipients.getElementsByTagName("Mailbox");
  Assert.equal(Mailboxes.length, 2);
  let m0 = Mailboxes[0];
  Assert.equal(domContent(m0, "Name"), "First To");
  Assert.equal(domContent(m0, "EmailAddress"), "firstto@example.com");
  Assert.equal(domContent(m0, "RoutingType"), "SMTP");
  let m1 = Mailboxes[1];
  Assert.equal(domContent(m1, "Name"), "Second To");
  Assert.equal(domContent(m1, "EmailAddress"), "secondto@example.com");
  Assert.equal(domContent(m1, "RoutingType"), "SMTP");
}

function* testContactType()
{
  dl("testContactType with properties");
  showPL(contactPL);

  let item = Cc["@mesquilla.com/ewsnativeitem;1"]
               .createInstance(Ci.msqIEwsNativeItem);
  item.itemId = "4-23456789012345678901234567890";
  item.changeKey = "4ChangeKey";
  item.itemClass = "IPM.Contact";
  item.properties = contactPL;
  let xml = EWStoPL.itemToContactXML(item);
  dl(xml);

  // item tests
  let elementXML = `<ContactItem>${xml}</ContactItem>`;

  let element = Cc["@mozilla.org/xmlextras/domparser;1"]
                  .createInstance(Ci.nsIDOMParser)
                  .parseFromString(elementXML, "text/xml")
                  .documentElement;
  dumpXMLResponse(element);
  itemTests(element);

  Assert.equal(domContent(element, "ItemClass"), "IPM.Contact");
  let itemIdElement = element.getElementsByTagName("ItemId")[0];
  Assert.equal(itemIdElement.getAttribute("Id"),
               "4-23456789012345678901234567890");
  Assert.equal(itemIdElement.getAttribute("ChangeKey"), "4ChangeKey");

  // ContactItem tests
  contactItemTests(element);
}

// Sample message

let message1 =
` <t:Message xmlns:t="http://schemas.microsoft.com/exchange/services/2006/types">
    <t:ItemId Id="AAMkAGFkYTY1YjZkLTIyZjctNDcyNy1hMmU4LTU1ZDA5ZmJiZjYzMQBGAAAAAAChmrQMyFlTQqhQxGONw0aJBwDnL5cEvLu1Ro/1QGwGrPfJAACY2ychAADnL5cEvLu1Ro/1QGwGrPfJAACY77xCAAA=" ChangeKey="CQAAABYAAADnL5cEvLu1Ro/1QGwGrPfJAACY775t"/>
    <t:ParentFolderId Id="AAMkAGFkYTY1YjZkLTIyZjctNDcyNy1hMmU4LTU1ZDA5ZmJiZjYzMQAuAAAAAAChmrQMyFlTQqhQxGONw0aJAQDnL5cEvLu1Ro/1QGwGrPfJAACY2ychAAA=" ChangeKey="AQAAAA=="/>
    <t:ItemClass>IPM.Note</t:ItemClass>
    <t:Subject>...hidden...</t:Subject>
    <t:Body BodyType="Text">...hidden...</t:Body>
    <t:DateTimeReceived>2014-02-28T20:06:18Z</t:DateTimeReceived>
    <t:Size>699</t:Size>
    <t:Categories>
        <t:String>Yellow Category</t:String>
        <t:String>Green Category</t:String>
        <t:String>Blue Category</t:String>
    </t:Categories>
    <t:Importance>Normal</t:Importance>
    <t:InternetMessageHeaders>
        <t:InternetMessageHeader HeaderName="Received">from mx04-1.sherweb2010.com (10.30.12.141) by S04-HUB004.s04.local (10.30.12.50) with Microsoft SMTP Server id 14.3.174.1; Fri, 28 Feb 2014 15:06:18 -0500</t:InternetMessageHeader>
        <t:InternetMessageHeader HeaderName="Received">from mxout-07.mxes.net (mxout-07.mxes.net [216.86.168.182])	(using TLSv1 with cipher DHE-RSA-AES256-SHA)	by 74.115.207.212:25 (trex/4.3.101);	Fri, 28 Feb 2014 20:06:19 GMT</t:InternetMessageHeader>
        <t:InternetMessageHeader HeaderName="Received">from [192.168.0.40] (unknown [76.22.116.39])	(using TLSv1 with cipher DHE-RSA-AES128-SHA (128/128 bits))	(No client certificate requested)	by smtp.mxes.net (Postfix) with ESMTPSA id 41AF722E255	for &lt;test@exquilla.com&gt;; Fri, 28 Feb 2014 15:06:10 -0500 (EST)</t:InternetMessageHeader>
        <t:InternetMessageHeader HeaderName="X-MC-REJECTLIMIT">100</t:InternetMessageHeader>
        <t:InternetMessageHeader HeaderName="X-MC-JUNKLIMIT">99</t:InternetMessageHeader>
        <t:InternetMessageHeader HeaderName="X-MC-DATA">Organization Settings: Spam filtering disabled</t:InternetMessageHeader>
        <t:InternetMessageHeader HeaderName="X-MC-RESULT">WHITELIST</t:InternetMessageHeader>
        <t:InternetMessageHeader HeaderName="X-MC-CM-SCORE">0</t:InternetMessageHeader>
        <t:InternetMessageHeader HeaderName="X-MC-DELIVER">INBOX</t:InternetMessageHeader>
        <t:InternetMessageHeader HeaderName="Message-ID">&lt;5310EC2E.5070802@caspia.com&gt;</t:InternetMessageHeader>
        <t:InternetMessageHeader HeaderName="Date">Fri, 28 Feb 2014 12:06:06 -0800</t:InternetMessageHeader>
        <t:InternetMessageHeader HeaderName="User-Agent">Mozilla/5.0 (Windows NT 6.1; WOW64; rv:24.0) Gecko/20100101 Thunderbird/24.3.0</t:InternetMessageHeader>
        <t:InternetMessageHeader HeaderName="MIME-Version">1.0</t:InternetMessageHeader>
        <t:InternetMessageHeader HeaderName="Subject">url 4</t:InternetMessageHeader>
        <t:InternetMessageHeader HeaderName="Content-Type">text/plain</t:InternetMessageHeader>
        <t:InternetMessageHeader HeaderName="Content-Transfer-Encoding">7bit</t:InternetMessageHeader>
        <t:InternetMessageHeader HeaderName="Return-Path">kent@caspia.com</t:InternetMessageHeader>
        <t:InternetMessageHeader HeaderName="X-MS-Exchange-Organization-AuthSource">S04-HUB004.s04.local</t:InternetMessageHeader>
        <t:InternetMessageHeader HeaderName="X-MS-Exchange-Organization-AuthAs">Anonymous</t:InternetMessageHeader>
    </t:InternetMessageHeaders>
    <t:DateTimeCreated>2014-02-28T20:06:18Z</t:DateTimeCreated>
    <t:DisplayCc/>
    <t:DisplayTo>Test User</t:DisplayTo>
    <t:HasAttachments>false</t:HasAttachments>
    <t:Culture>en-US</t:Culture>
    <t:Sender>
        <t:Mailbox>
            <t:Name>Kent James</t:Name>
            <t:EmailAddress>kent@caspia.com</t:EmailAddress>
            <t:RoutingType>SMTP</t:RoutingType>
            <t:MailboxType>OneOff</t:MailboxType>
        </t:Mailbox>
    </t:Sender>
    <t:ToRecipients>
        <t:Mailbox>
            <t:Name>Test User</t:Name>
            <t:EmailAddress>test@exquilla.com</t:EmailAddress>
            <t:RoutingType>SMTP</t:RoutingType>
            <t:MailboxType>Mailbox</t:MailboxType>
        </t:Mailbox>
    </t:ToRecipients>
    <t:From>
        <t:Mailbox>
            <t:Name>Kent James</t:Name>
            <t:EmailAddress>kent@caspia.com</t:EmailAddress>
            <t:RoutingType>SMTP</t:RoutingType>
            <t:MailboxType>OneOff</t:MailboxType>
        </t:Mailbox>
    </t:From>
    <t:InternetMessageId>&lt;5310EC2E.5070802@caspia.com&gt;</t:InternetMessageId>
    <t:IsRead>true</t:IsRead>
    <t:TestOnlyAttribute testattribute="the attribute"/>
</t:Message>
`;

function* testPlToXML() {
  let element1 = Cc["@mozilla.org/xmlextras/domparser;1"]
                  .createInstance(Ci.nsIDOMParser)
                  .parseFromString(message1, "text/xml")
                  .documentElement;
  let messagePL = EWStoPL.domToVariant(element1);
  showPL(messagePL);
  let text = EWStoPL.plToXML("Message", "2007sp1", messagePL);
  dl(text);

  // parse back to XML
  let element2 = Cc["@mozilla.org/xmlextras/domparser;1"]
                  .createInstance(Ci.nsIDOMParser)
                  .parseFromString(text, "text/xml")
                  .documentElement;
  let messagePL2 = EWStoPL.domToVariant(element2);
  showPL(messagePL2);

  // test a few sample values
  let ToRecipients = element2.getElementsByTagName("ToRecipients")[0];
  let Mailboxes = ToRecipients.getElementsByTagName("Mailbox");
  Assert.equal(Mailboxes.length, 1);
  let m0 = Mailboxes[0];
  Assert.equal(domContent(m0, "Name"), "Test User");
  Assert.equal(domContent(m0, "EmailAddress"), "test@exquilla.com");
  Assert.equal(domContent(m0, "RoutingType"), "SMTP");
  Assert.equal(messagePL2.getAString("InternetMessageId"), "<5310EC2E.5070802@caspia.com>");
  Assert.ok(messagePL2.getBoolean("IsRead"));
  Assert.ok(!messagePL2.getBoolean("HasAttachments"));

  // make sure that the abbreviated form was used
  Assert.ok(text.indexOf('<TestOnlyAttribute testattribute="the attribute"/>') > 0);

}

var tests = [
  testPlToXML,
  testItemType,
  testPostType,
  testMessageType,
  testContactType,
  /**/
];

function run_test()
{
  tests.forEach(x => add_task(x));
  run_next_test();
}
