/* ***** BEGIN LICENSE BLOCK *****
 * ***** END LICENSE BLOCK ***** */

// support files for ews soap requests

load("ewsLogHelper.js");
load("ewsAsyncTestUtils.js");
Components.utils.import("resource://exquilla/ewsAbService.jsm");
Components.utils.import("resource://testing-common/mailnews/localAccountUtils.js");
Cu.import("resource://gre/modules/XPCOMUtils.jsm");
const Moz = {};
Cu.import("resource://gre/modules/PromiseUtils.jsm", Moz);

Cu.import("resource://exquilla/ewsUtils.jsm");
Cu.importGlobalProperties(["XMLHttpRequest"]);

// logHelper.js kills us for script errorsa, disable
_errorConsoleTunnel.observe = function(aMessage, aTopic, aData) {
  if (aTopic == "quit-application") {
    this.shutdown();
    return;
  }
}

// not sure why this spews uncaught errors
Utils.importLocally(this);

XPCOMUtils.defineLazyModuleGetter(this, "PromiseUtils",
                                  "resource://exquilla/PromiseUtils.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "EwsNativeService",
                                  "resource://exquilla/EwsNativeService.jsm");

// Read test account information from the environment
const envService = Cc["@mozilla.org/process/environment;1"].getService(Ci.nsIEnvironment);
const account =
{
  emailaddress: envService.get("EXQ_EMAILADDRESS"),
  username: envService.get("EXQ_USERNAME"),
  domain: envService.get("EXQ_DOMAIN") || "",
  hostname: envService.get("EXQ_HOSTNAME"),
  password: envService.get("EXQ_PASSWORD"),
  ewsURL: envService.get("EXQ_EWSURL"),
  displayName: envService.get("EXQ_DISPLAYNAME")
};

var gNativeService = new EwsNativeService();

var gNativeMailbox;
var gNativeInbox;
var gHostNativeFolder;
var gTestNativeContactFolder;
var gHostname = Cc["@mozilla.org/network/dns-service;1"]
                   .getService(Ci.nsIDNSService)
                   .myHostName;
localAccountUtils.loadLocalMailAccount();

function *testSetupServer() {

  // make sure that the test server certificate is trusted
  let listener = new AcceptCertListener(account.ewsURL);
  listener.sendRequest();
  yield false;

  gNativeMailbox = gNativeService.getNativeMailbox('exquilla://' + account.username + "@" + account.hostname);
  gNativeMailbox.isOnline = true;

  gNativeInbox = gNativeMailbox.getNativeFolder('inbox');

  gNativeMailbox.username = account.username;
  gNativeMailbox.password = account.password;
  gNativeMailbox.ewsURL = account.ewsURL;
  let dirService = Cc["@mozilla.org/file/directory_service;1"].
                     getService(Ci.nsIProperties);
  gNativeMailbox.datastoreDirectory = dirService.get("ProfD", Ci.nsIFile);

  // setup logging
  let logFile = dirService.get("ProfD", Ci.nsIFile);
  logFile.append("soapLog.log");
  gNativeMailbox.soapLogFile = logFile;

  // discover subfolders
  gNativeMailbox.discoverFolders(gEwsEventListener);
  yield false;

  // setup basic native folders

  // make sure _test_ exists
  let rootNativeFolder = gNativeMailbox.getNativeFolder("msgfolderroot");
  let testNativeFolderBase = rootNativeFolder.getSubfolderNamed('_test_');

  if (!testNativeFolderBase)
  {
    testNativeFolderBase = gNativeMailbox.getNativeFolder();
    testNativeFolderBase.folderClass = "IPF.Note";
    testNativeFolderBase.displayName = "_test_";
    gNativeMailbox.createSubfolder(rootNativeFolder, testNativeFolderBase, gEwsEventListener);
    yield false;
  }

  // Locate a folder using the hostname

  // try to locate folder
  gTestNativeFolderHost = testNativeFolderBase.getSubfolderNamed(gHostname);
  if (gTestNativeFolderHost)
  {
    gTest1NativeFolder = gTestNativeFolderHost.getSubfolderNamed("test1");
    gTest2NativeFolder = gTestNativeFolderHost.getSubfolderNamed("test2");
    // for backwards compatibility;
    gTestNativeFolder = gTest1NativeFolder;
  }

}

// we need to agree on terminology here. gEws is a skink object that implements
// an Exquilla object. gExq is the same object, but with .getInterface for the specialized
// ExQuilla interface.
var gExqIncomingServer;
var gEwsIncomingServer;
var gEwsMailInbox;
var gExqMailInbox;

function *testSetupEwsServer() {

  // make sure that the test server certificate is trusted
  let listener = new AcceptCertListener(account.ewsURL);
  listener.sendRequest();
  yield false;

  Assert.ok(typeof gEwsIncomingServer == 'undefined');

  {
    let incoming = MailServices.accounts
                               .createIncomingServer(account.username, account.hostname, "exquilla");

    let ewsIncoming = safeGetJS(incoming);
    incoming.hostName = account.hostname;
    incoming.username = account.username;
    incoming.password = account.password;
    ewsIncoming.ewsURL = account.ewsURL;
    incoming.setBoolValue("useAB", true);
    incoming.setBoolValue("useCalendar", true);
    incoming.setBoolValue("useMail", true);
    gExqIncomingServer = ewsIncoming;
    gEwsIncomingServer = incoming;
    gNativeMailbox = ewsIncoming.nativeMailbox;

    let skinkAccount = MailServices.accounts.createAccount();
    skinkAccount.incomingServer = incoming;
    skinkAccount.addIdentity(MailServices.accounts.createIdentity());
    dl("defaultIdentity is " + skinkAccount.defaultIdentity);
    skinkAccount.defaultIdentity.email = account.emailaddress;
  }
  Assert.ok(safeInstanceOf(gExqIncomingServer, Ci.msqIEwsIncomingServer));
  Assert.ok(gEwsIncomingServer instanceof Ci.nsIMsgIncomingServer);
  Assert.ok(gNativeMailbox instanceof Ci.msqIEwsNativeMailbox);

  // setup logging
  let dirService = Cc["@mozilla.org/file/directory_service;1"].
                     getService(Ci.nsIProperties);
  let logFile = dirService.get("ProfD", Ci.nsIFile);
  logFile.append("soapLog.log");
  gNativeMailbox.soapLogFile = logFile;

  gExqIncomingServer.performExpandAsync(null, ewsUrlListener);
  yield false;

  EwsAbService.loadEwsServers(gEwsEventListener);
  yield false;

  gEwsMailInbox = gEwsIncomingServer.rootFolder
                                      .getFolderWithFlags(Ci.nsMsgFolderFlags.Inbox);
  Assert.ok(gEwsMailInbox instanceof Ci.nsIMsgFolder);
  gExqMailInbox = safeGetInterface(gEwsMailInbox, Ci.msqIEwsMailFolder);
  Assert.ok(safeInstanceOf(gExqMailInbox, Ci.msqIEwsMailFolder));
  gNativeInbox = gExqIncomingServer.getNativeFolder(gExqMailInbox);
  Assert.ok(safeInstanceOf(gNativeInbox, Ci.msqIEwsNativeFolder));
  Assert.equal(gNativeInbox.distinguishedFolderId, 'inbox');
}

function* testSetupOffline() {

  Assert.ok(typeof gEwsIncomingServer == 'undefined');

  let incoming = MailServices.accounts
                             .createIncomingServer(account.username, account.hostname, "exquilla");

  let ewsIncoming = safeGetJS(incoming);
  incoming.hostName = account.hostname;
  incoming.username = account.username;
  incoming.password = account.password;
  ewsIncoming.ewsURL = account.ewsURL;
  incoming.setBoolValue("useAB", true);
  incoming.setBoolValue("useCalendar", true);
  incoming.setBoolValue("useMail", true);
  gExqIncomingServer = ewsIncoming;
  gEwsIncomingServer = incoming;
  gNativeMailbox = ewsIncoming.nativeMailbox;

  let skinkAccount = MailServices.accounts.createAccount();
  skinkAccount.incomingServer = incoming;
  skinkAccount.addIdentity(MailServices.accounts.createIdentity());
  dl("defaultIdentity is " + skinkAccount.defaultIdentity);
  skinkAccount.defaultIdentity.email = account.emailaddress;

  Assert.ok(safeInstanceOf(gExqIncomingServer,Ci.msqIEwsIncomingServer));
  Assert.ok(gEwsIncomingServer instanceof Ci.nsIMsgIncomingServer);
  Assert.ok(gNativeMailbox instanceof Ci.msqIEwsNativeMailbox);

  let rootFolder = gEwsIncomingServer.rootFolder;
  Assert.ok(rootFolder instanceof Ci.nsIMsgFolder);
  
  gEwsMailInbox = rootFolder.addSubfolder("inbox");
  Assert.ok(gEwsMailInbox instanceof Ci.nsIMsgFolder);
  gExqMailInbox = safeGetInterface(gEwsMailInbox, Ci.msqIEwsMailFolder);
  Assert.ok(safeInstanceOf(gExqMailInbox, Ci.msqIEwsMailFolder));
}

