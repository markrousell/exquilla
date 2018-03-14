/* ***** BEGIN LICENSE BLOCK *****
 * ***** END LICENSE BLOCK ***** */
 
 // This tests CreateStorageIfMissing (used in creating archive folders)

var Cu = Components.utils;
Cu.import("resource://exquilla/ewsUtils.jsm");
Cu.import("resource:///modules/mailServices.js");
Utils.importLocally(this);

load('utilities.js');
load('soapRequestUtils.js');

var tests = [
  taskSetupEwsServer,
  taskSetupTestFolder,
  taskCreateStorage,
  taskShutdown,
];

function* taskCreateStorage() {
  {
    dl("test of rograt gTestEwsFolderHost.name is " + gTestEwsFolderHost.name);
    let gTestExqFolderHost = safeGetInterface(gTestEwsFolderHost, Ci.msqIEwsMailFolder);
    dl("is verified? " + gTestExqFolderHost.verifiedAsOnlineFolder);
  }

  let newFolder = gTest1EwsMailFolder.addSubfolder("newFolder");

  let ewsFolder = safeGetInterface(newFolder, Ci.msqIEwsMailFolder);
  Assert.ok(!ewsFolder.verifiedAsOnlineFolder);

  {
    let listener = new PromiseUtils.UrlListener();
    newFolder.createStorageIfMissing(listener);
    let result = yield listener.promise;
    Assert.ok(CS(result));
  }
  Assert.ok(ewsFolder.verifiedAsOnlineFolder);

  // A more complex case, two levels created from RDF.
  let rdf = Cc["@mozilla.org/rdf/rdf-service;1"]
              .getService(Ci.nsIRDFService);

  let testURI = gTestEwsMailFolder.URI + "/level1/level2";
  let testResource = rdf.GetResource(testURI);

  {
    let listener = new PromiseUtils.UrlListener();
    testResource.QueryInterface(Ci.nsIMsgFolder).createStorageIfMissing(listener);
    let result = yield listener.promise;
    Assert.ok(CS(result));
  }
  Assert.ok(safeGetInterface(testResource, Ci.msqIEwsMailFolder).verifiedAsOnlineFolder);
}

function run_test()
{
  tests.forEach(x => add_task(x));
  run_next_test();
}
