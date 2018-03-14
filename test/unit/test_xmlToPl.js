/* ***** BEGIN LICENSE BLOCK *****
 * This file is part of ExQuilla by Mesquilla.
 *
 * Copyright 2016 R. Kent James
 *
 * All Rights Reserved
 *
 * ***** END LICENSE BLOCK ***** */

// Tests module EWStoPL parsing EWS to PL
Cu.import("resource://exquilla/EWStoPL.js");
Cu.import("resource://exquilla/ewsUtils.jsm");
// not sure why this spews uncaught errors
Utils.importLocally(this);

// Namespaces
const nsTypes = "http://schemas.microsoft.com/exchange/services/2006/types";
const nsMessages = "http://schemas.microsoft.com/exchange/services/2006/messages";

// Test data
let findItemXML =
`<m:FindItemResponseMessage ResponseClass="Success">
  <m:ResponseCode>NoError</m:ResponseCode>
  <m:RootFolder IndexedPagingOffset="1" TotalItemsInView="1" IncludesLastItemInRange="true">
    <t:Items>
      <t:Message>
        <t:ItemId Id="AAMkAG..." ChangeKey="CQAAABY..."/>
        <t:ItemClass>IPM.Item</t:ItemClass>
        <t:ExtendedProperty>
          <t:ExtendedFieldURI PropertyTag="0xe69" PropertyType="Boolean"/>
          <t:Value>true</t:Value>
        </t:ExtendedProperty>
        <t:DummyValue Att="someattribute">My Content</t:DummyValue>
      </t:Message>
      <t:Message>
        <t:ItemId Id="BAMkAG..." ChangeKey="CQAAABY..."/>
        <t:ItemClass>IPM.Contact</t:ItemClass>
        <t:ExtendedProperty>
          <t:ExtendedFieldURI PropertyTag="0xe70" PropertyType="Boolean"/>
          <t:Value>false</t:Value>
        </t:ExtendedProperty>
        <t:DummyValue Att="someattribute">Other Content</t:DummyValue>
      </t:Message>
    </t:Items>
  </m:RootFolder>
</m:FindItemResponseMessage>
`;

let getItemXML =
`<m:GetItemResponseMessage ResponseClass="Success">
  <m:ResponseCode>NoError</m:ResponseCode>
  <m:Items>
      <t:Message>
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
      </t:Message>
  </m:Items>
</m:GetItemResponseMessage>
`;

function makeElement(responseMessage) {
  let xml =
    `<Body><m:Response xmlns:m="http://schemas.microsoft.com/exchange/services/2006/messages"` +
    ` xmlns:t="http://schemas.microsoft.com/exchange/services/2006/types">` +
    `${responseMessage}` +
    `</m:Response></Body>`;
  var parser = Components.classes["@mozilla.org/xmlextras/domparser;1"]
               .createInstance(Components.interfaces.nsIDOMParser);
  let doc = parser.parseFromString(xml, 'application/xml');
  return doc.documentElement;
}

function* testFindItem() {
  let element = makeElement(findItemXML);
  dumpXMLResponse(element);
  let rootFolders = element.getElementsByTagNameNS(nsMessages, "RootFolder");
  dl("rootFolders.length = " + rootFolders.length);
  dl("localName is " + rootFolders[0].localName);
  let pl = EWStoPL.domToVariant(element);
  dl("pl is " + pl);
  showPL(pl);

  // test a few sample values
  let responseMessage = pl.getPropertyList("Response/FindItemResponseMessage");
  Assert.equal(responseMessage.getLong("RootFolder/$attributes/TotalItemsInView"), 1);
  let messages = responseMessage.getPropertyLists("RootFolder/Items/Message");
  Assert.equal(messages.length, 2);

  let secondMessage = messages.queryElementAt(1, Ci.msqIPropertyList).wrappedJSObject;
  Assert.equal(secondMessage.getAString("ItemClass"), "IPM.Contact");
}

function* testGetItem() {
  let element = makeElement(getItemXML);
  let pl = EWStoPL.domToVariant(element);
  showPL(pl);

  // test some sample values
  let responseMessage = pl.getPropertyList("Response/GetItemResponseMessage");

  // there are three categories
  let categories = responseMessage.getValues("Items/Message/Categories/String");
  let results = ["Yellow Category", "Green Category", "Blue Category"];
  Assert.equal(categories.length, 3);
  for (let i = 0; i < categories.length; i++) {
    let value = categories.queryElementAt(i, Ci.nsIVariant);
    Assert.equal(value, results[i]);
  }
}

var tests = [
  testFindItem,
  testGetItem,
];

function run_test()
{
  tests.forEach(x => add_task(x));
  run_next_test();
}