var gTest1NativeFolder;
var gTest1EwsMailFolder;
var gTest1ExqMailFolder;
var gTest2NativeFolder;
var gTest2EwsMailFolder;
var gTest2ExqMailFolder;
var gTestNativeFolderHost;
var gTestEwsFolderHost;
var gTestLocalFolderHost;

// deprecated synonym for gTest1NativeFolder;
var gTestNativeFolder;

// deprecated name for gTest1EwsMailFolder
var gTestEwsMailFolder;

// fake item for test folder
var testFolderMessage =
                    { ItemClass: "IPM.Note",
                      Subject:   "This is a test message",
                      References: "<messagetest@example.com>,<abc@def>",
                      InternetMessageId: "messageid@example.com",
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
                      From: oPL(
                      {
                        Mailbox: oPL(
                        { Name: "Kent James",
                          EmailAddress: "kenttest@caspia.com",
                          RoutingType: "SMTP"
                        })
                      }),
                      IsRead: false,
                      Size: "1234",
                      DateTimeReceived: "2011-01-19T03:54:50Z",
                      InternetMessageHeaders: aPL('InternetMessageHeader', [
                        oPL(
                             {$value: 'text/plain',
                              $attributes: oPL({HeaderName: 'Content-Type'})
                             }),
                        oPL(
                             {$value: '7bit',
                              $attributes: oPL({HeaderName: 'Content-Transfer-Encoding'})
                             }),
                        oPL(
                             {$value: 'kent@caspia.com',
                              $attributes: oPL({HeaderName: 'Return-Path'})
                             }),
                      ]),
                      ExtendedProperty:
                      [ oPL(
                        { ExtendedFieldURI: oPL(
                          {
                            $attributes: oPL(
                            {
                              PropertyTag: "0x1081", //PR_LAST_VERB_EXECUTED
                              PropertyType: "Integer",
                            }),
                          }),
                          Value: "103", // EXCHIVERB_REPLYTOALL
                        }),
                        oPL(
                        { ExtendedFieldURI: oPL(
                          {
                            $attributes: oPL(
                            {
                              PropertyTag: "0x1090", //PR_FLAG_STATUS
                              PropertyType: "Integer",
                            }),
                          }),
                          Value: "2", // PR_FLAG_STATUS_FOLLOWUPFLAGGED
                        }),
                      ],
                    };

