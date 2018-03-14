/* ***** BEGIN LICENSE BLOCK *****
 * ***** END LICENSE BLOCK ***** */

Cu.import("resource://exquilla/ewsUtils.jsm");
// not sure why this spews uncaught errors
Utils.importLocally(this);
load('utilities.js');

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

function run_test()
{
  for (var test of tests)
    test();
}

var tests = [
  // test that the component exists
  function* testExists() {
    let na = new EwsNativeAttachment();
    Assert.ok(safeInstanceOf(na, Ci.msqIEwsNativeAttachment));
  },
  // test of functionality
  function* testWorks() {
    let ni = Cc["@mesquilla.com/ewsnativeitem;1"].createInstance(Ci.msqIEwsNativeItem);;
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
                                             Size: "1234",
                                           }),
                                         oPL(
                                           { AttachmentId: oPL({
                                               $attributes: oPL({Id: "Attachment2Id"}),
                                             }),
                                             Name: "Attachment2Name",
                                             ContentType: "Attachment2ContentType",
                                             ContentId: "Attachment2ContentId",
                                             Size: "2345",
                                           }),
                                       ]
                                     )
                                 );
    ni.properties = properties;
    ni.itemClass = "IPM.Note";
    Assert.equal(ni.attachmentCount, 2);
    let testObj = { id: ["Attachment1Id", "Attachment2Id"],
                    name: ["Attachment1Name", "Attachment2Name"],
                    contentType: ["Attachment1ContentType", "Attachment2ContentType"],
                    contentId: ["Attachment1ContentId", "Attachment2ContentId"],
                    fileURL: ["Attachment1ContentLocation", "Attachment2ContentLocation"],
                    size: ["1234", "2345"],
    };
    for (let index of [0, 1]) {
      let attachmentsPL = ni.properties.getPropertyList("Attachments");
      dl("pl is " + attachmentsPL + " index is " + index);
      let attachment = ni.getAttachmentByIndex(index);
      Assert.equal(attachment.attachmentId, testObj.id[index]);
      Assert.equal(attachment.name, testObj.name[index]);
      Assert.equal(attachment.contentId, testObj.contentId[index]);
      Assert.equal(attachment.contentType, testObj.contentType[index]);

      let fileURL = "thefile" + index;
      attachment.fileURL = fileURL;
      Assert.equal(attachment.fileURL, fileURL);

      // sets
      attachment.attachmentId = "xx";
      Assert.equal(attachment.attachmentId, "xx");

      // test this AFTER we have changed the id to make sure the PL survives.
      Assert.equal(attachment.size, testObj.size[index]);

      // more sets
      attachment.name = "xx";
      Assert.equal(attachment.name, "xx");
      attachment.contentType = "xx";
      Assert.equal(attachment.contentType, "xx");
      attachment.contentId = "xx";
      Assert.equal(attachment.contentId, "xx");
      //attachment. = "xx";
      //Assert.equal(attachment., "xx");

      let file = do_get_file('data/bugmail1');
      let spec = Services.io.newFileURI(file).spec;
      dl("spec is " + spec);
      attachment.fileURL = "file://nowhere/noplace";
      Assert.ok(!attachment.downloaded);
      attachment.fileURL = spec;
      Assert.ok(attachment.downloaded);

      // set by native item
      Assert.ok(attachment.isFileAttachment);
      attachment.isFileAttachment = false;
      Assert.ok(!attachment.isFileAttachment);

    }
  },
/**/

]
