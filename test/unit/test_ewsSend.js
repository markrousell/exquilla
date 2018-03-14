/* ***** BEGIN LICENSE BLOCK *****
 * ***** END LICENSE BLOCK ***** */
 
load('soapRequestUtils.js');
Cu.import("resource://gre/modules/Task.jsm");

var tests = [
  taskSetupEwsServer,
  taskSend,
  taskShutdown,
]

function* taskSend()
{
  // local sent folder typically does not exist yet, but that is our fcc.
  if (!localAccountUtils.rootFolder.containsChildNamed("Sent"))
    localAccountUtils.rootFolder.createSubfolder("Sent", null);

    // 1) basic test of getMimeAttachments

    // XXX This no longer works, because mComposeBundle in 
    //     nsMsgComposeAndSend::NotifyListenerOnStopCopy is not set.
  //let r1 = yield doSend({deliverMode: 123});
  //dl("r1 is " + r1);
  //Assert.ok(CS(r1));

    // 2) fcc to default local Sent folder

  let subject = makeSubject();
  let r2 = yield doSend({
                         deliverMode:100 + Ci.nsIMsgCompDeliverMode.Now,
                         subject:subject
                         });
  Assert.ok(CS(r2));

  // prove that the fcc message exists
  Assert.ok(getMessageInFolder(subject, 
                        localAccountUtils.rootFolder.getChildNamed("Sent")));

    // 3) save to local draft

  if (!localAccountUtils.rootFolder.containsChildNamed("Drafts"))
    localAccountUtils.rootFolder.createSubfolder("Drafts", null);
  let fccFolder = localAccountUtils.rootFolder
                                   .getChildNamed("Drafts");
  let identity = MailServices.accounts.getFirstIdentityForServer(gEwsIncomingServer);
  identity.draftFolder = fccFolder.URI;
  subject = makeSubject();
  let r3 = yield doSend({
                         deliverMode:100 + Ci.nsIMsgCompDeliverMode.SaveAsDraft,
                         subject:subject,
                         fccFolderURL:fccFolder.URI, // This seems to be ignored for drafts
                         identity:identity
                        });
  Assert.ok(CS(r3));
  Assert.ok(getMessageInFolder(subject, fccFolder));

    // 4) save to ews Sent folder

  fccFolder = gEwsIncomingServer.rootFolder
                                .getFolderWithFlags(Ci.nsMsgFolderFlags.SentMail);
  let ewsFccFolder = safeGetInterface(fccFolder, Ci.msqIEwsMailFolder);
  Assert.ok(ewsFccFolder);

  let updateListener1 = new PromiseUtils.UrlListener();
  ewsFccFolder.updateFolderWithListener(null, updateListener1);
  let updateResult1 = yield updateListener1.promise;
  Assert.ok(CS(updateResult1));

  identity.fccFolder = fccFolder.URI;
  dl("fccFolder.URL is " + fccFolder.URI);
  subject = makeSubject();
  let r4 = yield doSend({
                         deliverMode:100 + Ci.nsIMsgCompDeliverMode.Now,
                         subject:subject,
                         identity:identity
                        });
  Assert.ok(CS(r4));
  let updateListener2 = new PromiseUtils.UrlListener();
  ewsFccFolder.updateFolderWithListener(null, updateListener2);
  let updateResult2 = yield updateListener2.promise;
  Assert.ok(CS(updateResult2));
  let hdr = getMessageInFolder(subject, fccFolder);
  Assert.ok(!!hdr);

  // delete this message to prevent accumulation
  let deleteListener = new PromiseUtils.MachineListener();
  let items = new StringArray();
  items.append(hdr.getProperty("ewsItemId"));
  gNativeMailbox.deleteItems(items, false, deleteListener);
  yield deleteListener.promise;

}

function run_test()
{
  tests.forEach(x => add_task(x));
  run_next_test();
}

let doSend = Task.async(function* doSendAsync(parms) {
  let account = MailServices.accounts.FindAccountForServer(gEwsIncomingServer);

  let result = Cr.NS_ERROR_FAILURE;
  try {
    let deliverMode = parms.deliverMode || 100;
    let subject = parms.subject || "This is a sent message";
    let fccFolderURL = parms.fccFolderURL ||
                       localAccountUtils.rootFolder
                         .getChildNamed("Sent")
                         .URL;
    let identity = parms.identity ||
                     MailServices.accounts.getFirstIdentityForServer(gEwsIncomingServer);

    let ewsCompose = Cc["@mesquilla.com/ewscompose;1"].createInstance(Ci.nsIMsgCompose);
    let msgParams = Components.classes["@mozilla.org/messengercompose/composeparams;1"]
                              .createInstance(Components.interfaces.nsIMsgComposeParams);
    let composeFields = Components.classes["@mozilla.org/messengercompose/composefields;1"]
                                  .createInstance(Components.interfaces.nsIMsgCompFields);

    composeFields.from = identity.email;
    composeFields.to = "test@example.com"
    composeFields.subject = subject;
    composeFields.body = "This is an AString body";
    composeFields.fcc = fccFolderURL;
    
    let composeListener = new PromiseUtils.ComposeDoneListener();
    ewsCompose.RegisterStateListener(composeListener);

    msgParams.type = Components.interfaces.nsIMsgCompType.New;
    msgParams.format = Components.interfaces.nsIMsgCompFormat.PlainText;
    msgParams.originalMsgURI = "";
    msgParams.identity = identity;
    msgParams.composeFields = composeFields;
    msgParams.bodyIsLink = false;
    msgParams.sendListener = null;
    msgParams.smtpPassword = "";
    msgParams.origMsgHdr = null

    ewsCompose.initialize(msgParams);

    // we are starting too late in ewsCompose to get the listener registered. (???)
    let jsCompose = safeGetInterface(ewsCompose, Ci.nsISupports).wrappedJSObject;
    //jsCompose._sendListener = sendListener;

    jsCompose.sendMsgToEwsServer(deliverMode, identity, account.key, gNativeMailbox);
    let sendResult = yield composeListener.promise;
    dl("sendMsgToServer result.status is " + sendResult);
    result = sendResult;
  }
  catch (ex) {
    dl(se(ex));
    result = ex.result || Cr.NS_ERROR_FAILURE;
  }
  finally {
    return result;
  }
});

function makeSubject() {
  let subject = Cc["@mozilla.org/uuid-generator;1"]
                  .getService(Ci.nsIUUIDGenerator)
                  .generateUUID()
                  .toString();
  return subject;
}

function getMessageInFolder(subject, folder) {
  // prove that the fcc message exists
  let messageFound = false;
  let dbenum = folder.msgDatabase.EnumerateMessages();
  while (dbenum.hasMoreElements()) {
    let hdr = dbenum.getNext().QueryInterface(Ci.nsIMsgDBHdr);
    if (hdr.subject == subject) {
      messageFound = true;
      return hdr;
    }
  }
  return null;
}
