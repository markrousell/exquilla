/* ***** BEGIN LICENSE BLOCK *****
 * ***** END LICENSE BLOCK ***** */

 // This tests sending a new messagewith createItem

load('soapRequestUtils.js');

var tests = [
  taskSetupServer,
  taskSetupTestFolder,
  testCreateMessageItem,
  taskShutdown
];

var gInboxNativeFolder;

var testMessage = oPL(
                    { ItemClass: "IPM.Note",
                      Subject:   "This is a test message",
                      Body: oPL(
                                 {$value: 'TheBody',
                                  $attributes: oPL({BodyType: 'Text'})
                                 }),
                      ToRecipients: oPL(
                      {
                        Mailbox: oPL(
                        { EmailAddress: "kenttest@caspia.com"
                        })
                      })
                    });

function* testCreateMessageItem() {

  // we need to test online, because we are using a combo of mailbox and
  //  response messages, and we do not go through normal startup
  //gNativeMailbox.checkOnline(gEwsEventListener);
  //yield false;

  // create an item
  // use mailbox commands to add a message to the test folder
  dl("gTest1NativeFolder.folderId is " + gTest1NativeFolder.folderId);
  let itemToSend = gNativeMailbox.createItem(null, "IPM.Note", gTest1NativeFolder);
  itemToSend.properties = oPL(testFolderMessage);

  let r1 = yield PromiseUtils.promiseSoapCall(gNativeMailbox, eventListener,
    "createItem", itemToSend, "SaveOnly");
  Assert.equal(r1.status, Cr.NS_OK);

}

function run_test()
{
  tests.forEach(x => add_task(x));
  run_next_test();
}
