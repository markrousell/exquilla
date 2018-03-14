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

let promiseSoapCall = PromiseUtils.promiseSoapCall;

load('utilities.js');
load('soapRequestUtils.js');

function dl(a) { dump(a + "\n");}

// aListener is msqIEwsEventListener
function PromiseSoapResponse(aListener) {
  PromiseUtils.SoapResponse.call(this, aListener);
  this.passwordChanged = false;
}

const sentMessage =
'<env:Envelope xmlns:env="http://schemas.xmlsoap.org/soap/envelope/" xmlns:enc="http://schemas.xmlsoap.org/soap/encoding/" xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><env:Header><RequestServerVersion xmlns="http://schemas.microsoft.com/exchange/services/2006/types" Version="Exchange2010_SP1"/></env:Header><env:Body><GetFolder xmlns="http://schemas.microsoft.com/exchange/services/2006/messages"><FolderShape><BaseShape xmlns="http://schemas.microsoft.com/exchange/services/2006/types">IdOnly</BaseShape></FolderShape><FolderIds><DistinguishedFolderId xmlns="http://schemas.microsoft.com/exchange/services/2006/types" Id="msgfolderroot"/></FolderIds></GetFolder></env:Body></env:Envelope>'

// global constants to interact with the request and response
let gResponseCode = "";

PromiseSoapResponse.prototype = {
  __proto__: PromiseUtils.SoapResponse.prototype,

  errorResponse:function(aRequest, aContext, aResponseError, aResponseCode, aMessageText)
  {
    dl("Soap request error: " + aResponseError + " responseCode:" + aResponseCode + " aMessageText: <" + aMessageText + ">");
    gResponseCode = aResponseCode;
  },
}

var eventListener = {
  onEvent: function(aItem, aEvent, aData, result)
  {
    dl("event: " + aEvent);
    if (aEvent == "SoapResponseError") {
      let responseStrings = aData.QueryInterface(Ci.msqIStringArray).wrappedJSObject;
      gResponseCode = responseStrings.getAt(1);
    }
  }
}

// merged into taskSetupNative
/*
function* ptestCheckOnline()
{
  gNativeMailbox.needOnlineCheck = true;
  Assert.ok(gNativeMailbox.needOnlineCheck);
  let result = yield promiseSoapCall(
    gNativeMailbox, eventListener, "getOnline");

  // print results
  Assert.ok(gNativeMailbox.isOnline);
  Assert.equal(result.status, Cr.NS_OK);

}
*/

// check that errors get handled
function* ptestCheckErrors()
{
  gNativeMailbox.needOnlineCheck = true;

  // set offline
  Services.io.offline = true;
  let result1 = yield promiseSoapCall(
    gNativeMailbox, eventListener, "getOnline");
  Assert.equal(gResponseCode, "Offline");
  Services.io.offline = false;

  // set url to non-existent server
  let saveURL = gNativeMailbox.ewsURL;
  gNativeMailbox.ewsURL = "https://invalid.example.com/EWS/";
  let result2 = yield promiseSoapCall(
    gNativeMailbox, eventListener, "getOnline");
  Assert.equal(gResponseCode, "HtmlStatus0");

  // set url to invalid path
  gNativeMailbox.ewsURL = "https://mozilla.org/invalid";
  let result3 = yield promiseSoapCall(
    gNativeMailbox, eventListener, "getOnline");
  Assert.equal(gResponseCode, "HtmlStatus404");

  // simulated missing body error
  gNativeMailbox.ewsURL = saveURL;
  PromiseUtils.doError = 1;
  let result4 = yield promiseSoapCall(
    gNativeMailbox, eventListener, "getOnline");
  Assert.equal(gResponseCode, "NullBody");
  PromiseUtils.doError = 0;
}

function* ptestGetFolder()
{
  //var promiseStopMachine = new PromiseUtils.MachineListener();
  //gNativeMailbox.checkOnline(promiseStopMachine);
  //let result = yield promiseStopMachine.promise;
  let folder = gNativeMailbox.getNativeFolder("inbox");
  //let result = yield promiseGetFolder(gNativeMailbox, eventListener, folder);
  let result = yield promiseSoapCall(gNativeMailbox, eventListener,
     "getFolder", folder);
  Assert.equal(result.status, Cr.NS_OK);
  Assert.equal(folder.displayName, "Inbox");
  Assert.equal(folder.folderClass, "IPF.Note");
  Assert.ok(!folder.hidden);
}

