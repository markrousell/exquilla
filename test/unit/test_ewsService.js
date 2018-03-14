/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is MesQuilla code.
 *
 * The Initial Developer of the Original Code is
 * Kent James <kent@caspia.com>.
 * Portions created by the Initial Developer are Copyright (C) 2010
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */
 
 // This tests EwsService
Cu.import("resource://exquilla/ewsUtils.jsm");
load('soapRequestUtils.js');
load('utilities.js');

let tests = [
  testBase,
  taskSetupEwsServer,
  taskSetupTestFolder,
  taskCreateTestItem,
  testStreams,
  taskSetupTestContactFolder,
  testAddAbFromNativeContactFolder,
  taskShutdown
];

function run_test()
{
  tests.forEach(x => add_task(x));
  run_next_test();
}

function* testBase()
{
  // test of utility functions
  let parseMessageURI = Utils.parseMessageURI;
  let parseTests = [
     ["exquilla-message://example.com#123?header=valid", "exquilla://example.com", 123, "header=valid"],
     // non-message
     ["exquilla://example.com/path?number=234&header=valid&aa=bb", "exquilla://example.com/path", 234, "number=234&header=valid&aa=bb"],
     // no query
     ["exquilla-message://invalid.xx#14159", "exquilla://invalid.xx", 14159, ""]
                   ];

  for (let parseTest of parseTests) {
    let [folderURI, key, queryStr] = parseMessageURI(parseTest[0]);
    Assert.equal(folderURI, parseTest[1]);
    Assert.equal(key, parseTest[2]);
    Assert.equal(queryStr, parseTest[3]);
  }

  // nsIMsgProtocolInfo tests
  let ewsService = Cc["@mozilla.org/messenger/messageservice;1?type=exquilla"]
                     .getService(Ci.nsIMsgProtocolInfo);
  let directory = ewsService.defaultLocalPath;
  Assert.equal(directory.leafName, "ExQuilla");
  Assert.ok(ewsService.requiresUsername);
  Assert.ok(ewsService.canDelete);
  Assert.ok(ewsService.canGetMessages);
  Assert.ok(ewsService.canGetIncomingMessages);
  Assert.ok(!ewsService.defaultDoBiff);
  Assert.ok(ewsService.showComposeMsgLink);
  Assert.ok(ewsService.foldersCreatedAsync);

  // nsIMsgMessageService tests

  // test basic query parsing
  let gqv = Utils.getQueryVariable;
  let spec = "exquilla://example.com/folder?header=theheader&fetchEwsMessage=12345";
  Assert.equal(gqv("header", spec), "theheader");
  Assert.equal(gqv("fetchEwsMessage", spec), "12345");
  Assert.ok(gqv("Idonotexist", spec) === null);

  // nsIMsgProtocolHandler tests
  Assert.ok(ewsService instanceof Ci.nsIProtocolHandler);
  Assert.equal(ewsService.defaultPort, 443);
}

