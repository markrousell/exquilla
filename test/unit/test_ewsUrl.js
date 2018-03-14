/* ***** BEGIN LICENSE BLOCK *****
 * This file is part of ExQuilla by Mesquilla.
 *
 * Copyright 2016 R. Kent James
 *
 * All Rights Reserved
 *
 * ***** END LICENSE BLOCK ***** */

load('utilities.js');
function dl(a) { dump(a + "\n");}

Cu.import("resource://exquilla/ewsUtils.jsm");
// not sure why this spews uncaught errors
Utils.importLocally(this);

// shorthand create
var nCID;
function newURL() { return Cc[nCID].createInstance(Ci.nsISupports);}

var nCIDs = [
         "@mesquilla.com/ewsurl;1",
];

var interfaces = [
  Ci.nsISupports,
  Ci.nsIURL,
  Ci.nsIURI,
  Ci.nsIMsgMessageUrl,
  Ci.nsIMsgMailNewsUrl,
  Ci.nsIInterfaceRequestor
];

var tests = [
  function* testExists() {
    // test the existence of components and their interfaces.
    let url = newURL();
    for (let iface of interfaces) {
      Assert.ok(url instanceof iface);
      let urlQI = url.QueryInterface(iface);
      Assert.ok(urlQI);
    }
    dump("url is " + url + "\n");
    Assert.ok(!!safeGetInterface(url, Ci.msqIEwsUrl));
    Assert.equal((typeof safeGetJS(url)), "object");
  },
  // disable since we cannot set .spec
  /*
  function* test_nsIURI() {
    let url = newURL();
    url = url.QueryInterface(Ci.nsIURI);
    Assert.ok("spec" in url);
    url.spec = "https://test.invalid/folder?isFoo=true&someBar=theBar";
    Assert.equal(url.host, "test.invalid");
    // test non-attributes
    // url.resolve is overridden in nsMsgMailNewsUrl to only work if starts with "#"
    Assert.equal("https://test.invalid/folder?isFoo=true&someBar=theBar#modules", url.resolve("#modules"));
  },
  function* test_nsIURL() {
    let url = newURL().QueryInterface(Ci.nsIURL);
    Assert.ok("filePath" in url);
    url.spec = "https://test.invalid/folder?isFoo=true&someBar=theBar";
    Assert.equal(url.query, "isFoo=true&someBar=theBar");
    // Note that I tried here to test getCommonSpec, but that does not work
    // because nsStandardURL.cpp makes an assumption that the URL is directly
    // an nsStandardURL.cpp.
  },
  */
  function* test_nsIMsgMailNewsUrl() {
    let url = newURL().QueryInterface(Ci.nsIMsgMailNewsUrl);
    Assert.ok("msgWindow" in url);
    url.maxProgress = 23;
    Assert.equal(url.maxProgress, 23);
  },
  function* test_nsIMsgMessageUrl() {
    let url = newURL().QueryInterface(Ci.nsIMsgMessageUrl);
    Assert.ok("originalSpec" in url);
    let appDir = Services.dirsvc.get("GreD", Components.interfaces.nsIFile);
    Assert.ok(appDir.path);
    // test attributes
    url.messageFile = appDir;
    Assert.equal(url.messageFile.path, appDir.path);
  },
  // disable since we cannot simply set spec
 /*
  function* test_msqIEwsUrl() {
    let url = newURL().QueryInterface(Ci.nsIInterfaceRequestor);
    let ewsUrl = url.getInterface(Ci.msqIEwsUrl);
    Assert.ok(ewsUrl instanceof Ci.msqIEwsUrl);

    ewsUrl.itemId = "theItemId";
    Assert.equal(ewsUrl.itemId, "theItemId");

    url.QueryInterface(Ci.nsIURI).spec = "https://foo.invalid/bar/";
    Assert.ok(!ewsUrl.isAttachment);
    url.QueryInterface(Ci.nsIURI).spec = "https://foo.invalid/bar?part=1.4&dummy=stuff";
    Assert.ok(ewsUrl.isAttachment);
    Assert.equal(ewsUrl.attachmentSequence, 2);

    ewsUrl.messageKey = "135";
    Assert.equal(ewsUrl.messageKey, 135);

    let msgMailNewsUrl = url.QueryInterface(Ci.nsIMsgMailNewsUrl);
    Assert.ok(!msgMailNewsUrl.IsUrlType(Ci.nsIMsgMailNewsUrl.eMove));
    ewsUrl.setUrlType(Ci.nsIMsgMailNewsUrl.eMove);
    Assert.ok(msgMailNewsUrl.IsUrlType(Ci.nsIMsgMailNewsUrl.eMove));

    let server = MailServices.accounts.createIncomingServer("someUser", "example.com" + runNumber, "exquilla");
    let folder = server.rootFolder;
    let mailbox = safeGetJS(server).nativeMailbox;

    msgMailNewsUrl.folder = folder;
    Assert.ok(msgMailNewsUrl.folder === folder);
    Assert.ok(msgMailNewsUrl.server === server);
    Assert.ok(ewsUrl.mailbox === mailbox);
  },
  */
];

// Used to create unique values, like in the server.
let runNumber = 0;
 function run_test()
{
  // note nCID is a global
  for (nCID of nCIDs) {
    runNumber++;
    for (var test of tests)
      test();

  }
}