function* ptestGetFolders()
{
  let inbox = gNativeMailbox.getNativeFolder("inbox");
  let drafts = gNativeMailbox.getNativeFolder("drafts");
  let contacts = gNativeMailbox.getNativeFolder("contacts");
  let folders = Cc["@mozilla.org/array;1"].createInstance(Ci.nsIMutableArray);
  folders.appendElement(inbox, false);
  folders.appendElement(contacts, false);
  folders.appendElement(drafts, false);
  let result = yield promiseSoapCall(gNativeMailbox, eventListener,
    "getFolders", folders);
  Assert.equal(result.status, Cr.NS_OK);
  Assert.equal(drafts.displayName, "Drafts");
  Assert.equal(drafts.folderClass, "IPF.Note");
  Assert.equal(contacts.displayName, "Contacts");
  Assert.equal(contacts.folderClass, "IPF.Contact");
}

// fake contact
// fake item for test folder
var testContactProperties = oPL(
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


function* ptestCreateContactItem()
{
  // tests the creation of a contact item
  let contactItem = gNativeMailbox.createItem(null, "IPM.Contact",
                      gTestNativeContactFolder);
  contactItem.properties = testContactProperties;
  let result = yield promiseSoapCall(gNativeMailbox, eventListener,
    "createItem", contactItem, "SaveOnly");
}

/*
var gTestNativeContactFolder;

function* taskSetupTestContactFolder() {

  let hostname = Cc["@mozilla.org/network/dns-service;1"]
                   .getService(Ci.nsIDNSService)
                   .myHostName;

  // try to locate folder hostname
  let nativeContactFolder = gNativeMailbox.getNativeFolder('contacts');
  Assert.ok(nativeContactFolder.folderId.length > 20);

  let result3 = yield promiseSoapCall(gNativeMailbox, eventListener,
    "discoverSubfolders", nativeContactFolder, 100, 0);

  let subfolderIds = nativeContactFolder.subfolderIds;
  dump("subfolderIds.length is " + subfolderIds.length + "\n");

  for (let i = 0; i < subfolderIds.length; i++)
  {
    let subfolder = gNativeMailbox.getNativeFolder(subfolderIds.getAt(i));
    dl('subfolder name is ' + subfolder.displayName);
    if (subfolder.displayName == hostname)
    {
      gTestNativeContactFolder = subfolder;
      break;
    }
  }

  if (!gTestNativeContactFolder) {
    // need to create this folder
    gTestNativeContactFolder = gNativeMailbox.getNativeFolder();
    gTestNativeContactFolder.folderClass = "IPF.Contact";
    gTestNativeContactFolder.displayName = hostname;
    let result1 = yield promiseSoapCall(gNativeMailbox, eventListener,
       "createFolder", nativeContactFolder, gTestNativeContactFolder);

    Assert.ok(gTestNativeContactFolder.folderId.length > 20);
  }

  let items = Cc["@mozilla.org/array;1"].createInstance(Ci.nsIMutableArray);
  let result2 = yield promiseSoapCall(gNativeMailbox, eventListener,
    "syncFolderItemsProperties", gTestNativeContactFolder, "", items, 100);
  dl("contact count: " + items.length);

  let itemCount = gTestNativeContactFolder.totalCount;
  dl('item count is ' + itemCount);

  if (itemCount > 0)
  {
    // empty the test folder
    let itemIds = Cc["@mesquilla.com/stringarray;1"].createInstance(Ci.msqIStringArray);
    for (let i = 0; i < itemCount; i++)
      itemIds.append(items.queryElementAt(i, Ci.msqIEwsNativeItem).itemId);

    let result = yield promiseSoapCall(gNativeMailbox, eventListener,
      "deleteItems", itemIds, false);
  }

  // check the folder count
  let result5 = yield promiseSoapCall(gNativeMailbox, eventListener,
    "getFolder", gTestNativeContactFolder);

  Assert.equal(gTestNativeContactFolder.totalCount, 0);
}
*/

var tests = [
  taskSetupNative,
  ptestCheckErrors,
  ptestGetFolder,
  ptestGetFolders,
  taskSetupTestContactFolder,
  ptestCreateContactItem,
  taskShutdown,
];

function run_test()
{
  tests.forEach(x => add_task(x));
  run_next_test();
}