var testFolderMessage2 =
                    { ItemClass: "IPM.Note",
                      Subject:   "This is a test message",
                      References: "<messagetest@example.com>,<abc@def>",
                      InternetMessageId: "messageid@example.com",
                      Body: oPL(
                                 {$value: '金牌面试',
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
                      From: oPL(
                      {
                        Mailbox: oPL(
                        { Name: "Kent James",
                          EmailAddress: "kenttest@caspia.com",
                          RoutingType: "SMTP"
                        })
                      }),
                      IsRead: false,
                      Size: "1234",
                      DateTimeReceived: "2011-01-19T03:54:50Z",
                      InternetMessageHeaders: aPL('InternetMessageHeader', [
                        oPL(
                             {$value: 'text/plain',
                              $attributes: oPL({HeaderName: 'Content-Type'})
                             }),
                        oPL(
                             {$value: '7bit',
                              $attributes: oPL({HeaderName: 'Content-Transfer-Encoding'})
                             }),
                        oPL(
                             {$value: 'kent@caspia.com',
                              $attributes: oPL({HeaderName: 'Return-Path'})
                             }),
                      ]),
                      ExtendedProperty:
                      [ oPL(
                        { ExtendedFieldURI: oPL(
                          {
                            $attributes: oPL(
                            {
                              PropertyTag: "0x1081", //PR_LAST_VERB_EXECUTED
                              PropertyType: "Integer",
                            }),
                          }),
                          Value: "103", // EXCHIVERB_REPLYTOALL
                        }),
                        oPL(
                        { ExtendedFieldURI: oPL(
                          {
                            $attributes: oPL(
                            {
                              PropertyTag: "0x1090", //PR_FLAG_STATUS
                              PropertyType: "Integer",
                            }),
                          }),
                          Value: "2", // PR_FLAG_STATUS_FOLLOWUPFLAGGED
                        }),
                      ],
                    };

var gMsgAddedCount = 0;
var gMsgDeletedCount = 0;

var gFolderListener =
{
  msgAdded: function msgAdded(msg)
  {
    dl('gFolderListener msgAdded: ' + msg.subject);
    gMsgAddedCount++;
    //async_driver();
  },

  msgsDeleted: function msgsDeleted(messages)
  {
    dl('gFolderListener msgsDeleted: count is ' + messages.length);
    gMsgDeletedCount += messages.length;
    async_driver();
  },

  folderAdded: function folderAdded(folder)
  {
    dl('folderAdded: ' + folder.name);
    async_driver();
  },

  folderDeleted: function folderDeleted(folder)
  {
    dl('folderDeleted: ' + folder.name);
    async_driver();
  },
}

/*
interface nsIMsgCopyServiceListener : nsISupports {
    void OnStartCopy();
    void OnProgress(in PRUint32 aProgress,
                    in PRUint32 aProgressMax);
    void SetMessageKey(in PRUint32 aKey);
    void GetMessageId(out ACString aMessageId);
    void OnStopCopy(in nsresult aStatus);
};
*/
var gCopyServiceListener = {
  OnStartCopy: function onStartCopy() {},
  OnProgress: function onProgress(aProgress, aProgressMax) {},
  SetMessageKey: function setMessageKey(aKey) {},
  GetMessageId: function getMessageId(aMessageId) {},
  OnStopCopy: function onStopCopy(aStatus) {dl('onStopCopy'); async_driver();}
}

function *testCreateTestItem() {

  // setup notification of folder events
  let MFNService = Cc["@mozilla.org/messenger/msgnotificationservice;1"]
                      .getService(Ci.nsIMsgFolderNotificationService);

  MFNService.addListener(gFolderListener, Ci.nsIMsgFolderNotificationService.msgAdded |
                                          Ci.nsIMsgFolderNotificationService.msgsDeleted);

  let testFolder = gTest1ExqMailFolder;

  // that folder should have a corresponding native folder id
  Assert.ok(safeInstanceOf(testFolder, Ci.msqIEwsMailFolder));
  let testFolderId = testFolder.folderId;
  Assert.ok(testFolderId.length > 20);

  // update folder
  testFolder.updateFolderWithListener(null, ewsUrlListener);
  yield false;

  // use mailbox commands to add a message to that folder
  itemToSend = gNativeMailbox.createItem(null, "IPM.Note", gTest1NativeFolder);
  itemToSend.properties = oPL(testFolderMessage);

  let request = createSoapRequest(gNativeMailbox);
  let response = new EwsSoapResponse();
  request.createItem(response, itemToSend, "SaveOnly");
  request.invoke();
  yield false;

  dl('created item id is ' + itemToSend.itemId);
  gNativeMailbox.datastore.putItem(itemToSend, null);
  // update folder
  testFolder.updateFolderWithListener(null, ewsUrlListener);
  yield false;

  Assert.ok(gTest1EwsMailFolder.getTotalMessages(false) > 0);
  //Assert.equal(gMsgAddedCount, 1);
  MFNService.removeListener(gFolderListener);

}

function* testShutdown()
{
  if (gNativeMailbox)
    gNativeMailbox.shutdown();
  Cc["@mozilla.org/activity-manager;1"]
    .getService(Ci.nsIActivityManager)
    .cleanUp();
  Components.utils.forceGC();
}

function EwsSoapResponse() {
  this.showCall = false;
  this.showResponse = false;
}

EwsSoapResponse.prototype = {
  onStartRequest:
  function onStartRequest(aRequest, aContext)
  {
    dl('onStartRequest');
    if (this.showCall) {
      try {
        dumpXMLResponse(aRequest.soapCall.envelope);
      } catch (e) {dl("Could not show soap call: " + e);}
    }
  },

  onNotify:
  function onNotify(aRequest, aData, aStatus) {},

  onStopRequest:
  function onStopRequest(aRequest, aContext, aStatus)
  {
    dl('onStopRequest status is ' + aStatus);
    Assert.equal(aStatus, 0);
    if (this.showResponse) {
      try {
        dumpXMLResponse(aRequest.soapResponse.envelope);
      } catch (e) { dl("Could not show soap response: " + e);}
    }
    async_driver();
  },

  errorResponse:
  function errorResponse(aRequest, aContext,
       /* in ACString */ aResponseError, // Error description from EwsSoapRequest
       /* in AString */  aResponseCode,   // ResponseCode element
       /* in AString */  aMessageText)    // MessageText element
  {
    dl('errorResponse: responseError is ' + aResponseError);
    dl('responseCode is ' + aResponseCode);
    dl('messageText is ' + aMessageText);
    if (aResponseCode == "ErrorNameResolutionMultipleResults")
    {
      dl("ignoring this responseCode");
      return;
    }
    if (!this.showCall) // call already printed
    {
      dl('soap call envelope');
      dumpXMLResponse(aRequest.soapCall.envelope);
    }
    dl('soap response envelope');
    dumpXMLResponse(aRequest.soapResponse.envelope);
    do_throw(aResponseError);
  },
}

function getFileURL(aLocalFile)
{
  var fileurl = Cc["@mozilla.org/network/io-service;1"]
                  .getService(Ci.nsIIOService)
                  .newFileURI(aLocalFile)
                  .QueryInterface(Ci.nsIFileURL);
  return fileurl.spec;
}

function createSoapRequest(aMailbox)
{
  let request = Cc["@mesquilla.com/ewssoaprequest;1"]
           .createInstance(Ci.msqIEwsSoapRequest);
  if (aMailbox)
    request.mailbox = aMailbox;
  return request;
}

var gEwsUrlListener = {
  OnStartRunningUrl: function onStartRunningUrl(aUrl) {
    dump('OnStartRunningUrl\n');
  },
  OnStopRunningUrl: function onStopRunningUrl(aUrl, aExitCode) {
    dump('OnStopRunningUrl exit is ' + aExitCode + '\n');
    if (aExitCode)
      do_throw("Error response in onStopRunningUrl");
    async_driver();
  }
}
// for compatibility with existing tests
var ewsUrlListener = gEwsUrlListener;

var gCompletionData;
var gCompletionResult;
var gCompletionItem;
var gOldItemIds;
var gNewItems;
var gShowRequestXml = false;
var gMachineError = false;
var gStopGetBodyError = false;
var gRequestError = false;
var gStopMachineError = false;
var gEndWithBody = false;
var gExpectMachineError = false;

function ErrorEventListener(aCallDriver) {
  this._callDriver = aCallDriver;
}

ErrorEventListener.prototype =
{
  QueryInterface: XPCOMUtils.generateQI([Ci.msqIEwsEventListener]),

  onEvent: function onEvent(aItem, aEvent, aData, result)
  {
    dl('gEwsEventListener onEvent <' + aEvent + '> result: ' + result);
    /**/
    if (aEvent == 'StopRequest')
    {
      gRequestError = (result != Cr.NS_OK);
      try {
      let request = aItem.QueryInterface(Ci.msqIEwsSoapRequest);
      dl('requestName is ' + request.requestName);
      if (gShowRequestXml)
      {
        dl('soap call envelope');
        dumpXMLResponse(request.soapCall.envelope);
        dl('soap response envelope');
        dumpXMLResponse(request.soapResponse.envelope);
      }
    } catch (e) {dl("xml not shown due to errorA: " + e);}}
    /**/
    if (aEvent == 'StopMachine')
    {
      gStopMachineError = (result != Cr.NS_OK);
      gCompletionResult = result;
      gCompletionData = aData;
      gCompletionItem = aItem;
      if (this._callDriver) async_driver();
    }

    if (aEvent == 'UnpersistedIdWarning')
    {
      Assert.ok(false);
    }

    if (aEvent == 'StatementComplete')
    {
      gCompletionResult = result;
      gCompletionData = aData;
      gCompletionItem = aItem;
      if (this._callDriver) async_driver();
    }

    if (aEvent == 'NewCopiedItems')
    {
      gOldItemIds = aItem.QueryInterface(Ci.msqIStringArray).wrappedJSObject;
      gNewItems = aData.QueryInterface(Ci.nsIArray);
    }

    if (aEvent == 'StatementError')
    {
      throw "Error from datastorage";
      Assert.ok(false);
    }

    if (aEvent == "DatastoreClose")
      if (this._callDriver) async_driver();

    if (aEvent == "StopGetBody")
    {
      gStopGetBodyError = (result != Cr.NS_OK);
      if (gEndWithBody)
        if (this._callDriver) async_driver();
    }

    if (aEvent == 'MachineError')
    {
      gMachineError = true;
      let responseCodePrimitive = aData.QueryInterface(Ci.nsISupportsString);
      dl('response code is ' + responseCodePrimitive.data); // should not throw
      if (!gExpectMachineError)
        Assert.ok(false);
    }

    // This is a generic stop that is not just a machine operation
    if (aEvent == "StopOperation")
      if (this._callDriver) async_driver();

    if (aEvent == 'SoapResponseError')
    {
      let errorString = '';
      if (safeInstanceOf(aData, Ci.msqIStringArray))
      { aData = aData.wrappedJSObject;
        try {
        dump("SoapResponseError responseError: " + aData.getAt(0) +
              " responseCode: " + aData.getAt(1) +
              " messageText: " + aData.getAt(2) + "\n");
      } catch (e) {dump(e + "\n");}}
      gMachineError = true;
      if (!gExpectMachineError)
        Assert.ok(false);
    }

  }
}
var gEwsEventListener = new ErrorEventListener(true);

// Calendar
// statement results
let gEwsCalendar = null;
let gCalendarItems = [];

function createEventFromIcalString(icalString) {
    if (/^BEGIN:VCALENDAR/.test(icalString)) {
        var parser = Components.classes["@mozilla.org/calendar/ics-parser;1"]
                               .createInstance(Components.interfaces.calIIcsParser);
        parser.parseString(icalString);
        var items = parser.getItems({});
        return items[0];
    } else {
        var event = Cc["@mozilla.org/calendar/event;1"].createInstance(Ci.calIEvent);
        event.icalString = icalString;
    }
    return event;
}

// todo: only use skink function here
function *testClearCalendar()
{
  let ids = new StringArray();
  for (let item of gCalendarItems)
    ids.append(item.getProperty('X-EXQUILLA-BASEID'));
  if (ids.length)
  {
    gNativeMailbox.deleteItems(ids, false, gEwsEventListener);
    yield false;
  }
  //gCalendarItems = [];
}

function *testClearCalendarSkink()
{
  gEwsCalendar.addObserver(gCalIObserver);
  dl('testClearCalendarSkink length is ' + gCalendarItems.length);
  let items = [];
  for (let item of gCalendarItems)
  {
    //dl('delete item with icalString ' + item.icalString);
    items.push(item);
  }
  for (let item of items)
  {
    dl('testClearCalendarSkink item is ' + item);
    gEwsCalendar.deleteItem(item, gCalIOperationListener);
    yield false;
  }

  gEwsCalendar.removeObserver(gCalIObserver);
}

function *testClearCalendarNative()
{
  let ids = new StringArray();
  for (let item of gCalendarItems)
    ids.append(item.getProperty('X-EXQUILLA-BASEID'));
  if (ids.length)
  {
    gNativeMailbox.deleteItems(ids, false, gEwsEventListener);
    yield false;
  }
  gCalendarItems = [];
}


function* testShutdownCalendar()
{
  gEwsCalendar.wrappedJSObject.shutdownEwsCalendar();
  let tsz = Cc["@mozilla.org/calendar/timezone-service;1"]
              .getService(Ci.calIStartupService)
              .wrappedJSObject;
  if (tsz.mSelectByTzid)
  {
    dl('finalizing timezone service statement');
    tsz.mSelectByTzid.finalize();
  }

  tsz.shutdown({onResult: function _onResult(a, b) {}});
}

//todo: rename uses of testEmpty to testCalendarEmpty
function* testEmpty()
{
  Assert.equal(gCalendarItems.length, 0);
}

function* testCalendarEmpty()
{
  Assert.equal(gCalendarItems.length, 0);
}

/*
interface calIObserver : nsISupports
{
  void onStartBatch();
  void onEndBatch();
  void onLoad( in calICalendar aCalendar );
  void onAddItem( in calIItemBase aItem );
  void onModifyItem( in calIItemBase aNewItem, in calIItemBase aOldItem );
  void onDeleteItem( in calIItemBase aDeletedItem );
  void onError( in calICalendar aCalendar, in nsresult aErrNo, in AUTF8String aMessage );

  /// Called after a property is changed.
  void onPropertyChanged(in calICalendar aCalendar,
                         in AUTF8String aName,
                         in nsIVariant aValue,
                         in nsIVariant aOldValue);

  /// Called before the property is deleted.
  void onPropertyDeleting(in calICalendar aCalendar,
                          in AUTF8String aName);
};
*/

let gCalItem = null;
var gCalIObserver = {
  onStartBatch: function onStartBatch() {dl('onStartBatch');},
  onEndBatch: function onEndBatch() {dl('onEndBatch');},
  onLoad: function onLoad()
  {
    // This may go away due to core issues of multiple redraws, so I may
    //  have to use the other listener methods eventually for async_driver
    dl('onLoad');
    async_driver();
  },

  onAddItem: function onAddItem(aItem)
  {
    if (!gCalItem)
    {
      gCalItem = aItem
    }
    gCalendarItems.push(aItem);
    dl('onAddItem ' + (aItem && aItem.title ? aItem.title : '')
       + '\n' + aItem.id
      );
  },

  onModifyItem: function onModifyItem(aNewItem, aOldItem) {
    dl('onModifyItem');
    this.onDeleteItem(aOldItem);
    this.onAddItem(aNewItem);
    },
  onDeleteItem: function onDeleteItem(aDeletedItem) {
    let index = -1;
    for (let i in gCalendarItems)
    {
      if (gCalendarItems[i].id == aDeletedItem.id)
      {
        index = i;
        break;
      }
    }
    if (index != -1)
      gCalendarItems.splice(index, 1);
    else
    {
      dl('could not find deleted item in gCalendarItems');
      dl('deleted item has id ' + aDeletedItem.id);
      dl('gCalendar item ids:');
      for (let item of gCalendarItems)
      {
        dl(item.id + '\n');
      }
    }
    dl('onDeleteItem');
  },
  onError: function onError() {dl('onError');},
  onPropertyChanged: function onPropertyChanged() {dl('onPropertyChanged');},
  onPropertyDeleting: function onPropertyDeleting() {dl('onPropertyDeleting');},
}

function *testRefreshCalendarItems()
{
  Assert.ok(gEwsCalendar instanceof Ci.calICalendar);
  gEwsCalendar.addObserver(gCalIObserver);
  gEwsCalendar.refresh();
  yield false;

  gEwsCalendar.removeObserver(gCalIObserver);
}
// todo: this is really a refresh, replace calls
var testGetCalendarItems = testRefreshCalendarItems;

function *testGetCalendarItemsSkink()
{
  gCalendarItems = [];
  gEwsCalendar.wrappedJSObject
              .shutdownEwsCalendar();
  gEwsCalendar.getItems(Ci.calICalendar.ITEM_FILTER_TYPE_EVENT,
                        0,
                        createCalDate(2000,1,1),
                        createCalDate(2100,1,1),
                        gCalIOperationListener);
  yield false;
}

function* testCalendarRegistered()
{
  let calendars = cal.getCalendarManager().getCalendars({});
  let found = false;
  for (calendar of calendars)
  {
    dl('calendar type is ' + calendar.type);
    if (calendar.type == 'exquilla')
    {
      found = true;
      gEwsCalendar = calendar;
    }
  }
  Assert.ok(found);

  const calProperties = cal.calGetStringBundle("chrome://calendar/locale/calendar.properties");
  dl('calProperties is ' + calProperties);
  const bundleTZString =
      calProperties.GetStringFromName("likelyTimezone");
  dl('bundleTZString is ' + bundleTZString);
}

// see http://mxr.mozilla.org/comm-central/source/calendar/test/unit/head_consts.js#56
function createCalDate(aYear, aMonth, aDay, aHasTime, aHour, aMinute, aSecond, aTimezone)
{
     var cd = Cc["@mozilla.org/calendar/datetime;1"]
              .createInstance(Ci.calIDateTime);
     cd.resetTo(aYear,
                aMonth,
                aDay,
                aHour || 0,
                aMinute || 0,
                aSecond || 0,
                aTimezone || cal.UTC());
     cd.isDate = !aHasTime;
     return cd;
}

/**
 * Async operations are called back via this interface.  If you know that your
 * object is not going to get called back for either of these methods, having
 * them return NS_ERROR_NOT_IMPLEMENTED is reasonable.
 */
var gCalIOperationListener  =
{
  /**
   * For add, modify, and delete.
   *
   * @param aCalendar       the calICalendar on which the operation took place
   * @param aStatus         status code summarizing what happened
   * @param aOperationType  type of operation that was completed
   * @param aId             UUID of element that was changed
   * @param aDetail         not yet fully specified.  If aStatus is an error
   *                        result, this will probably be an extended error
   *                        string (eg one returned by a server).
   */
  onOperationComplete: function _onOperationComplete(aCalendar,
                           aStatus,
                           aOperationType,
                           aId,
                           aDetail)
  {
    dl('onOperationComplete');
    async_driver();
  },

  /**
   * For getItem and getItems.
   *
   * @param aStatus   status code summarizing what happened.
   * @param aItemType type of interface returned in the array (@see
   *                  calICalendar::GetItems).
   * @param aDetail   not yet fully specified.  If aStatus is an error
   *                  result, this will probably be an extended error
   *                  string (eg one returned by a server).
   * @param aCount    size of array returned, in items
   * @param aItems    array of immutable items
   *
   * Multiple onGetResults might be called
   */
  onGetResult: function _onGetResult(aCalendar,
                    aStatus,
                    aItemType,
                    aDetail,
                    aCount,
                    aItems )
  {
    dl('onGetResult()');
    for (let item of aItems)
    {
      dl('item is ' + item.title);
      gCalendarItems.push(item);
    }
  },
}

// This is used to force acceptance of an SSL certificate
function AcceptCertListener(aUrl, aDeferred)
{
  this.mUrl = aUrl;
  this.deferred = aDeferred;
}

AcceptCertListener.prototype =
{
  get promise() { return this.deferred.promise;},

  sendRequest: function sendRequest()
  {
    dl("Send certificate test request to " + this.mUrl);
    this.mRequest = new XMLHttpRequest(); 
    this.mRequest.addEventListener("load", this, false);
    this.mRequest.addEventListener("error", this, false);
    this.mRequest.addEventListener("abort", this, false);
    this.mRequest.open("GET", this.mUrl, true);

    //this.mRequest.onreadystatechange = this;
    this.mRequest.channel.notificationCallbacks = this;
    this.mRequest.send();
  },

  notifyCertProblem: function(socketInfo, status, targetSite)
  {
    if (status)
    {
      let overrideService = Cc["@mozilla.org/security/certoverride;1"]
                              .getService(Ci.nsICertOverrideService);
      let url = Services.io.newURI("https://" + targetSite);
      overrideService.rememberValidityOverride(url.host, 443, status.serverCert,
        Ci.nsICertOverrideService.ERROR_UNTRUSTED |
          Ci.nsICertOverrideService.ERROR_MISMATCH |
          Ci.nsICertOverrideService.ERROR_TIME,
        false);
      let certDB = Cc["@mozilla.org/security/x509certdb;1"]
                     .getService(Ci.nsIX509CertDB);
      certDB.setCertTrust(status.serverCert,
                          Ci.nsIX509Cert.SERVER_CERT,
                          Ci.nsIX509CertDB.TRUSTED_SSL);
    }
    return true;
  },

  asyncPromptAuth: function _asyncPromptAuth(aChannel, aCallback, aContext, level, authInfo)
  {
    do_timeout(0, function() {
      aCallback.onAuthCancelled(aContext, true)
      });
    return null;
  },

  handleEvent: function handleEvent(event)
  {
    const DONE = 4; // XMLHttpRequest.DONE
    if (this.mRequest.readyState == DONE)
    {
      if (this.deferred)
        this.deferred.resolve();
      else
        async_driver();
    }
  },

  getInterface: function _getInterface(iid)
  {
    /*
    let ifaceName = "";
    for (iface in Ci)
    {
      if (iid.equals(Ci[iface]))
      {
        ifaceName = iface;
        break;
      }
    }
    dl('getInterface ' + ifaceName);
    */

    return this.QueryInterface(iid);
  },

  // nsISupports
  QueryInterface: function(iid) {
    if (!iid.equals(Ci.nsIBadCertListener2) &&
        !iid.equals(Ci.nsIDOMEventListener) &&
        !iid.equals(Ci.nsIInterfaceRequestor) &&
        !iid.equals(Ci.nsIAuthPrompt2) &&
        !iid.equals(Ci.nsISupports))
      throw Components.results.NS_ERROR_NO_INTERFACE;
    return this;
  },
};

/*
 * Get the full message content.
 *
 * aMsgHdr: nsIMsgDBHdr object whose text body will be read
 *          returns: string with full message contents
 */
function getContentFromMessage(aMsgHdr) {
  const MAX_MESSAGE_LENGTH = 65536;
  let msgFolder = aMsgHdr.folder;
  let msgUri = msgFolder.getUriForMsg(aMsgHdr);

  let messenger = Cc["@mozilla.org/messenger;1"]
                    .createInstance(Ci.nsIMessenger);
  let streamListener = Cc["@mozilla.org/network/sync-stream-listener;1"]
                         .createInstance(Ci.nsISyncStreamListener);
/*
  nsIURI streamMessage(in string aMessageURI, in nsISupports aConsumer,
                    in nsIMsgWindow aMsgWindow,
                    in nsIUrlListener aUrlListener,
                    in boolean aConvertData,
                    in ACString aAdditionalHeader,
                    [optional] in boolean aLocalOnly);

*/
  messenger.messageServiceFromURI(msgUri).streamMessage(msgUri,
                                                        streamListener,
                                                        null,
                                                        null,
                                                        false,
                                                        "all",
                                                        false);

  let converterInputStream = Cc["@mozilla.org/intl/converter-input-stream;1"]
                               .createInstance(Ci.nsIConverterInputStream);
  converterInputStream.init(streamListener.inputStream, 'UTF-8', 0, 0);
  let stringObject = {};
  converterInputStream.readString(-1, stringObject);
  return stringObject.value;
}

function *testSetupTestFolder() {

  // make sure _test_ exists
  let rootNativeFolder = gNativeMailbox.getNativeFolder("msgfolderroot");
  let testNativeFolderBase = rootNativeFolder.getSubfolderNamed('_test_');

  if (!testNativeFolderBase)
  {
    testNativeFolderBase = gNativeMailbox.getNativeFolder();
    testNativeFolderBase.folderClass = "IPF.Note";
    testNativeFolderBase.displayName = "_test_";
    gNativeMailbox.createSubfolder(rootNativeFolder, testNativeFolderBase, gEwsEventListener);
    yield false;
  }

  // Now delete and recreate a folder using the hostname
  // does this folder also exist in deleted items? If so need to delete.
  let deletedItemsFolder = gNativeMailbox.getNativeFolder("deleteditems");
  let deletedTestFolder = deletedItemsFolder.getSubfolderNamed(gHostname);

  if (deletedTestFolder)
  {
    let folderIds = new StringArray();
    folderIds.append(deletedTestFolder.folderId);
    // using machine
    /**/
    gNativeMailbox.deleteSubfolders(folderIds, gEwsEventListener, false);
    yield false;
  }

  // try to locate folder
  gTestNativeFolderHost = testNativeFolderBase.getSubfolderNamed(gHostname);

  // delete it if found then recreate.
  if (gTestNativeFolderHost)
  {
    // delete the test folder subfolders (not necessary, but otherwise
    //   we can have a long wait from the server)
    let ids = gTestNativeFolderHost.subfolderIds;
    let folderIds = new StringArray();
    let length = ids.length;

    let jsIds = [];
    for (let i = 0; i < length; i++)
      jsIds.push(ids.getAt(i));

    for (let i = 0; i <= jsIds.length; i++) { // the last call deletes the parent
      folderIds.clear();
      if (i < length)
        folderIds.append(jsIds[i]);
      else
        folderIds.append(gTestNativeFolderHost.folderId);
      gNativeMailbox.deleteSubfolders(folderIds, gEwsEventListener, false);
      yield false;
    }
  }

  // recreate the host folder
  gTestNativeFolderHost = gNativeMailbox.getNativeFolder();
  gTestNativeFolderHost.folderClass = "IPF.Note";
  gTestNativeFolderHost.displayName = gHostname;
  gNativeMailbox.createSubfolder(testNativeFolderBase, gTestNativeFolderHost, gEwsEventListener);
  yield false;

// recreate the test folders
  for (let i = 1; i <= 2; i++)
  {
    let testNativeFolder = gNativeMailbox.getNativeFolder();
    testNativeFolder.folderClass = "IPF.Note";
    testNativeFolder.displayName = "test" + i;
    gNativeMailbox.createSubfolder(gTestNativeFolderHost, testNativeFolder, gEwsEventListener);
    yield false;
  }

  gTest1NativeFolder = gTestNativeFolderHost.getSubfolderNamed("test1");
  // for backwards compatibility;
  gTestNativeFolder = gTest1NativeFolder;
  gTest2NativeFolder = gTestNativeFolderHost.getSubfolderNamed("test2");
  ewsLog.debug("gTest2NativeFolder.folderId is " + gTest2NativeFolder.folderId);

  // Now make sure that the server sees all of the folders
  if (gEwsIncomingServer) // used testSetupEwsServer
  {
    gExqIncomingServer.reconcileFolders();
    let ewsTestFolderBase = gEwsIncomingServer.rootFolder.getChildNamed("_test_");
    gTestEwsFolderHost = ewsTestFolderBase.getChildNamed(gHostname);

    gTest1EwsMailFolder = gTestEwsFolderHost.getChildNamed('test1');
    gTestEwsMailFolder = gTest1EwsMailFolder;
    gTest1ExqMailFolder = safeGetInterface(gTest1EwsMailFolder, Ci.msqIEwsMailFolder);
    gTest2EwsMailFolder = gTestEwsFolderHost.getChildNamed('test2');
    gTest2ExqMailFolder = safeGetInterface(gTest2EwsMailFolder, Ci.msqIEwsMailFolder);
    Assert.ok(safeInstanceOf(gTest1ExqMailFolder, Ci.msqIEwsMailFolder));
    Assert.ok(safeInstanceOf(gTest2ExqMailFolder, Ci.msqIEwsMailFolder));
  }
}

function *testCreateItemWithAttachment() {

  // use mailbox commands to add a message to the test folder
  let itemToSend = gNativeMailbox.createItem(null, "IPM.Note", gTest1NativeFolder);
  itemToSend.properties = oPL(testFolderMessage);

  let attachment = itemToSend.addAttachment("");
  /* compose does this
    let nativeAttachment = this._item.addAttachment("");
    nativeAttachment.fileURL = attachment.url;
    nativeAttachment.name = attachment.name;
    nativeAttachment.contentType = attachment.contentType;
    request.createAttachment(response, nativeAttachment);
  */
  let file = do_get_file('data/attachment.txt');
  attachment.fileURL = getFileURL(file);
  attachment.name = file.leafName;
  attachment.contentType = "text/plain";

  dl('new item properties: ' + stringPL(itemToSend.properties));
  gNativeMailbox.saveNewItem(itemToSend, gEwsEventListener);
  yield false;

  dl('created item id is ' + itemToSend.itemId);
  // update folder
  gNativeMailbox.getNewItems(gTestNativeFolder, gEwsEventListener);
  yield false;
}

let gStreamListener = {
  QueryInterface: XPCOMUtils.generateQI([Ci.nsIStreamListener]),

  _str:"",
  // nsIRequestObserver part
  onStartRequest: function (aRequest, aContext) {
  },
  onStopRequest: function (aRequest, aContext, aStatusCode) {
    // check that text attachment contents didn't end up inline.
    async_driver();
  },

  /* okay, our onDataAvailable should actually never be called.  the stream
     converter is actually eating everything except the start and stop
     notification. */
  // nsIStreamListener part
  _stream : null,

  onDataAvailable: function (aRequest,aContext,aInputStream,aOffset,aCount) {
    if (this._stream === null) {
      this._stream = Cc["@mozilla.org/scriptableinputstream;1"].
                    createInstance(Ci.nsIScriptableInputStream);
      this._stream.init(aInputStream);
    }
    this._str += this._stream.read(aCount);
  },
};

function getContentFromMessageAsync(aMsgHdr)
{
  // usage:
  // getContentFromMessageAsync(msgHdr);
  // yield false;
  //let theBody = gStreamListener._str;
  let msgFolder = aMsgHdr.folder;
  let msgUri = msgFolder.getUriForMsg(aMsgHdr);

  let messenger = Cc["@mozilla.org/messenger;1"]
                    .createInstance(Ci.nsIMessenger);
/*
  nsIURI streamMessage(in string aMessageURI, in nsISupports aConsumer,
                    in nsIMsgWindow aMsgWindow,
                    in nsIUrlListener aUrlListener,
                    in boolean aConvertData,
                    in ACString aAdditionalHeader,
                    [optional] in boolean aLocalOnly);

*/
  messenger.messageServiceFromURI(msgUri).streamMessage(msgUri,
                                                        gStreamListener,
                                                        null,
                                                        null,
                                                        false,
                                                        "all",
                                                        false);
}

function responseListener()
{
  let listener = new PromiseUtils.SoapResponse(
    {
      QueryInterface: XPCOMUtils.generateQI([Ci.msqIEwsEventListener]),

      onEvent: function onEvent(aItem, aEvent, aData, aResult) {
        if (aEvent == "StartRequest")
        {
          dl('onStartRequest');
          if (this.showCall && aItem instanceof Ci.msqIEwsSoapRequest)
            dumpXMLResponse(aItem.call.envelope);
        }
        else if (aEvent == "StopRequest")
        {
          dl('onStopRequest status is ' + aResult);
          if (aResult != Cr.NS_OK)
            gRequestError = true;
          if (this.showResponse && aItem instanceof Ci.msqIEwsSoapRequest)
            dumpXMLResponse(aItem.soapResponse.envelope);
        }
        else if (aEvent == "SoapErrorResponse" && safeInstanceOf(aData, Ci.msqIStringArray))
        {
          aData = aData.wrappedJSObject;
          dl('onSoapErrorResponse error ' + aData.getAt(0) +
              " code " + aData.getAt(1) +
              "\nmessage " + aData.getAt(2) + "\n");
        }
      },
    });
  listener.showResponse = false;
  listener.showCall = false;
  return listener;
}

var gTestEwsEventListener = new ErrorEventListener(false);
function machineListener()
{
  return new PromiseUtils.MachineListener(gTestEwsEventListener.onEvent);
}

function* taskSetupServer() {

  // make sure that the test server certificate is trusted
  let listener = new AcceptCertListener(account.ewsURL, Moz.PromiseUtils.defer());
  listener.sendRequest();
  yield listener.promise;

  gNativeMailbox = gNativeService.getNativeMailbox('exquilla://' + account.username + "@" + account.hostname);
  gNativeMailbox.isOnline = true;

  gNativeInbox = gNativeMailbox.getNativeFolder('inbox');

  gNativeMailbox.username = account.username;
  gNativeMailbox.password = account.password;
  gNativeMailbox.ewsURL = account.ewsURL;
  let dirService = Cc["@mozilla.org/file/directory_service;1"].
                     getService(Ci.nsIProperties);
  var datastoreDirectory = dirService.get("ProfD", Ci.nsIFile);
  gNativeMailbox.datastoreDirectory = datastoreDirectory;

  // setup logging
  let logFile = dirService.get("ProfD", Ci.nsIFile);
  logFile.append("soapLog.log");
  gNativeMailbox.soapLogFile = logFile;

  // discover subfolders
  listener = machineListener();
  gNativeMailbox.discoverFolders(listener);
  yield listener.promise;
}

function* taskSetupNative() {
  // make sure that the test server certificate is trusted
  let listener = new AcceptCertListener(account.ewsURL, Moz.PromiseUtils.defer());
  listener.sendRequest();
  yield listener.promise;

  gNativeMailbox = gNativeService.getNativeMailbox('exquilla://' + account.username + "@" + account.hostname);
  gNativeMailbox.isOnline = true;

  gNativeInbox = gNativeMailbox.getNativeFolder('inbox');

  gNativeMailbox.username = account.username;
  gNativeMailbox.password = account.password;
  gNativeMailbox.ewsURL = account.ewsURL;
  let dirService = Cc["@mozilla.org/file/directory_service;1"].
                     getService(Ci.nsIProperties);
  var datastoreDirectory = dirService.get("ProfD", Ci.nsIFile);
  gNativeMailbox.datastoreDirectory = datastoreDirectory;

  // setup logging
  let logFile = dirService.get("ProfD", Ci.nsIFile);
  logFile.append("soapLog.log");
  gNativeMailbox.soapLogFile = logFile;

  // get the root folder
  gNativeMailbox.needOnlineCheck = true;
  Assert.ok(gNativeMailbox.needOnlineCheck);
  let result = yield PromiseUtils.promiseSoapCall(
    gNativeMailbox, eventListener, "getOnline");

  // print results
  Assert.ok(gNativeMailbox.isOnline);
  Assert.equal(result.status, Cr.NS_OK);
}

function* taskSetupEwsServer() {

  // make sure that the test server certificate is trusted
  let listener = new AcceptCertListener(account.ewsURL, Moz.PromiseUtils.defer());
  listener.sendRequest();
  yield listener.promise;

  Assert.ok(typeof gEwsIncomingServer == 'undefined');

  {
    let acctMgr = Cc["@mozilla.org/messenger/account-manager;1"]
                    .getService(Ci.nsIMsgAccountManager);

    let incoming = acctMgr.createIncomingServer(account.username, account.hostname, "exquilla");

    let exqIncoming = safeGetJS(incoming);
    incoming.hostName = account.hostname;
    incoming.username = account.username;
    incoming.password = account.password;
    exqIncoming.ewsURL = account.ewsURL;
    incoming.setBoolValue("useAB", true);
    incoming.setBoolValue("useCalendar", true);
    incoming.setBoolValue("useMail", true);
    gEwsIncomingServer = incoming;
    gExqIncomingServer = exqIncoming;
    gNativeMailbox = exqIncoming.nativeMailbox;

    let skinkAccount = MailServices.accounts.createAccount();
    skinkAccount.incomingServer = incoming;
    skinkAccount.addIdentity(MailServices.accounts.createIdentity());
    dl("defaultIdentity is " + skinkAccount.defaultIdentity);
    skinkAccount.defaultIdentity.email = account.emailaddress;

  }
  Assert.ok(safeInstanceOf(gExqIncomingServer, Ci.msqIEwsIncomingServer));
  Assert.ok(gEwsIncomingServer instanceof Ci.nsIMsgIncomingServer);
  Assert.ok(gNativeMailbox instanceof Ci.msqIEwsNativeMailbox);

  // setup logging
  let dirService = Cc["@mozilla.org/file/directory_service;1"].
                     getService(Ci.nsIProperties);
  let logFile = dirService.get("ProfD", Ci.nsIFile);
  logFile.append("soapLog.log");
  gNativeMailbox.soapLogFile = logFile;
  gEwsIncomingServer.setBoolValue("logEws", true);

  let urlListener = new PromiseUtils.UrlListener();
  gExqIncomingServer.performExpandAsync(null, urlListener);
  let expandResult = yield urlListener.promise;
  Assert.equal(expandResult, Cr.NS_OK);

  let ewsEventListener = new PromiseUtils.EwsEventListener("StopOperation");
  EwsAbService.loadEwsServers(ewsEventListener);
  let abLoadResult = yield ewsEventListener.promise;
  Assert.equal(abLoadResult.status, Cr.NS_OK);

  gEwsMailInbox = gEwsIncomingServer.rootFolder
                                    .getFolderWithFlags(Ci.nsMsgFolderFlags.Inbox);
  dl("gEwsMailInbox is " + gEwsMailInbox);
  gExqMailInbox = safeGetInterface(gEwsMailInbox, Ci.msqIEwsMailFolder);
  dl("gExqMailInbox is " + gExqMailInbox);
  gNativeInbox = gExqIncomingServer.getNativeFolder(gExqMailInbox);
  dl("gNativeInbox is " + gNativeInbox);
  Assert.ok(safeInstanceOf(gNativeInbox, Ci.msqIEwsNativeFolder));
  Assert.equal(gNativeInbox.distinguishedFolderId, 'inbox');
}

function* taskSetupTestFolder() {

  // make sure _test_ exists
  let rootNativeFolder = gNativeMailbox.getNativeFolder("msgfolderroot");
  let testNativeFolderBase = rootNativeFolder.getSubfolderNamed('_test_');

  if (!testNativeFolderBase)
  {
    testNativeFolderBase = gNativeMailbox.getNativeFolder();
    testNativeFolderBase.folderClass = "IPF.Note";
    testNativeFolderBase.displayName = "_test_";
    let listener = machineListener();
    gNativeMailbox.createSubfolder(rootNativeFolder, testNativeFolderBase, listener);
    yield listener.promise;
  }

  // Now delete and recreate a folder using the hostname
  // does this folder also exist in deleted items? If so need to delete.
  let deletedItemsFolder = gNativeMailbox.getNativeFolder("deleteditems");
  let deletedTestFolder = deletedItemsFolder.getSubfolderNamed(gHostname);

  if (deletedTestFolder)
  {
    let folderIds = new StringArray();
    folderIds.append(deletedTestFolder.folderId);
    // using machine
    /**/
    let listener = machineListener();
    gNativeMailbox.deleteSubfolders(folderIds, listener, false);
    yield listener.promise;
  }

  // try to locate folder
  gTestNativeFolderHost = testNativeFolderBase.getSubfolderNamed(gHostname);

  // delete it if found then recreate.
  if (gTestNativeFolderHost)
  {
    // delete the test folder subfolders (not necessary, but otherwise
    //   we can have a long wait from the server)
    let ids = gTestNativeFolderHost.subfolderIds;
    let folderIds = new StringArray();
    let length = ids.length;

    let jsIds = [];
    for (let i = 0; i < length; i++)
      jsIds.push(ids.getAt(i));

    for (let i = 0; i <= jsIds.length; i++) { // the last call deletes the parent
      folderIds.clear();
      if (i < length)
        folderIds.append(jsIds[i]);
      else
        folderIds.append(gTestNativeFolderHost.folderId);
      let listener = machineListener();
      gNativeMailbox.deleteSubfolders(folderIds, listener, false);
      yield listener.promise;
    }
  }

  // also delete local skink folders
  if (gEwsIncomingServer) // used testSetupEwsServer
  {
    let ewsTestFolderBase = gEwsIncomingServer.rootFolder.getChildNamed("_test_");
    let testEwsFolderHost = ewsTestFolderBase.containsChildNamed(gHostname) ?
                              ewsTestFolderBase.getChildNamed(gHostname):
                              null;
    if (testEwsFolderHost) {
      ewsLog.info("Found existing skink folder for test host, deleting");
      ewsTestFolderBase.propagateDelete(testEwsFolderHost, true, null);
    }
    else
      ewsLog.info("did not find skink folder for host");
  }

  // recreate the host folder
  gTestNativeFolderHost = gNativeMailbox.getNativeFolder();
  gTestNativeFolderHost.folderClass = "IPF.Note";
  gTestNativeFolderHost.displayName = gHostname;
  let listener1 = machineListener();
  gNativeMailbox.createSubfolder(testNativeFolderBase, gTestNativeFolderHost, listener1);
  yield listener1.promise;

  // recreate the test folders
  for (let i = 1; i <= 2; i++)
  {
    let testNativeFolder = gNativeMailbox.getNativeFolder();
    testNativeFolder.folderClass = "IPF.Note";
    testNativeFolder.displayName = "test" + i;
    let listener = machineListener();
    gNativeMailbox.createSubfolder(gTestNativeFolderHost, testNativeFolder, listener);
    yield listener.promise;
  }

  gTest1NativeFolder = gTestNativeFolderHost.getSubfolderNamed("test1");
  // for backwards compatibility;
  gTestNativeFolder = gTest1NativeFolder;
  gTest2NativeFolder = gTestNativeFolderHost.getSubfolderNamed("test2");

  // Now make sure that the server sees all of the folders
  if (gEwsIncomingServer) // used testSetupEwsServer
  {
    safeGetInterface(gEwsIncomingServer, Ci.msqIEwsIncomingServer).reconcileFolders();
    let ewsTestFolderBase = gEwsIncomingServer.rootFolder.getChildNamed("_test_");
    gTestEwsFolderHost = ewsTestFolderBase.getChildNamed(gHostname);

    gTest1EwsMailFolder = gTestEwsFolderHost.getChildNamed('test1');
    gTestEwsMailFolder = gTest1EwsMailFolder;
    gTest2EwsMailFolder = gTestEwsFolderHost.getChildNamed('test2');
    gTest1ExqMailFolder = safeGetInterface(gTest1EwsMailFolder, Ci.msqIEwsMailFolder);
    gTest2ExqMailFolder = safeGetInterface(gTest2EwsMailFolder, Ci.msqIEwsMailFolder);
    Assert.ok(safeInstanceOf(gTest1ExqMailFolder, Ci.msqIEwsMailFolder));
    Assert.ok(safeInstanceOf(gTest2ExqMailFolder, Ci.msqIEwsMailFolder));
  }

  // Delete then recreate a local host-named folder
  let localRoot = localAccountUtils.rootFolder.QueryInterface(Ci.nsIMsgFolder);
  if (localRoot.containsChildNamed(gHostname)) {
    localRoot.getChildNamed(gHostname).recursiveDelete(true, null);
  }
  localRoot.createSubfolder(gHostname, null);
  gTestLocalFolderHost = localRoot.getChildNamed(gHostname);
  Assert.ok(gTestLocalFolderHost);
}

// the native folder for contacts test
var gTestNativeContactsHost;
let gDirectory; // the test ab directory

function* taskSetupTestContactFolder() {

  // Now delete and recreate a folder using the hostname
  // does this folder also exist in deleted items? If so need to delete.
  let deletedItemsFolder = gNativeMailbox.getNativeFolder("deleteditems");
  let deletedTestFolder = deletedItemsFolder.getSubfolderNamed(gHostname);
  let contactsNativeFolder = gNativeMailbox.getNativeFolder("contacts");

  if (deletedTestFolder)
  {
    let folderIds = new StringArray();
    folderIds.append(deletedTestFolder.folderId);
    let listener = machineListener();
    gNativeMailbox.deleteSubfolders(folderIds, listener, false);
    yield listener.promise;
  }

  // try to locate folder
  {
    let listener = machineListener();
    gNativeMailbox.discoverSubfolders(contactsNativeFolder, listener);
    yield listener.promise;
  }
  gTestNativeContactsHost = contactsNativeFolder.getSubfolderNamed(gHostname);

  // delete it and subfolders if found.
  if (gTestNativeContactsHost)
  {
    // delete the test folder subfolders (not necessary, but otherwise
    //   we can have a long wait from the server)
    let ids = gTestNativeContactsHost.subfolderIds;
    let folderIds = new StringArray();
    for (let i = 0; i < ids.length; i++)
      folderIds.append(ids.getAt(i));
    folderIds.append(gTestNativeContactsHost.folderId);
    let listener = machineListener();
    gNativeMailbox.deleteSubfolders(folderIds, listener, false);
    yield listener.promise;
  }

  /**/
  // recreate the host folder
  gTestNativeContactsHost = gNativeMailbox.getNativeFolder();
  gTestNativeContactsHost.folderClass = "IPF.Contact";
  gTestNativeContactsHost.displayName = gHostname;
  let listener1 = machineListener();
  gNativeMailbox.createSubfolder(contactsNativeFolder, gTestNativeContactsHost, listener1);
  yield listener1.promise;
  /**/
}

function* testAddSkinkDirectory()
{
  // Load the directory as a skink directory
  let ewsService = Cc["@mozilla.org/messenger/messageservice;1?type=exquilla"]
                     .createInstance(Ci.msqIEwsService);
  gDirectory = ewsService.addAbFromNativeContactFolder(gTestNativeContactsHost);
  Assert.ok(gDirectory instanceof Ci.nsIAbDirectory);
  dl("skink URI: " + gDirectory.URI);
}

var eventListener = {
  onEvent: function(aItem, aEvent, aData, result)
  {
    dl("event: " + aEvent);
  }
}

// sets up the test folder using direct requests rather than machine
function* taskSoapSetupTestFolder() {

  let result;

  // discover subfolders
  let rootFolder = gNativeMailbox.getNativeFolder('msgfolderroot');
  let folders = Cc["@mozilla.org/array;1"].createInstance(Ci.nsIMutableArray);
  folders.appendElement(rootFolder, false);
  result = yield PromiseUtils.promiseSoapCall(gNativeMailbox, eventListener,
    "getFolders", folders);
  Assert.equal(result.status, Cr.NS_OK);

  result = yield PromiseUtils.promiseSoapCall(gNativeMailbox, eventListener,
    "discoverSubfolders", rootFolder, 100, 0);
  Assert.equal(result.status, Cr.NS_OK);

  // Create if needed _test_
  let testNativeFolderBase = rootFolder.getSubfolderNamed('_test_');
  if (!testNativeFolderBase) {
    // need to create this folder
    testNativeFolderBase = gNativeMailbox.getNativeFolder();
    testNativeFolderBase.folderClass = "IPF.Note";
    testNativeFolderBase.displayName = "_test_";

    result = yield PromiseUtils.promiseSoapCall(gNativeMailbox, eventListener,
       "createFolder", rootFolder, testNativeFolderBase);
    Assert.equal(result.status, Cr.NS_OK);

    Assert.ok(testNativeFolderBase.folderId.length > 20);
  }

  gHostNativeFolder = testNativeFolderBase.getSubfolderNamed(gHostname);
  if (!gHostNativeFolder) {
    // need to create this folder
    gHostNativeFolder = gNativeMailbox.getNativeFolder();
    gHostNativeFolder.folderClass = "IPF.Note";
    gHostNativeFolder.displayName = gHostname;

    result = yield PromiseUtils.promiseSoapCall(gNativeMailbox, eventListener,
       "createFolder", testNativeFolderBase, gHostNativeFolder);
    Assert.equal(result.status, Cr.NS_OK);
    Assert.ok(gHostNativeFolder.folderId.length > 20);
  }

  // empty the test folder of items
  let items = Cc["@mozilla.org/array;1"].createInstance(Ci.nsIMutableArray);

  result = yield PromiseUtils.promiseSoapCall(gNativeMailbox, eventListener,
    "syncFolderItemsProperties", gHostNativeFolder, "", items, 100);
  Assert.equal(result.status, Cr.NS_OK);
  dl("host count: " + items.length);

  let itemCount = gHostNativeFolder.totalCount;
  dl('item count is ' + itemCount);

  if (items.length > 0)
  {
    // empty the test folder
    let itemIds = new StringArray();
    for (let i = 0; i < items.length; i++)
      itemIds.append(items.queryElementAt(i, Ci.msqIEwsNativeItem).itemId);

    result = yield PromiseUtils.promiseSoapCall(gNativeMailbox, eventListener,
      "deleteItems", itemIds, false);
    Assert.equal(result.status, Cr.NS_OK);
  }

  // check the folder count
  result = yield PromiseUtils.promiseSoapCall(gNativeMailbox, eventListener,
    "getFolder", gHostNativeFolder);
  Assert.equal(result.status, Cr.NS_OK);
  Assert.equal(gHostNativeFolder.totalCount, 0);
/**/
}

function* taskShutdown() {
  testShutdown();
  //dump("Waiting for promiseFlushLogging\n");
  //yield Utils.promiseFlushLogging();
  //dump("Done with taskShutdown\n");
}

// This may be changed by an individual test
var gTestFolderMessage = testFolderMessage;

function* taskCreateTestItem() {

  // setup notification of folder events
  let MFNService = Cc["@mozilla.org/messenger/msgnotificationservice;1"]
                      .getService(Ci.nsIMsgFolderNotificationService);

  MFNService.addListener(gFolderListener, Ci.nsIMsgFolderNotificationService.msgAdded |
                                          Ci.nsIMsgFolderNotificationService.msgsDeleted);

  let testFolder = gTest1ExqMailFolder;
  let testEwsFolder = gTest1EwsMailFolder;

  // that folder should have a corresponding native folder id
  Assert.ok(safeInstanceOf(testFolder, Ci.msqIEwsMailFolder));
  let testFolderId = testFolder.folderId;
  Assert.ok(testFolderId.length > 20);
  dump("testFolder is " + testFolder + "\n");
  dump("testEwsFolder is " + testEwsFolder + "\n");

  // update folder
  var urlListener = new PromiseUtils.UrlListener();
  testFolder.updateFolderWithListener(null, urlListener);
  yield urlListener.promise;

  // use mailbox commands to add a message to that folder
  var itemToSend = gNativeMailbox.createItem(null, "IPM.Note", gTest1NativeFolder);
  itemToSend.properties = oPL(gTestFolderMessage || testFolderMessage2);

  let request = createSoapRequest(gNativeMailbox);
  let response = new PromiseUtils.SoapResponse();
  request.createItem(response, itemToSend, "SaveOnly");
  request.invoke();
  yield response.promise;

  dl('created item id is ' + itemToSend.itemId);
  gNativeMailbox.datastore.putItem(itemToSend, null);
  // update folder
  var urlListener = new PromiseUtils.UrlListener();
  testFolder.updateFolderWithListener(null, urlListener);
  yield urlListener.promise;

  Assert.ok(testEwsFolder.getTotalMessages(false) > 0);
  //Assert.equal(gMsgAddedCount, 1);
  MFNService.removeListener(gFolderListener);

}

function* taskCreateItemWithAttachment() {

  // use mailbox commands to add a message to the test folder
  let itemToSend = gNativeMailbox.createItem(null, "IPM.Note", gTest1NativeFolder);
  itemToSend.properties = oPL(testFolderMessage);

  let attachment = itemToSend.addAttachment("");
  /* compose does this
    let nativeAttachment = this._item.addAttachment("");
    nativeAttachment.fileURL = attachment.url;
    nativeAttachment.name = attachment.name;
    nativeAttachment.contentType = attachment.contentType;
    request.createAttachment(response, nativeAttachment);
  */
  let file = do_get_file('data/attachment.txt');
  attachment.fileURL = getFileURL(file);
  attachment.name = file.leafName;
  attachment.contentType = "text/plain";
  let attachments = Cc["@mozilla.org/array;1"].createInstance(Ci.nsIMutableArray);
  attachments.appendElement(attachment, false);

  dl('new item properties: ' + stringPL(itemToSend.properties));
  let listener = machineListener();
  gNativeMailbox.saveNewItem(itemToSend, listener);
  yield listener.promise;

  dl('created item id is ' + itemToSend.itemId);
  // update folder
  listener = machineListener();
  gNativeMailbox.getNewItems(gTestNativeFolder, listener);
  yield listener.promise;
}


var gTestContactsFolder;
// sets up the test folder using direct requests rather than machine
function* taskSoapSetupTestContactsFolder() {

  let result;

  // link distinguishedFolderId of contacts
  let testNativeFolderBase = gNativeMailbox.getNativeFolder('contacts');
  result = yield PromiseUtils.promiseSoapCall(gNativeMailbox, eventListener,
    "getFolder", testNativeFolderBase);
  Assert.equal(result.status, Cr.NS_OK);

  // discover subfolders
  let rootFolder = gNativeMailbox.getNativeFolder('msgfolderroot');
  let folders = Cc["@mozilla.org/array;1"].createInstance(Ci.nsIMutableArray);
  folders.appendElement(rootFolder, false);
  result = yield PromiseUtils.promiseSoapCall(gNativeMailbox, eventListener,
    "getFolders", folders);
  Assert.equal(result.status, Cr.NS_OK);

  result = yield PromiseUtils.promiseSoapCall(gNativeMailbox, eventListener,
    "discoverSubfolders", rootFolder, 100, 0);
  Assert.equal(result.status, Cr.NS_OK);

  // create if needed hostname folder
  gTestContactsFolder = testNativeFolderBase.getSubfolderNamed(gHostname);
  if (!gTestContactsFolder) {
    // need to create this folder
    gTestContactsFolder = gNativeMailbox.getNativeFolder();
    gTestContactsFolder.folderClass = "IPF.Contact";
    gTestContactsFolder.displayName = gHostname;

    result = yield PromiseUtils.promiseSoapCall(gNativeMailbox, eventListener,
       "createFolder", testNativeFolderBase, gTestContactsFolder);
    Assert.equal(result.status, Cr.NS_OK);
    Assert.ok(gTestContactsFolder.folderId.length > 20);
  }

  // empty the test folder of items
  let items = Cc["@mozilla.org/array;1"].createInstance(Ci.nsIMutableArray);

  result = yield PromiseUtils.promiseSoapCall(gNativeMailbox, eventListener,
    "syncFolderItemsProperties", gTestContactsFolder, "", items, 100);
  Assert.equal(result.status, Cr.NS_OK);
  dl("host count: " + items.length);

  let itemCount = gTestContactsFolder.totalCount;
  dl('item count is ' + itemCount);

  if (items.length > 0)
  {
    // empty the test folder
    let itemIds = new StringArray();
    for (let i = 0; i < items.length; i++)
      itemIds.append(items.queryElementAt(i, Ci.msqIEwsNativeItem).itemId);

    result = yield PromiseUtils.promiseSoapCall(gNativeMailbox, eventListener,
      "deleteItems", itemIds, false);
    Assert.equal(result.status, Cr.NS_OK);
  }

  // check the folder count
  result = yield PromiseUtils.promiseSoapCall(gNativeMailbox, eventListener,
    "getFolder", gTestContactsFolder);
  Assert.equal(result.status, Cr.NS_OK);
  Assert.equal(gTestContactsFolder.totalCount, 0);
/**/
}
