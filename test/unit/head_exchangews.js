// Import the main scripts that mailnews tests need to set up and tear down

var Cc = Components.classes;
var Ci = Components.interfaces;
var Cr = Components.results;
var CC = Components.Constructor;
var Cu = Components.utils;
// I thought this could be just Components.isSuccessCode but I cannot make that work
var CS = function CS(result) { return result == Components.results.NS_OK;};

Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource:///modules/mailServices.js");
Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://testing-common/mailnews/mailTestUtils.js");
Cu.import("resource://testing-common/mailnews/localAccountUtils.js");
Cu.import("resource://testing-common/AppInfo.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "EwsNativeAttachment",
                                  "resource://exquilla/EwsNativeAttachment.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "PropertyList",
                                  "resource://exquilla/PropertyList.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "StringArray",
                                  "resource://exquilla/StringArray.jsm");

// This must be called on the main thread, else osfile spews error messages.
Cc["@mozilla.org/net/osfileconstantsservice;1"].
  getService(Ci.nsIOSFileConstantsService).init();

// ensure the profile directory is set up
do_get_profile();
mailTestUtils.registerUMimTypProvider();

// Allow non-local connections (to external EWS servers)
let env = Cc["@mozilla.org/process/environment;1"].getService(Ci.nsIEnvironment);
env.set("MOZ_DISABLE_NONLOCAL_CONNECTIONS", "0");

function arrayenumerator(a)
{
  return {
    i_: 0,
    QueryInterface: XPCOMUtils.generateQI([Ci.nsISimpleEnumerator]),
    hasMoreElements: function ae_hasMoreElements() {
      return this.i_ < a.length;
    },
    getNext: function ae_getNext() {
      return a[this.i_++];
    }
  };
}

// register extension provider
{
  let appDir = Services.dirsvc.get("GreD", Components.interfaces.nsIFile);
  appDir.append('extensions');
  appDir.append('exquilla@mesquilla.com');
  appDir.append('defaults');
  appDir.append('preferences');
  let fileURL = Services.io
                  .newFileURI(appDir)
                  .QueryInterface(Ci.nsIFileURL);
  var extProvider = {
    QueryInterface: XPCOMUtils.generateQI([Ci.nsIDirectoryServiceProvider,
                                           Ci.nsIDirectoryServiceProvider2]),
    getFile: function ep_getFile() {
      throw Cr.NS_ERROR_FAILURE;
    },

    getFiles: function ep_getFiles(key) {
      if (key != "ExtPrefDL")
        throw Cr.NS_ERROR_FAILURE;

      return arrayenumerator([fileURL.file]);
    }
  };

  Services.dirsvc.registerProvider(extProvider);
  Services.obs.notifyObservers(null, "load-extension-defaults", null);
}

// default logging
const LOGLEVEL = "Debug";
dump("Setting exquilla logging level to " + LOGLEVEL + "\n");
Services.prefs.setCharPref("extensions.exquilla.log.level", LOGLEVEL);
Services.prefs.setBoolPref("extensions.exquilla.log.dump", true);
Services.prefs.setBoolPref("extensions.exquilla.log.logBodies", true);
Services.prefs.setCharPref("mailnews.jsaccount.log.level", "Warn");
//Services.prefs.setBoolPref("mailnews.jsaccount.log.dump", true);

// disable features that cause a window
Services.prefs.setBoolPref("mail.biff.show_alert", false);

// load extension resources into test chrome
{
  let protHandler = Services.io
                       .getProtocolHandler("resource")
                       .QueryInterface(Components.interfaces.nsIResProtocolHandler);

  // Now let's try to load the exquilla resource
  let exquillaResource = protHandler.getSubstitution("gre").clone();
  if (Ci.nsIURIMutator) {
    exquillaResource = exquillaResource.mutate()
                         .setSpec(exquillaResource.spec + "extensions/exquilla@mesquilla.com/modules/")
                         .finalize();
  } else {
    exquillaResource.spec = exquillaResource.spec + "extensions/exquilla@mesquilla.com/modules/";
  }
  protHandler.setSubstitution("exquilla", exquillaResource);

  // calendar/lightning extension resource
  let calendarResource = protHandler.getSubstitution("gre").clone();

  if (Ci.nsIURIMutator) {
    calendarResource = calendarResource.mutate()
      .setSpec(calendarResource.spec + "extensions/{e2fda1a4-762b-4020-b5ad-a41df1933103}/")
      .finalize();
  } else {
    calendarResource.spec = calendarResource.spec + "extensions/{e2fda1a4-762b-4020-b5ad-a41df1933103}/";
  }
  protHandler.setSubstitution("calendar", calendarResource);

  // This is an attempt to work around Bug 619198 - nsStrictTransportSecurityService can be created off main thread and uses non-threadsafe nsPermissionManager
  //let sts = Components.classes["@mozilla.org/stsservice;1"]
  //                    .getService(Ci.nsIStrictTransportSecurityService);

  // Now we can load exquilla modules
  XPCOMUtils.defineLazyModuleGetter(this, "PromiseUtils",
                                    "resource://exquilla/PromiseUtils.jsm");

}