function* testStreams()
{
  let listener1 = new PromiseUtils.UrlListener();
  gTest1ExqMailFolder.updateFolderWithListener(null, listener1);
  yield listener1.promise;

  let message = firstMsgHdr(gTestEwsMailFolder);
  let msgUri = gTestEwsMailFolder.getUriForMsg(message);
  dl("testStreams: msuUri is " + msgUri);

  // Test methods created on new and old implementation
  let contractIDs = [
                      "@mozilla.org/messenger/messageservice;1?type=exquilla",
                      //"@mozilla.org/messenger/messageservice;1?type=exquilla2"
                    ]
  for (let contractID of contractIDs) {
    dl("testing service with contractID " + contractID);
    let messageService = Cc[contractID].createInstance(Ci.nsIMsgMessageService);
    Assert.ok(messageService instanceof Ci.nsIMsgProtocolInfo);
    let ewsService = messageService.QueryInterface(Ci.msqIEwsService);

    Assert.equal(ewsService.messages2006, "http://schemas.microsoft.com/exchange/services/2006/messages");
    Assert.equal(ewsService.types2006, "http://schemas.microsoft.com/exchange/services/2006/types");

    {
      let streamListener = Cc["@mozilla.org/network/sync-stream-listener;1"]
                             .createInstance(Ci.nsISyncStreamListener);
      let sis = Cc["@mozilla.org/scriptableinputstream;1"]
                  .createInstance(Ci.nsIScriptableInputStream);
      sis.init(streamListener.inputStream);
      let uriListener = new PromiseUtils.UrlListener();
      
      let uri = messageService.streamMessage(msgUri, streamListener, null,
        uriListener, false, "", false);
      yield uriListener.promise;

      const MAX_MESSAGE_LENGTH = 65536;
      dl("Message is:\n" + sis.read(MAX_MESSAGE_LENGTH));
    }
    // CopyMessage(aSrcURI, aCopyListener, aMoveMessage, aUrlListener, aMsgWindow, uriObject)
    {
      let streamListener = Cc["@mozilla.org/network/sync-stream-listener;1"]
                             .createInstance(Ci.nsISyncStreamListener);
      let sis = Cc["@mozilla.org/scriptableinputstream;1"]
                  .createInstance(Ci.nsIScriptableInputStream);
      sis.init(streamListener.inputStream);
      let uriListener = new PromiseUtils.UrlListener();

      let uriObject = {};
      let uri = messageService.CopyMessage(msgUri, streamListener, false,
        uriListener, null, uriObject);
      yield uriListener.promise;

      const MAX_MESSAGE_LENGTH = 65536;
      dl("Message is:\n" + sis.read(MAX_MESSAGE_LENGTH));
    }
    //   DisplayMessage(aMessageURI, aDisplayConsumer, aMsgWindow, aUrlListener, aCharsetOverride, uriObject)
    {
      let streamListener = Cc["@mozilla.org/network/sync-stream-listener;1"]
                             .createInstance(Ci.nsISyncStreamListener);
      let sis = Cc["@mozilla.org/scriptableinputstream;1"]
                  .createInstance(Ci.nsIScriptableInputStream);
      sis.init(streamListener.inputStream);
      let uriListener = new PromiseUtils.UrlListener();

      let uriObject = {};
      let uri = messageService.DisplayMessage(msgUri, streamListener, null,
        uriListener, null, uriObject);
      dl("Before DisplayMessage promise");
      yield uriListener.promise;
      dl("After DisplayMessage promise");

      const MAX_MESSAGE_LENGTH = 65536;
      dl("Message is:\n" + sis.read(MAX_MESSAGE_LENGTH));
    }
    // SaveMessageToDisk(const char *aMessageURI, nsIFile *aFile, PRBool aGenerateDummyEnvelope,
    //   SaveMessageToDisk(const char *aMessageURI, nsIFile *aFile, PRBool aGenerateDummyEnvelope, nsIUrlListener *aUrlListener,
    //   nsIURI **aURL NS_OUTPARAM, PRBool aCanonicalLineEnding, nsIMsgWindow *aMsgWindow)
    {
      var saveFile = Services.dirsvc.get("TmpD", Ci.nsIFile);
      saveFile.append("exquilla-test.eml");
      saveFile.createUnique(Ci.nsIFile.NORMAL_FILE_TYPE, parseInt("0666", 8));
      let uriObj = {};
      let urlListener = new PromiseUtils.UrlListener();
      messageService.SaveMessageToDisk(msgUri, saveFile, false, urlListener, uriObj, true, null);
      yield urlListener.promise;

      Assert.ok(saveFile.exists());
      let text = nsIFileText(saveFile);
      dl(text);
      saveFile.remove(false);
      Assert.ok(text.indexOf("kenttest") != -1);
      dl("length is " + text.length);
      // length was 457 in test earlier, now 652
      Assert.ok(text.length > 400 && text.length < 800);
    }
    // GetUrlForUri(const char *aMessageURI, nsIURI **aURL NS_OUTPARAM, nsIMsgWindow *aMsgWindow)
    {
      let uriObj = {};
      messageService.GetUrlForUri(msgUri, uriObj, null);
      let uri = uriObj.value;
      let jsUri = safeGetJS(uri);
      Assert.ok(safeInstanceOf(jsUri, Ci.msqIEwsUrl));
    }
    // messageURItoMsgHdr
    {
      let msgHdr = messageService.messageURIToMsgHdr(msgUri);
      Assert.ok(!!msgHdr);
      Assert.ok(msgHdr === message);
    }
    // protocolHandler
    Assert.ok(messageService instanceof Ci.nsIProtocolHandler);
    let uri = messageService.newURI(msgUri, null, null);
    let jsUri = safeGetJS(uri);
    Assert.ok(safeInstanceOf(jsUri, Ci.msqIEwsUrl));

  }
  
}

function* testAddAbFromNativeContactFolder()
{
  // Load the directory as a skink directory
  let ewsService = Cc["@mozilla.org/messenger/messageservice;1?type=exquilla"]
                     .createInstance(Ci.msqIEwsService);
  gDirectory = ewsService.addAbFromNativeContactFolder(gTestNativeContactsHost);
  Assert.ok(gDirectory instanceof Ci.nsIAbDirectory);
  dl("skink URI: " + gDirectory.URI);
}


