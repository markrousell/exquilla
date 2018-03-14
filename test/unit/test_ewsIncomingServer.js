/* ***** BEGIN LICENSE BLOCK *****
 * This file is part of ExQuilla by Mesquilla.
 *
 * Copyright 2016 R. Kent James
 *
 * All Rights Reserved
 *
 * ***** END LICENSE BLOCK ***** */
 
 // This tests EwsIncomingServer

var Cu = Components.utils;
Cu.import("resource://exquilla/ewsUtils.jsm");
Cu.import("resource:///modules/mailServices.js");
Utils.importLocally(this);

const EwsIncomingServer =
  Components.Constructor("@mozilla.org/messenger/server;1?type=exquilla",
                         Ci.nsIMsgIncomingServer);

let gServer;
function syncTests() {

  // Setup a base environment for the server
  let username = "theuser";
  let hostname = "mail.example.org";
  let type = "exquilla";
  let account = MailServices.accounts.createAccount();
  gServer = MailServices.accounts.createIncomingServer(username, hostname, type);
  let jsServer = safeGetJS(gServer);
  Assert.equal((typeof jsServer), "object");
  safeGetInterface(gServer, Ci.msqIEwsIncomingServer).useMail = true;
  account.incomingServer = gServer;
  account.addIdentity(MailServices.accounts.createIdentity());
  dl("defaultIdentity is " + account.defaultIdentity);
  account.defaultIdentity.email = "theuser@example.org";

  Assert.ok(gServer.QueryInterface(Ci.nsIMsgIncomingServer));

  // attributes
  jsServer.ewsURL = "https://example.org/EWS/Exchange.asmx";
  Assert.equal(jsServer.ewsURL, "https://example.org/EWS/Exchange.asmx");

  jsServer.domain = "thedomain";
  Assert.equal(jsServer.domain, "thedomain");

  jsServer.useMail = false;
  Assert.ok(!jsServer.useMail);
  jsServer.useMail = true;
  Assert.ok(jsServer.useMail);

  jsServer.useAB = false;
  Assert.ok(!jsServer.useAB);
  jsServer.useAB = true;
  Assert.ok(jsServer.useAB);

  jsServer.useCalendar = true;
  Assert.ok(jsServer.useCalendar);
  jsServer.useCalendar = false;
  Assert.ok(!jsServer.useCalendar);

  let mailbox = jsServer.nativeMailbox;
  Assert.ok(mailbox.QueryInterface(Ci.msqIEwsNativeMailbox));
  Assert.equal(gServer.serverURI, "exquilla://theuser@mail.example.org");
  Assert.equal(gServer.serverURI, mailbox.serverURI);

  Assert.equal(jsServer.email, "theuser@example.org");

  // setup some native and skink folders and subfolders for test.
  let child1SkinkFolder = gServer.rootFolder.addSubfolder("child1");
  let child1EwsFolder = safeGetJS(child1SkinkFolder);
  let rootEwsFolder = safeGetJS(gServer.rootFolder);

  const folderIdBase = "01234567890123456789";
  let rootNativeFolder = mailbox.getNativeFolder("msgfolderroot");
  rootNativeFolder.folderId = folderIdBase;
  rootNativeFolder.verifiedOnline = true;
  rootEwsFolder.folderId = folderIdBase;
  rootEwsFolder.distinguishedFolderId = "msgfolderroot";
  let child1NativeFolder = mailbox.getNativeFolder("child1-" + folderIdBase);
  child1NativeFolder.parentFolderId = folderIdBase;
  child1NativeFolder.verifiedOnline = true;
  child1EwsFolder.folderId = "child1-" + folderIdBase;
  mailbox.updateSubfolderIds();

  let testNativeFolder = jsServer.getNativeFolder(child1EwsFolder);
  Assert.ok(testNativeFolder === child1NativeFolder);

  jsServer.reconcileFolders();

  // soap logging
  gServer.setBoolValue("logEws", true);
  gServer.setBoolValue("logEws", true);
  jsServer.setupSoapLogging(mailbox);
  Assert.ok(mailbox.soapLogFile.QueryInterface(Ci.nsIFile));
  gServer.setBoolValue("logEws", false);
  jsServer.setupSoapLogging(mailbox);
  Assert.ok(!mailbox.soapLogFile);

  // unavailable should be unchecked
  Assert.equal(jsServer.unavailable, 3);

  gServer.realUsername = "newuser";
  Assert.equal(mailbox.username, "newuser");

  Assert.ok(!gServer.canCompactFoldersOnServer);
  jsServer.useMail = true;
  Assert.ok(gServer.canSearchMessages);

  Assert.ok(gServer.spamSettings);
}

var tests = [
  syncTests,
]

function run_test()
{
  tests.forEach(x => add_task(x));
  run_next_test();
}
