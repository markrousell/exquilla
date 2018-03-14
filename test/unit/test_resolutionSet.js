/* ***** BEGIN LICENSE BLOCK *****
 * ***** END LICENSE BLOCK ***** */

 // This test takes a customer-provide resolution set to see if it works.

Cu.import("resource://exquilla/ewsUtils.jsm");
// not sure why this spews uncaught errors
Utils.importLocally(this);

load('soapRequestUtils.js');
load('utilities.js');
Cu.import("resource://exquilla/EWStoPL.js");

var tests = [
  testSetupEwsServer,
  testResolutionSet,
  testShutdown
];

var httpRequestObserver =
{
  observe: function(subject, topic, data)
  {
    if (topic == "http-on-modify-request") {
      var httpChannel = subject.QueryInterface(Ci.nsIHttpChannel);
      if (httpChannel instanceof Ci.nsIUploadChannel)
      {
        dump("upload channel is " + httpChannel.uploadStream + "\n");
        if (httpChannel.uploadStream instanceof Ci.nsISeekableStream)
          httpChannel.uploadStream.seek(Ci.nsISeekableStream.NS_SEEK_SET, 0);
        //else
        //  dump("Not a seekable stream\n");
      }
      else
        dump("Not an nsIUploadeChannel\n");
    }
  },

  get observerService() {
    return Cc["@mozilla.org/observer-service;1"]
                     .getService(Ci.nsIObserverService);
  },

  register: function()
  {
    this.observerService.addObserver(this, "http-on-modify-request", false);
  },

  unregister: function()
  {
    this.observerService.removeObserver(this, "http-on-modify-request");
  }
};
httpRequestObserver.register();

function purgeEOL(aData) {
  let data = "";
  // purge \n\r
  for (let i=0; i < aData.length; i++)
  {
    if (aData[i] != "\n" && aData[i] != "\r")
      data += aData[i];
  }
  return data;
}

function* testResolutionSet() {

  // locate the directory associated with the GAL contact folder
  let abManager = Cc['@mozilla.org/abmanager;1']
                    .getService(Ci.nsIAbManager);
  let directories = abManager.directories;
  let galDirectory = null;
  let ewsDirectory;
  while (directories.hasMoreElements())
  {
    let directory = directories.getNext();
    try {
      ewsDirectory = safeGetJS(directory);
    } catch (e) {}
    if (ewsDirectory && ewsDirectory.isGAL) {
      galDirectory = directory;
      break;
    }
  }
  Assert.ok(ewsDirectory);

  let parser = Cc["@mozilla.org/xmlextras/domparser;1"]
                 .createInstance(Ci.nsIDOMParser);

  let jsDirectory;
  {
    let dataPP = fileText("data/resolutionset1.xml");

    dump("dataPP length is " + dataPP.length + "\n");
    let data = purgeEOL(dataPP);
    dump("data length is " + data.length + "\n");

    let parsedDocument = parser.parseFromString(data, "text/xml");
    let parsedElement = parsedDocument.documentElement;
    let properties = EWStoPL.domToVariant(parsedElement);
    dump("propertiesPL\n");
    showPL(properties);

    // generate a resolution from the pl
    let resolution = properties.getPropertyList("ResponseMessages/ResolveNamesResponseMessage/ResolutionSet/Resolution");
    if (galDirectory instanceof Ci.msgIOverride)
      jsDirectory = galDirectory.jsDelegate.wrappedJSObject;
    let fakeContact = jsDirectory.itemFromResolution(resolution);

    // convert to a card
    let card = jsDirectory.updateItem(fakeContact);
    Assert.equal(card.primaryEmail, 'Alexey.Vasiliev@example.net');
  }

  {
    let dataPP = fileText("data/resolutionset2.xml");

    dump("dataPP length is " + dataPP.length + "\n");
    let data = purgeEOL(dataPP);
    dump("data length is " + data.length + "\n");

    let parsedDocument = parser.parseFromString(data, "text/xml");
    let parsedElement = parsedDocument.documentElement;
    let properties = EWStoPL.domToVariant(parsedElement);
    dump("propertiesPL\n");
    showPL(properties);

    // generate a resolution from the pl
    let resolution = properties.getPropertyList("ResponseMessages/ResolveNamesResponseMessage/ResolutionSet/Resolution");
    let fakeContact = jsDirectory.itemFromResolution(resolution);

    // convert to a card
    let card = jsDirectory.updateItem(fakeContact);
    Assert.equal(card.primaryEmail, 'Ilia_Rogov@epam.com');
  }
}

function run_test()
{
  async_run_tests(tests);
}
