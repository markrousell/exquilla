/* ***** BEGIN LICENSE BLOCK *****
 * ***** END LICENSE BLOCK ***** */

Cu.import("resource://exquilla/ewsUtils.jsm");
// not sure why this spews uncaught errors
Utils.importLocally(this);
load('utilities.js');

const PR_LAST_VERB_EXECUTED = "0x1081";
const EXCHIVERB_REPLYTOSENDER = "102";

// fake items for merge test
//      plExtendedProperty.setAString("ExtendedFieldURI/$attributes/PropertyTag", aPropertyTag);
//      plExtendedProperty.setAString("ExtendedFieldURI/$attributes/PropertyType", aPropertyType);
//      aProperties.appendPropertyList("ExtendedProperty", plExtendedProperty);
//    plExtendedProperty.setAString("Value", aValue);
var testMergeItems = [
  { ItemClass: "IPM.INVALID",
    Subject: "IPM.INVALID subject",
  },
  { ItemClass: "IPM.Note",
    Subject: "IPM.Note subject",
    ExtendedProperty: oPL({
      Value: "103",
      ExtendedFieldURI: oPL({
        $attributes: oPL({
          PropertyTag: PR_LAST_VERB_EXECUTED,
          PropertyType: "Integer",
        }),
      }),
    }),
  },
  { ItemClass: "IPM.Contact",
    Subject: "IPM.Contact subject",
    //   "contacts:PhysicalAddress:Street/Home",
    CompanyName: "Old Name",
    PhysicalAddresses: aPL('Entry', [
      oPL({
        $attributes: oPL({
          Key: 'Home',
        }),
        Street: "The Street",
      }),
    ]),
    EmailAddresses: aPL('Entry', [
      oPL({
        $attributes: oPL({
          Key: "EmailAddress1",
        }),
        $value: 'test1@email.invalid',
      }),
      oPL({
        $attributes: oPL({
          Key: "EmailAddress2",
        }),
        $value: 'test2@email.invalid',
      }),
    ]),
  },
];


// fake item for test folder
var testFolderMessage =
                    { ItemClass: "IPM.Note",
                      Subject:   "This is a test message",
                      Body: oPL(
                                 {$value: 'TheBody',
                                  $attributes: oPL({BodyType: 'Text'})
                                 }),
                      Sender: oPL(
                      {
                        Mailbox: oPL(
                        { Name: "Kent James",
                          EmailAddress: "kenttest@caspia.com",
                          RoutingType: "SMTP"
                        })
                      }),
                      ToRecipients: oPL(
                      {
                        Mailbox: oPL(
                        { Name: "Kent James",
                          EmailAddress: "kenttest@caspia.com",
                          RoutingType: "SMTP"
                        })
                      }),
                      From: oPL(
                      {
                        Mailbox: oPL(
                        { Name: "Kent James",
                          EmailAddress: "kenttest@caspia.com",
                          RoutingType: "SMTP"
                        })
                      }),
                      IsRead: false,
                    };

var niCIDs = [
              "@mesquilla.com/ewsnativeitem;1",
             ];
var niCID;

// This is 15 ones (the sign bit is zero and unused)
const ONES = 0x7fffffff;
const kMessageNs = "http://schemas.microsoft.com/exchange/services/2006/messages";
const kTypesNs = "http://schemas.microsoft.com/exchange/services/2006/types";

// Utility functions

// shorthand create
function newNI() {
  let ni = Cc[niCID].createInstance(Ci.msqIEwsNativeItem);
  ni.mailbox = gMailbox;
  return ni;
}

function run_test()
{
  for (niCID of niCIDs) {
    for (var test of tests)
      test();
  }
}

var gMailbox = Cc["@mesquilla.com/ewsnativemailbox;1"]
                   .createInstance(Ci.msqIEwsNativeMailbox);
gMailbox.loadSchema('2007sp1');

