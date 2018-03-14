/* ***** BEGIN LICENSE BLOCK *****

 * ***** END LICENSE BLOCK ***** */
 
 // This tests a basic call to Exchange Web Services using the C++ framework
 // Now using asuth's asyncTestUtils!

load('soapRequestUtils.js');

var tests = [
  testSetupServer,
  testGetFolders,
]

function* testGetFolders()
{
  let request = Cc["@mesquilla.com/ewssoaprequest;1"]
                  .createInstance(Ci.msqIEwsSoapRequest);
  request.mailbox = gNativeMailbox;

  let folders = Cc["@mozilla.org/array;1"].createInstance(Ci.nsIMutableArray);

  let nativeFolder = gNativeMailbox.getNativeFolder();
  nativeFolder.distinguishedFolderId = 'inbox';
  folders.appendElement(nativeFolder, false);

  nativeFolder = gNativeMailbox.getNativeFolder();
  nativeFolder.distinguishedFolderId = 'outbox';
  folders.appendElement(nativeFolder, false);
  
  nativeFolder = gNativeMailbox.getNativeFolder();
  nativeFolder.distinguishedFolderId = 'calendar';
  folders.appendElement(nativeFolder, false);

  request.getFolders(/* in msqIEwsSoapResponse */ fiResponse,
                    folders,
                    /* in nsISupports aContext */ null);
  request.invoke();
  yield false;

  //dumpXMLResponse(request.soapResponse.envelope);

  for (let i = 0; i < 3; i++)
  {
    nativeFolder = folders.queryElementAt(i, Ci.msqIEwsNativeFolder);
    Assert.ok(nativeFolder.folderId.length > 2);
    Assert.ok(nativeFolder.changeKey.length > 2);
    Assert.ok(nativeFolder.parentFolderId.length > 2);
    if (i == 0)
    {
      Assert.equal(nativeFolder.folderClass, "IPF.Note");
      Assert.equal(nativeFolder.displayName, "Inbox");
    }
    else if (i == 1)
    {
      Assert.equal(nativeFolder.folderClass, "IPF.Note");
      Assert.equal(nativeFolder.displayName, "Outbox");
    }
    else
    {
      Assert.equal(nativeFolder.folderClass, "IPF.Appointment");
      Assert.equal(nativeFolder.displayName, "Calendar");
    }
    Assert.equal(typeof nativeFolder.totalCount, "number");
    Assert.equal(typeof nativeFolder.childFolderCount, "number");
    Assert.equal(typeof nativeFolder.unreadCount, "number");
  }

  // now locate a folder through the mailbox
  let foundOutbox = gNativeMailbox.getDistinguishedNativeFolder('outbox');
  Assert.equal("IPF.Note", foundOutbox.folderClass);
  Assert.equal("Outbox", foundOutbox.displayName);
}

function run_test()
{
  dl('starting test');
  async_run_tests(tests);
}

var fiResponse = {
  QueryInterface : function(iid)
  {
    if (iid.equals(Ci.msqIEwsSoapResponse))
    return this;
    throw Components.results.NS_NOINTERFACE;
  },

  onStartRequest: function onStartRequest(aRequest, aContext)
  {
    dl('onStartRequest');
  },

  onNotify: function onNotify(aRequest, aData, aStatus) {},

  onStopRequest: function onStopRequest(aRequest, aContext, aStatus)
  {
    dl('onStopRequest');
    Assert.equal(aStatus, 0);
    async_driver();
  },

  errorResponse: function errorResponse(aRequest, aContext, 
                     /* in ACString */ aResponseError, // Error description from EwsSoapRequest 
                     /* in AString */ aResponseCode,   // ResponseCode element
                     /* in AString */ aMessageText)    // MessageText element
  {
    dl('errorResponse: responseError is ' + aResponseError);
    dl('responseCode is ' + aResponseCode);
    dl('messageText is ' + aMessageText);
    dl('soap call envelope');
    dumpXMLResponse(aRequest.soapCall.envelope);
    dl('soap response envelope');
    dumpXMLResponse(aRequest.soapResponse.envelope);
    do_throw(aResponseError);
  }
};
