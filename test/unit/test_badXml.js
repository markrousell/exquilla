/* ***** BEGIN LICENSE BLOCK *****
 * ***** END LICENSE BLOCK ***** */
 
 // This test takes a customer-provide resolution set to see if it works.
 
load('soapRequestUtils.js');
load('utilities.js');
XPCOMUtils.defineLazyModuleGetter(this, "SoapTransport",
                                  "resource://exquilla/SoapTransport.jsm");
//Cu.importGlobalProperties(["XMLHttpRequest"]);

var tests = [
  //testSetupServer,
  testGoodXml,
  testShutdown
]

// msqISOAPMessage implementation
function SoapMessage() {}

SoapMessage.prototype = {

  QueryInterface: XPCOMUtils.generateQI([Ci.msqISOAPMessage]),

  //   The document which captures the message, if any.
  // attribute nsIDOMDocument message;
  get message() { return this._message? this._message : null;},
  set message(a) { this._message = a;},

  //   messageString. If set in the call, use this string instead of a DOM message
  // attribute AString messageString;
  get messageString() { return this._messageString ? this._messageString : null;},
  set messageString(a) { this._messageString = a;},

  //   SOAP envelope from the document.
  // readonly attribute nsIDOMElement envelope;
  get envelope() {
    if (!this._message) {
      return null;
    }
    let root = this._message.documentElement;
    if ( (root.namespaceURI == nsEnvelope) &&
         (root.localName == "Envelope") ) {
      return root;
    }
    return null;
  },

  //   SOAP header from the envelope.
  // readonly attribute nsIDOMElement header;
  get header() {
    if (this.envelope) {
      return this.envelope.getElementsByTagNameNS(nsEnvelope, "Header")[0];
    }
    return null;
  },

  //   SOAP body from the envelope.
  // readonly attribute nsIDOMElement body;
  get body() {
    if (this.envelope) {
      return this.envelope.getElementsByTagNameNS(nsEnvelope, "Body")[0];
    }
    return null;
  },

  //   Encodes the specified parameters into this message, if
  //   this message type supports it.
  // void encode(in unsigned short aVersion,
  //             in AString aMethodName, in AString aTargetObjectURI,
  //             in unsigned long aHeaderBlockCount,
  //             [array,
  //             size_is(aHeaderBlockCount)] in msqISOAPHeaderBlock
  //            aHeaderBlocks, in unsigned long aParameterCount,[array,
  //                                                         size_is
  //                                                         (aParameterCount)]
  //             in msqISOAPParameter aParameters);

  // The remaining methods will go away when we are done converting from C++
}

// msqISOAPCall implementation
function SoapCall() {}

SoapCall.prototype = {
  QueryInterface: XPCOMUtils.generateQI([Ci.msqISOAPCall, Ci.msqISOAPMessage]),
  __proto__: SoapMessage.prototype,

    /// msqISOAPCall implementation.

  // The URI to which the message will be sent
  //attribute AString transportURI;
  get transportURI() { return this._transportURI;},
  set transportURI(a) { this._transportURI = a;},

  //   Asynchronously invoke the call.
  // msqISOAPCallCompletion asyncInvoke(in msqISOAPResponseListener aListener,
  //                                   [optional] in AString aUser,
  //                                   [optional] in AString aPassword,
  //                                   [optional] in AString aDomain);
  asyncInvoke(listener, username, password, domain)
  {
    if (!this.transportURI)
      throw CE("No transport URI was specified", Cr.NS_ERROR_NOT_INITIALIZED);

    let transport = new SoapTransport();
    let response = new SoapResponse();
    if (username)
      transport.user = username;
    if (password)
      transport.password = password;
    if (domain)
      transport.domain = domain;
    if (this.useragent)
      transport.useragent = this.useragent;
    return transport.asyncCall(this, listener, response);
  },

  //   user (optional) A username for authentication if necessary.
  // attribute AString user;
  get user() { return this._user;},
  set user(a) { this._user = a;},

  //   password (optional) A password for authentication if necessary.
  // attribute AString password;
  get password() { return this._password;},
  set password(a) { this._password = a;},

  //   noParse: set to true if the response should not be parsed into xml.
  // attribute bool noParse;
  get noParse() { return !!this._noParse;},
  set noParse(a) { this._noParse = !!a;},

  //   useragent (optional) The User-Agent string to pass in the http request
  // attribute ACString useragent;
  get useragent() { return this._useragent ? this._useragent : "";},
  set useragent(a) { this._useragent = a;},
}

function SoapResponse() {}

// msqISOAPResponse implementation
SoapResponse.prototype = {
  QueryInterface: XPCOMUtils.generateQI([Ci.msqISOAPResponse, Ci.msqISOAPMessage]),
  __proto__: SoapMessage.prototype,

  /// HTML request code
  // attribute unsigned long htmlStatus;
  get htmlStatus() { return this._htmlStatus;},
  set htmlStatus(a) { this._htmlStatus = a;},

  /// HTML request text
  // attribute ACString htmlText;
  get htmlText() { return this._htmlText;},
  set htmlText(a) { this._htmlText = a;},

  // The underlying xml request, needed for error handling  and recovery
  // attribute XMLHttpRequest xhr;
  get xhr() { return this._xhr;},
  set xhr(a) { this._xhr = a;},
}


// The bad &#x...; characters in the test string
let badChars = ["&#x0;","&#x1;","&#x5;","&#xB;","&#x10;","&#xFFFE;"];

// The good &#x...; characters in the test string 
let goodChars = ["&#x9;","&#xA;","&#x20;","&#xFFFD;"];

function* testGoodXml() {

  dump("\n\nI am testGoodXml\n");
  let file = do_get_file('data/InvalidResponseText.txt');
  let URL = getFileURL(file);
  dl('URL is ' + URL);

/*
  // try to use xmlhttprequest
  let request = new XMLHttpRequest();
  function onLoad() { async_driver();}
  request.onload = onLoad;
  request.open("POST", URL, true);
  request.overrideMimeType("application/xml");
  request.send();
  yield false;

*/
  let transport = new SoapTransport();
  let response = new SoapResponse();
  let call = new SoapCall();
  call.transportURI = URL;

  let listener = {
    handleResponse: function _handleResponse(aResponse, aCall, status, aLast)
     {
       dl("handleResponse");
       async_driver();
       return true;
     }
  };

  let completion = transport.asyncCall(call, listener, response);
  yield false;
  let request = response.xhr;

  // after the request
  let data = request.responseText;
  dl("bad xmlDocument from the raw request:");
  dumpXMLResponse(request.responseXML);
  dl("good xmlDocument from the soap response:");
  dumpXMLResponse(response.message);

  Assert.equal(response.message.documentElement.tagName, "soap:Envelope");

  // make sure we have the bad characters
  for (let item of badChars)
    Assert.ok(data.includes(item));
  // and the good characters
  for (let item of goodChars)
    Assert.ok(data.includes(item));  
}

function run_test()
{
  async_run_tests(tests);
}
