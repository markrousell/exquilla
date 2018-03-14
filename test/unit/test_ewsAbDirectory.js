/* ***** BEGIN LICENSE BLOCK *****
 * This file is part of ExQuilla by Mesquilla.
 *
 * Copyright 2016 R. Kent James
 *
 * All Rights Reserved
 *
 * ***** END LICENSE BLOCK ***** */

// This file tests aspects of the ExQuilla Ab directory implementation that do
// not require interaction with a server to accomplish.

load('utilities.js');
Cu.import("resource://exquilla/ewsUtils.jsm");
// not sure why this spews uncaught errors
Utils.importLocally(this);

function dl(a) { dump(a + "\n");}
const nativeFolderId = "0123456789012345678901234567890";
const serverHost = ".example.com";
var currentURI;
// hardcoded directory type from EwsService
const MAPIDirectory = 3;

// shorthand create
var nCID;
function newAbDirectory(aFolderId) {
  let type = /type=(.*)/.exec(nCID)[1];
  dl("type is " + type);

  // attach a dummy nativeFolder and nativeMailbox to the directory
  let mailbox = Cc["@mesquilla.com/ewsnativemailbox;1"]
                  .createInstance(Ci.msqIEwsNativeMailbox);
  mailbox.serverURI = "exquilla://" + type + serverHost;
  let folderId = aFolderId || nativeFolderId + type;
  let nativeFolder = mailbox.getNativeFolder(folderId);
  nativeFolder.displayName = "Dummy Contact Folder";
  let ewsService = Cc["@mozilla.org/messenger/messageservice;1?type=exquilla"]
                     .createInstance(Ci.msqIEwsService);
  dl("nativeFolder for directory is " + nativeFolder);
  Services.prefs.setCharPref("extensions.exquilla.abScheme", type);
  let abDir = ewsService.addAbFromNativeContactFolder(nativeFolder);
  dl("abDir is " + abDir);
  return abDir;
}

var nCIDs = [ 
         "@mozilla.org/addressbook/directory;1?type=exquilla-directory",
];

var baseInterfaces = [Ci.nsIAbDirectory,
                      Ci.nsIAbCollection,
                      Ci.nsIAbItem,
                      Ci.nsISupports,
                      Ci.nsIInterfaceRequestor,
                      ];

var extraInterfaces = [Ci.msqIEwsAbDirectory,
                       Ci.msqIEwsEventListener,
                       Ci.nsIAbDirSearchListener];

var tests = [
  function* testCreate() {
    // ToDo: just this one test leaks.
    let ad = newAbDirectory();
  },
  function* testExists() {
    // test the existence of components and their interfaces.
    let ad = newAbDirectory();
    for (let iface of baseInterfaces) {
      Assert.ok(ad instanceof iface);
      let adQI = ad.QueryInterface(iface);
    }
    for (let extra of extraInterfaces) {
      let ewsAd = ad.getInterface(extra);
      dl("ewsAd is " + ewsAd);
      Assert.ok(ewsAd instanceof extra);
      dl("ewsAd is " + ewsAd);
      let adQI = ewsAd.QueryInterface(extra);
    }
  },
  function* testAbItem() {
    // test nsIAbItem interface
    let item = newAbDirectory().QueryInterface(Ci.nsIAbItem);
    let collection = item.QueryInterface(Ci.nsIAbCollection);
    let directory = item.QueryInterface(Ci.nsIAbDirectory);

    // item tests
    Assert.ok(item.uuid);
    Assert.equal("/Dummy Contact Folder", item.generateName(Ci.nsIAbItem.GENERATE_DISPLAY_NAME));
  },
  function* testAbCollection() {
    let collection = newAbDirectory().QueryInterface(Ci.nsIAbCollection);
    Assert.ok(collection instanceof Ci.nsIAbCollection);
  },

  function* testAbDirectory() {
    let directory = newAbDirectory().QueryInterface(Ci.nsIAbDirectory);
    Assert.ok(directory instanceof Ci.nsIAbDirectory);

    Assert.equal("chrome://messenger/content/addressbook/abAddressBookNameDialog.xul",
                 directory.propertiesChromeURI);

    // directory tests
    Assert.equal("/Dummy Contact Folder", directory.dirName);
    Assert.equal(MAPIDirectory, directory.dirType);
    let type = /type=(.*)/.exec(nCID)[1];
    let URI = type + "://" + type + serverHost + "/Dummy%20Contact%20Folder";
    Assert.equal(URI, directory.URI);
    Assert.equal(1, directory.position); // kDefaultPosition
    Assert.ok(!directory.isMailList);
    Assert.ok(!directory.isQuery);
    Assert.ok(!directory.readOnly);
    Assert.ok(directory.supportsMailingLists);
    directory.listNickName = "the nickname";
    Assert.equal("the nickname", directory.listNickName);
    directory.description = "the description";
    Assert.equal("the description", directory.description);
    Assert.ok(directory.useForAutocomplete(""));
    directory.setStringValue("someKey", "theValue");
    Assert.equal(directory.getStringValue("someKey", "theDefault"), "theValue");
    Assert.equal(directory.getStringValue("NotAValue", "anotherDefault"), "anotherDefault");
  },

  function* test_ewsAbDirectory() {
    let type = /type=(.*)/.exec(nCID)[1];
    let folderId = "0123454321001234543210" + type;
    let ifr = newAbDirectory(folderId).QueryInterface(Ci.nsISupports);
    let ewsDir = safeGetJS(ifr);
    Assert.ok(safeInstanceOf(ewsDir, Ci.msqIEwsAbDirectory));
    Assert.equal(ewsDir.nativeFolder.folderId, folderId);
    Assert.equal(ewsDir.folderId, folderId);
    ewsDir.distinguishedFolderId = "Dummy";
    Assert.equal(ewsDir.distinguishedFolderId, "Dummy");
    ewsDir.distinguishedFolderId = "";
  },
/**/

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
