/* ***** BEGIN LICENSE BLOCK *****
 * ***** END LICENSE BLOCK ***** */
 
 // This tests getting an attachment using skink calls

load('utilities.js');
load('soapRequestUtils.js');

var tests = [
  taskSetupEwsServer,
  taskSetupTestFolder,
  taskCreateItemWithAttachment,
  testGetAttachment,
  testShutdown,
]

var gEwsMailFolder;
var gAttachmentCount = 0;
Cu.import("resource://gre/modules/Services.jsm");

function PromiseHdrSink() {
  this._promise = new Promise((resolve, reject) => {
    this._resolve = resolve;
    this._reject = reject;
  });
}
PromiseHdrSink.prototype = {
  handleAttachment(contentType, url, displayName, uri, notDownloaded)
  {
    dl('url is ' + url);
    dl('displayName is ' + displayName);
    dl('contentType is ' + contentType);
    dl('uri is ' + uri);
    gAttachmentCount++;
    Assert.ok(url.length > 0);
    Assert.ok(displayName.length > 1);
    Assert.ok(contentType.length > 1);
    Assert.ok(uri.length > 1);
    let fileUrl = Services.io.newURI(url, null, null).QueryInterface(Ci.nsIFileURL);
    Assert.ok(fileUrl.file.exists());
    
  },
  onEndAllAttachments() { this._resolve();},
  get promise() { return this._promise;},
}

function* testGetAttachment() {

  let updateListener = new PromiseUtils.UrlListener();
  gTest1ExqMailFolder.updateFolderWithListener(null, updateListener);
  let updateResult = yield updateListener.promise;
  Assert.equal(updateResult, Cr.NS_OK);

  let hdr = firstMsgHdr(gTest1EwsMailFolder);
  Assert.ok(hdr instanceof Ci.nsIMsgDBHdr);

  let promiseHdrSink = new PromiseHdrSink();
  gExqIncomingServer.getAllAttachments(hdr, promiseHdrSink);
  yield promiseHdrSink.promise;

  Assert.ok(gAttachmentCount > 0);

  return;
}

function run_test()
{
  tests.forEach(x => add_task(x));
  run_next_test();
}