//Components.utils.import("resource://calendar/modules/calUtils.jsm");

function registerComponent(extension, name)
{
  let appDir = Services.dirsvc.get("GreD", Components.interfaces.nsIFile).clone();
  //do_print("appDir is " + appDir.path);
  try {
  appDir.append("extensions");
  appDir.append(extension);
  appDir.append("components");
  appDir.append(name);
  //do_print("componentsPath is " + appDir.path);
  Components.manager.nsIComponentRegistrar.autoRegister(appDir);
  }
  catch (e) {do_print(e + " Failed to register component " + extension + ": " + name);}
}

// register components. For some reason autoRegister does not seem to work on the directory
registerComponent("exquilla@mesquilla.com", "interfaces.manifest");

// borrowed from test_imapID.js which probably borrowed it from elsewhere
const XULAPPINFO_CONTRACTID = "@mozilla.org/xre/app-info;1";
const XULAPPINFO_CID = Components.ID("{7e10a36e-1085-4302-9e3f-9571fc003ee0}");
var gAppInfo = null;

function createAppInfo(id, name, version, platformVersion) {
  gAppInfo = {
    // nsIXULAppInfo
    vendor: "Mozilla",
    name: name,
    ID: id,
    version: version,
    appBuildID: "2007010101",
    platformVersion: platformVersion,
    platformBuildID: "2007010101",

    QueryInterface: XPCOMUtils.generateQI([Components.interfaces.nsIXULAppInfo,
                                           Components.interfaces.nsIXULRuntime,
                                           Components.interfaces.nsISupports])
  };

  var XULAppInfoFactory = {
    createInstance: function (outer, iid) {
      if (outer != null)
        throw Components.results.NS_ERROR_NO_AGGREGATION;
      return gAppInfo.QueryInterface(iid);
    }
  };
  var registrar = Components.manager.QueryInterface(Components.interfaces.nsIComponentRegistrar);
  registrar.registerFactory(XULAPPINFO_CID, "XULAppInfo",
                            XULAPPINFO_CONTRACTID, XULAppInfoFactory);

}

updateAppInfo();

registerComponent("exquilla@mesquilla.com", "jsComponents.manifest");
//registerComponent("skinkglue@mesquilla.com", "components.manifest");
//registerComponent("skinkglue@mesquilla.com", "interfaces.manifest");
registerComponent("exquilla@mesquilla.com", "datastoreComponent.manifest");
registerComponent("exquilla@mesquilla.com", "nativeComponents.manifest");

// register calendar components
/**/
let calex = "{e2fda1a4-762b-4020-b5ad-a41df1933103}";
registerComponent(calex, "calCompositeCalendar.manifest");
registerComponent(calex, "calDavCalendar.manifest");
registerComponent(calex, "calICSCalendar.manifest");
registerComponent(calex, "calImportExportModule.manifest");
registerComponent(calex, "calItemModule.manifest");
registerComponent(calex, "calItipEmailTransport.manifest");
registerComponent(calex, "calItipProtocolHandler.manifest");
registerComponent(calex, "calMemoryCalendar.manifest");
registerComponent(calex, "calStorageCalendar.manifest");
registerComponent(calex, "calWcapCalendarModule.manifest");
//  registerComponent(calex, "components.manifest");
registerComponent(calex, "interfaces.manifest");
registerComponent(calex, "lightningTextCalendarConverter.manifest");
registerComponent(calex, "calTimezoneService.manifest");
registerComponent(calex, "calBackendLoader.manifest");
/**/

// calendar locale (plus I added other chrome URLs to override)
let manifest = do_get_file('calendar_locale.manifest', true);
Components.manager.nsIComponentRegistrar.autoRegister(manifest);

var exquilla = {};

// dump a line of text;
function dl(text) {
  dump(text + "\n");
}

const NS_MSG_ERROR_FOLDER_SUMMARY_MISSING = 0x80550006;

function createEwsServer(aUsername, aHostname)
{ try {
  let acctMgr = Cc["@mozilla.org/messenger/account-manager;1"]
                  .getService(Ci.nsIMsgAccountManager);
  let dbService = Cc["@mozilla.org/msgDatabase/msgDBService;1"]
                    .getService(Ci.nsIMsgDBService);
  if (!aUsername) aUsername = "SomeUser";
  if (!aHostname) aHostname = 'ews.example.org';
  let server = acctMgr.createIncomingServer(aUsername, aHostname, "exquilla");
  Assert.ok(server instanceof Ci.nsIMsgIncomingServer);
  server.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.msqIEwsIncomingServer).useMail = true;
  let rootFolder = server.rootFolder;
  Assert.ok(rootFolder instanceof Ci.nsIMsgFolder);
  return server;
} catch (e) {dump('error in createEwsServer ' + e + '\n'); throw e;}}

// Maybe by now we cal load prefs?

{
  let appDir = Services.dirsvc.get("GreD", Components.interfaces.nsIFile);
  appDir.append('extensions');
  appDir.append('exquilla@mesquilla.com');
  Cu.import("resource://exquilla/extensionSupport.jsm");
  loadAddonPrefs(appDir);
}
