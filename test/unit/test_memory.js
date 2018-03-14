/* ***** BEGIN LICENSE BLOCK *****
 * ***** END LICENSE BLOCK ***** */
 
// Tests memory management issues relevant to using JsAccount.

Cu.import("resource://exquilla/ewsUtils.jsm");

// not sure why this spews uncaught errors
Utils.importLocally(this);

let tests = [
  showFailure,
]

function showFailure() {
  // This should show what we are trying to avoid.
  let factory = JSAccountUtils.jaFactory(JaBaseUrl.Properties, JaBaseUrl);
  let url = factory.createInstance(null, Ci.nsISupports);
  dl("url is " + url);

  let jsUrl = url.jsDelegate.wrappedJSObject;
  dl("jsUrl is " + jsUrl);
  let jsDelegator = jsUrl.delegator;
  dl("jsDelegator is " + jsDelegator);
  Assert.ok(url === jsDelegator);

  // the delegator is a weak reference. We should be able to make it die
  // with a gc cycle.
  url = null;
  jsDelegator = null;
  Cu.forceGC();
  Cu.forceGC();
  try {
    dl("after GC, delegator is " + jsUrl.delegator);
    Assert.ok(false);
  } catch (ex) {
    dl("Exception in jsUrl.delegator: " + ex);
  }

  // But if we hold a local reference, we should prevent that.
  let url2 = factory.createInstance(null, Ci.nsISupports);
  let jsUrl2 = url2.jsDelegate.wrappedJSObject;
  let delegatorReference = jsUrl2.delegator;
  url2 = null;
  Cu.forceGC();
  Cu.forceGC();
  dl("after GC, delegator2 is " + jsUrl2.delegator);

  // The moral of this story is that we should NOT replace a reference to the XPCOM
  // delegator object with the wrappedJSObject (at least unmodified)!

  // This is what seems to be failing (but works after the strongJSObject was introduced):
  {
    let uri = Cc["@mesquilla.com/ewsurl;1"].createInstance(Ci.nsIURI);
    // Fixme
    uri.spec = "ews://example.org/folder/?part=1.2";
    let jsUri = uri.QueryInterface(Ci.msgIOverride).jsDelegate.wrappedJSObject;
    uri = null;
    dl("Before gc3, delegator is " + jsUri.delegator);
    // We kill some time in the file picker. Simulate by GC.
    Cu.forceGC();
    Cu.forceGC();
    dl("After gc3, delegator is " + jsUri.delegator);
    //dl("After gc3, uri is " + uri);
    dl("After gc3, jsUri is " + jsUri);
    dl("jsUri.attachmentSequence is " +  jsUri.attachmentSequence);
    // And we never reach here. The delegator lives, but not its weakReference!
    // I am guessing that there is an intermediate JS object that is the actual
    // target of the weakReference, and THAT js object gets garbage collected
    // without destroying the underlying C++ object.
  }
}

function dl(text) { dump(text + "\n")}

function run_test()
{
  tests.forEach(x => add_task(x));
  run_next_test();
}

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "JSAccountUtils", "resource://exquilla/JSAccountUtils.jsm");

// A partial JavaScript implementation of the base server methods. This is a test
// version for use in this test.

function JaBaseUrl(aDelegator, aBaseInterfaces) {

// Typical boilerplate to include in all implementations.

  // Object delegating method calls to the appropriate XPCOM object.
  // Weak because it owns us.
  // This fails:
  //this._delegatorWeak = Cu.getWeakReference(aDelegator);
  // This works:
  this._delegatorWeak = aDelegator.QueryInterface(Ci.nsISupportsWeakReference)
                                  .GetWeakReference();

}

JaBaseUrl.Properties = {

  // The CPP object that delgates to CPP or JS.
  baseContractID:     "@mozilla.org/jacppurldelegator;1",

  // Interfaces implemented by the base CPP version of this object.
  baseInterfaces:     [ Ci.nsIURI,
                        Ci.nsIURL,
                        Ci.nsIMsgMailNewsUrl,
                        Ci.nsIMsgMessageUrl,
                        Ci.msgIOverride,
                        Ci.nsISupports,
                        Ci.nsIInterfaceRequestor,
                        ],

  // We don't typically define this as a creatable component, but if we do use
  // these. Subclasses for particular account types require these defined for
  // that type.
  contractID:         "@mozilla.org/jsaccount/jaurl;1",
  classID:            Components.ID("{1E7B42CA-E6D9-408F-A4E4-8D2F82AECBBD}"),
};

JaBaseUrl.prototype = {
// Typical boilerplate to include in all implementations.
  __proto__: JSAccountUtils.makeCppDelegator(JaBaseUrl.Properties),

  // Flag this item as CPP needs to delegate to JS.
  _JsPrototypeToDelegate: true,

  // QI to the interfaces.
  QueryInterface: XPCOMUtils.generateQI(JaBaseUrl.Properties.baseInterfaces),

  // Used to access an instance as JS, bypassing XPCOM.
  get wrappedJSObject() {
    return this;
  },

  // Accessor to the weak cpp delegator.
  get delegator() {
    // the Cu.getWeakReference form
    //return this._delegatorWeak.get();
    // the nsISupportsWeakReference form
    dump("this._delegatorWeak is " + this._delegatorWeak + "\n");
    return this._delegatorWeak.QueryReferent(Ci.nsISupports);
  },

  // Base implementation of methods with no overrides.
  get cppBase() {
    let delegator = this.delegator;
    if (delegator)
      return delegator.cppBase;
    throw Cr.NS_ERROR_FAILURE;
  },

  // Dynamically-generated list of delegate methods.
  delegateList: null,

  // Implementation in JS  (if any) of methods in XPCOM interfaces.

};