var tests = [
  // test that the component exists
  function* testExists() {
    dl("create nativeItem with CID " + niCID);
    let ni = newNI();
    Assert.ok(safeInstanceOf(ni, Ci.msqIEwsNativeItem));
  },
  function* testMerge() {
    for ( let testObject of testMergeItems) {
      let ni = newNI();
      ni.itemId = "theItemId";
      ni.parentId = "theParentId";
      ni.changeKey = "theChangeKey";
      ni.properties = oPL(testObject);
      ni.itemClass = ni.properties.getAString("ItemClass");

      ni.folderId = "ThisIsTheNativeFolderId";
      let folder = gMailbox.getNativeFolder(ni.folderId);
      //ni.setExtendedProperty(PR_LAST_VERB_EXECUTED, "Integer",
      //                       EXCHIVERB_REPLYTOSENDER, ni.properties);
      let newProperties = ni.properties.clone();
      // a simple name
      if (ni.itemClass == "IPM.Contact") {
        newProperties.setAString("CompanyName", "new name");
        let address2 = newProperties.getPropertyListByAttribute('EmailAddresses/Entry', 'Key', 'EmailAddress2');
        address2.setAString("$value", "changed@email.invalid");
      }
      // an extended property
      else if (ni.itemClass == "IPM.Note") {
        newProperties.setAString("ExtendedProperty/Value", EXCHIVERB_REPLYTOSENDER);
        //showPL(newProperties);
      }
      dl("Showing pre-merge PL");
      showPL(ni.properties);
      let result = ni.mergeChanges(newProperties);
      dl("Showing local properties");
      showPL(ni.localProperties);
      if (ni.itemClass == "IPM.Contact") {
        Assert.equal(ni.localProperties.getAString("Updates/SetItemField/Contact/CompanyName"), "new name");
        Assert.equal(result, Cr.NS_OK);
        let updates = ni.localProperties.getPropertyLists("Updates/SetItemField");
        let foundCompanyName = false;
        let foundEmailAddress2 = false;
        for (let index = 0; index < updates.length; index++) {
          let setItemField = updates.queryElementAt(index, Ci.msqIPropertyList).wrappedJSObject;
          //dl('show setItemField for index = ' + index);
          //showPL(setItemField);
          if (setItemField.getAString("FieldURI/$attributes/FieldURI") == "contacts:CompanyName") {
            foundCompanyName = true;
            Assert.equal(setItemField.getAString("Contact/CompanyName"), "new name");
          }
          if (setItemField.getAString("IndexedFieldURI/$attributes/FieldIndex") == "EmailAddress2") {
            foundEmailAddress2 = true;
            Assert.equal(setItemField.getAString("IndexedFieldURI/$attributes/FieldURI"), "contacts:EmailAddress");
            Assert.equal(setItemField.getAString("Contact/EmailAddresses/Entry/$attributes/Key"), "EmailAddress2");
          }
        }
        Assert.ok(foundCompanyName && foundEmailAddress2);
        //"attribute <Updates/SetItemField/Contact/EmailAddresses/Entry/$attributes/Key> is <EmailAddress2>"
        //"$value <Updates/SetItemField/Contact/EmailAddresses/Entry/> is <changed@email.invalid>"
      }
      else if (ni.itemClass == "IPM.Note") {
        Assert.equal(ni.localProperties.getAString("Updates/SetItemField/Message/ExtendedProperty/Value"), "102");
        Assert.equal(result, Cr.NS_OK);
      }
      else {
        Assert.equal(result, Cr.NS_ERROR_ALREADY_INITIALIZED);
      }
    }
  },
  /**/
  // test of functionality
  function* testWorks() {
    let ni = newNI();
    dl('nativeItem is ' + ni);

    // Test of simple string attributes
    let simpleStringAttributes = [
      "previousId",
      "itemClass",
      "changeKey",
      "folderId",
      "parentId",
      "originalStart",
      "distinguishedFolderId",
      "mimeContent",
      "mimeCharacterSet",
    ];
    for (let theAttribute of simpleStringAttributes) {
      let theString = theAttribute + "Value";
      dl('testing attribute ' + theAttribute);
      ni[theAttribute] = theString;
      Assert.equal(ni[theAttribute], theString);
    }

    // Test of simple integer attributes;
    let simpleIntegerAttributes = [
      "instanceIndex",
      "flags",
      "processingFlags",
    ];
    let someInteger = 23;
    for (let theAttribute of simpleIntegerAttributes) {
      dl('testing attribute ' + theAttribute);
      ni[theAttribute] = ++someInteger;
      Assert.equal(ni[theAttribute], someInteger);
    }

    // test of property list attributes
    let simplePlAttributes = [
      "properties",
      "dlExpansion",
    ];
    for (let theAttribute of simplePlAttributes) {
      dl('testing attribute ' + theAttribute);
      let pl = new PropertyList();
      ni[theAttribute] = pl;
      let result = ni[theAttribute].wrappedJSObject;
      Assert.ok(pl === result);
      Assert.ok(safeInstanceOf(result, Ci.msqIPropertyList));
      Assert.ok(result.QueryInterface(Ci.msqIPropertyList));
    }

    // raise and clear flags
    ni.flags = 0;
    ni.raiseFlags(ONES);
    Assert.equal(ni.flags, ONES);
    ni.clearFlags(ONES);
    Assert.equal(ni.flags, 0);

    ni.flags = 0x1;
    ni.raiseFlags(0x10);
    Assert.equal(ni.flags, 0x11);
    ni.clearFlags(0x1);
    Assert.equal(ni.flags, 0x10);

    // specific bits
    // updatedOnServer
    ni.flags = 0;
    ni.updatedOnServer = true;
    Assert.equal(ni.flags, Ci.msqIEwsNativeItem.UpdatedOnServerBit);
    Assert.ok(ni.updatedOnServer);
    ni.flags = ONES;
    ni.updatedOnServer = false;
    Assert.equal(ni.flags, ONES & ~(Ci.msqIEwsNativeItem.UpdatedOnServerBit));
    Assert.ok(!ni.updatedOnServer);
    ni.flags = ONES;
    ni.updatedOnServer = true;
    Assert.equal(ni.flags, ONES & ~(Ci.msqIEwsNativeItem.DeletedOnServerBit |
                                    Ci.msqIEwsNativeItem.NewOnServerBit));

    // newOnServer
    ni.flags = 0;
    ni.newOnServer = true;
    Assert.equal(ni.flags, Ci.msqIEwsNativeItem.NewOnServerBit);
    Assert.ok(ni.newOnServer);
    ni.flags = ONES;
    ni.newOnServer = false;
    Assert.equal(ni.flags, ONES & ~(Ci.msqIEwsNativeItem.NewOnServerBit));
    Assert.ok(!ni.newOnServer);
    ni.flags = ONES;
    ni.newOnServer = true;
    Assert.equal(ni.flags, ONES & ~(Ci.msqIEwsNativeItem.UpdatedOnServerBit |
                                    Ci.msqIEwsNativeItem.DeletedOnServerBit));

    // deletedOnServer
    ni.flags = 0;
    ni.deletedOnServer = true;
    Assert.equal(ni.flags, Ci.msqIEwsNativeItem.DeletedOnServerBit);
    Assert.ok(ni.deletedOnServer);
    ni.flags = ONES;
    ni.deletedOnServer = false;
    Assert.equal(ni.flags, ONES & ~(Ci.msqIEwsNativeItem.DeletedOnServerBit));
    Assert.ok(!ni.deletedOnServer);
    ni.flags = ONES;
    ni.deletedOnServer = true;
    Assert.equal(ni.flags, ONES & ~(Ci.msqIEwsNativeItem.UpdatedOnServerBit |
                                    Ci.msqIEwsNativeItem.NewOnServerBit));

    // needsProperties
    ni.flags = 0;
    ni.needsProperties = true;
    Assert.equal(ni.flags, Ci.msqIEwsNativeItem.NeedsPropertiesBit);
    Assert.ok(ni.needsProperties);
    ni.flags = ONES;
    ni.needsProperties = false;
    Assert.equal(ni.flags, ONES & ~(Ci.msqIEwsNativeItem.NeedsPropertiesBit));
    Assert.ok(!ni.needsProperties);
    ni.flags = ONES;
    ni.needsProperties = true;
    Assert.equal(ni.flags, ONES);

    // deleted
    ni.flags = 0;
    ni.deleted = true;
    Assert.equal(ni.flags, Ci.msqIEwsNativeItem.DeletedBit);
    Assert.ok(ni.deleted);
    ni.flags = ONES;
    ni.deleted = false;
    Assert.equal(ni.flags, ONES & ~(Ci.msqIEwsNativeItem.DeletedBit));
    Assert.ok(!ni.deleted);
    ni.flags = ONES;
    ni.deleted = true;
    Assert.equal(ni.flags, ONES);

    // exItemId is part of the unfinished calendar, so minimal test.
    ni.parentId = "ParentID";
    ni.originalStart = "OriginalStart";
    ni.instanceIndex = 0;
    Assert.equal(ni.exItemId, "ParentID?OriginalStart=OriginalStart");

    // localProperties
    Assert.ok(safeInstanceOf(ni.localProperties, Ci.msqIPropertyList));
    let pl = new PropertyList();
    pl.setAString("TheLP", "SomeLP");
    ni.localProperties = pl;
    Assert.equal(ni.localProperties.getAString("TheLP"), "SomeLP");

    // body
    // first, with nothing.
    ni.body = null;
    Assert.ok(!ni.body);
    Assert.ok(ni.isBodyEmpty);
    // then, through property list
    ni.properties = pl;
    pl.setAString("Body", "TheBody");
    Assert.equal(ni.body, "TheBody");
    Assert.ok(!ni.isBodyEmpty);
    // then, through a body attribute directly
    ni.body = "AnotherBody";
    Assert.equal(ni.body, "AnotherBody");
    Assert.ok(!!(ni.flags & Ci.msqIEwsNativeItem.HasBody));
    Assert.ok(!ni.isBodyEmpty);

    // cloning
    let clone = ni.clone("", "newChangeKey", null);
    Assert.ok(clone.mailbox === ni.mailbox);
    Assert.ok(clone.itemId);
    Assert.equal(clone.flags, (ni.flags | Ci.msqIEwsNativeItem.HasTempId) &
                              ~Ci.msqIEwsNativeItem.HasOfflineBody);
    Assert.equal(clone.changeKey, "newChangeKey");
    Assert.equal(clone.processingFlags, ni.processingFlags & ~Ci.msqIEwsNativeItem.HasBody);
    Assert.ok(safeInstanceOf(clone.properties, Ci.msqIPropertyList));
    Assert.ok(safeInstanceOf(clone.dlExpansion, Ci.msqIPropertyList));
    Assert.ok(safeInstanceOf(clone.localProperties, Ci.msqIPropertyList));

    // extendedProperties

    let clonedProperties = new PropertyList();
    // set with create
    ni.setExtendedProperty(PR_LAST_VERB_EXECUTED, "Integer", EXCHIVERB_REPLYTOSENDER, clonedProperties);
    Assert.equal(clonedProperties.getAString("ExtendedProperty/ExtendedFieldURI/$attributes/PropertyTag"),
                 PR_LAST_VERB_EXECUTED);
    Assert.equal(clonedProperties.getAString("ExtendedProperty/ExtendedFieldURI/$attributes/PropertyType"),
                 "Integer");
    Assert.equal(clonedProperties.getAString("ExtendedProperty/Value"), EXCHIVERB_REPLYTOSENDER);
    // set with update
    ni.setExtendedProperty(PR_LAST_VERB_EXECUTED, "Integer", "123", clonedProperties);
    Assert.equal(clonedProperties.getAString("ExtendedProperty/ExtendedFieldURI/$attributes/PropertyTag"),
                 PR_LAST_VERB_EXECUTED);
    Assert.equal(clonedProperties.getAString("ExtendedProperty/Value"), "123");
    // create using ni's property list
    ni.properties = new PropertyList();
    ni.setExtendedProperty(PR_LAST_VERB_EXECUTED, "Integer", EXCHIVERB_REPLYTOSENDER, ni.properties);
    Assert.equal(ni.getExtendedProperty(PR_LAST_VERB_EXECUTED), EXCHIVERB_REPLYTOSENDER);

    // Test of attachment
    let properties = oPL(testFolderMessage);

//    <xs:complexType name="AttachmentType">
//      <xs:sequence>
//        <xs:element name="AttachmentId" type="t:AttachmentIdType" minOccurs="0" maxOccurs="1"/>
//        <xs:element name="Name" type="xs:string" minOccurs="0" maxOccurs="1"/>
//        <xs:element name="ContentType" type="xs:string" minOccurs="0" maxOccurs="1"/>
//        <xs:element name="ContentId" type="xs:string" minOccurs="0" maxOccurs="1"/>
//        <xs:element name="ContentLocation" type="xs:string" minOccurs="0" maxOccurs="1"/>
//      </xs:sequence>
//    </xs:complexType>

    properties.appendPropertyList("Attachments",
                                  aPL( "FileAttachment",
                                       [
                                         oPL(
                                           { AttachmentId: oPL({
                                               $attributes: oPL({Id: "Attachment1Id"}),
                                             }),
                                             Name: "Attachment1Name",
                                             ContentType: "Attachment1ContentType",
                                             ContentId: "Attachment1ContentId",
                                             ContentLocation: "Attachment1ContentLocation",
                                           }),
                                         oPL(
                                           { AttachmentId: oPL({
                                               $attributes: oPL({Id: "Attachment2Id"}),
                                             }),
                                             Name: "Attachment2Name",
                                             ContentType: "Attachment2ContentType",
                                             ContentId: "Attachment2ContentId",
                                             ContentLocation: "Attachment2ContentLocation",
                                           }),
                                       ]
                                     )
                                 );
    ni.properties = properties;
    ni.itemClass = "IPM.Note";
    Assert.equal(ni.attachmentCount, 2);

    // test getAttachmentById
    let attachment1 = ni.getAttachmentById("Attachment1Id");
    Assert.ok(safeInstanceOf(attachment1, Ci.msqIEwsNativeAttachment));
    Assert.equal(attachment1.attachmentId, "Attachment1Id");
    Assert.ok(attachment1.isFileAttachment);

    let attachment2 = ni.getAttachmentById("Attachment2Id");
    Assert.ok(safeInstanceOf(attachment2, Ci.msqIEwsNativeAttachment));
    Assert.equal(attachment2.attachmentId, "Attachment2Id");
    Assert.ok(attachment2.isFileAttachment);

    // test getAttachmentByIndex
    let attachment3 = ni.getAttachmentByIndex(1);
    Assert.ok(safeInstanceOf(attachment3, Ci.msqIEwsNativeAttachment));
    Assert.equal(attachment3.attachmentId, "Attachment2Id");
    Assert.ok(attachment3.isFileAttachment);

    // test addAttachment
    // first, an existing attachment
    let attachment4 = ni.addAttachment("Attachment1Id");
    Assert.ok(safeInstanceOf(attachment4, Ci.msqIEwsNativeAttachment));
    Assert.equal(attachment4.attachmentId, "Attachment1Id");
    Assert.equal(attachment4.contentType, "Attachment1ContentType");
    // next, a new attachment
    let attachment5 = ni.addAttachment("Attachment5Id");
    Assert.ok(safeInstanceOf(attachment5, Ci.msqIEwsNativeAttachment));
    Assert.equal(attachment5.attachmentId, "Attachment5Id");
    attachment5.contentType = "Attachment5ContentType";
    Assert.equal(attachment5.contentType, "Attachment5ContentType");
    Assert.equal(ni.properties
                   .getPropertyList("Attachments")
                   .getCountForName("FileAttachment"), 3);
    Assert.equal(ni.attachmentCount, 3);

    // removeAttachment
    // XXX TODO: test file removal
    ni.removeAttachment(attachment1);
    Assert.equal(ni.attachmentCount, 2);
    Assert.equal(ni.getAttachmentByIndex(0).attachmentId, "Attachment2Id");

    // get propertiesString;
    let savedPL = ni.properties.clone(null);
    // empty list
    ni.properties = null;
    Assert.equal(ni.propertiesString, "");
    // simulated pl
    ni.properties = savedPL;
    let ps = ni.propertiesString;
    dl(ps);
    Assert.ok(ps.startsWith("<Message"));

    // set propertiesString
    ni.properties = null;
    // force an attempted conversion
    ps = ps.replace("2007sp1", "2010sp1");
    dl(ps);
    ni.propertiesString = ps;
    showPL(ni.properties);
    Assert.equal(ni.properties.getAString("Subject"), "This is a test message");

    // mailbox
    Assert.ok(safeInstanceOf(ni.mailbox, Ci.msqIEwsNativeMailbox));
    // This is a weak reference, so we should be able to make it go away.
    gMailbox = null;
    Cu.forceGC();
    Cu.forceGC();
    try {
      // this should throw
      if (!!ni.mailbox.QueryInterface(Ci.msqIEwsNativeMailbox))
        gMailbox = null; // dummy statement
      Assert.ok(false);
    } catch (e) {
      Assert.ok(true);
    }

  },
/**/

]
