/*
 ***** BEGIN LICENSE BLOCK *****
 * This file is part of ExQuilla by Mesquilla.
 *
 * Copyright 2016 R. Kent James
 *
 * All Rights Reserved
 *
 * ***** END LICENSE BLOCK *****
 */

const EXPORTED_SYMBOLS = ["EwsNativeService"];

var Cu = Components.utils;
Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://exquilla/ewsUtils.jsm");
Utils.importLocally(this);
var _log = null;
XPCOMUtils.defineLazyGetter(this, "log", () => {
  if (!_log) _log = Utils.configureLogging("native");
  return _log;
});
XPCOMUtils.defineLazyModuleGetter(this, "Services",
                                  "resource://gre/modules/Services.jsm");

// List of mailboxes. This is the global ownership of mailboxes.
var gMailboxes = [];

function EwsNativeService() {
  Services.obs.addObserver(this, "quit-application", false);
}

EwsNativeService.prototype = {
  QueryInterface: XPCOMUtils.generateQI([Ci.msqIEwsNativeService,
                                         Ci.nsIObserver]),
  classInfo:       XPCOMUtils.generateCI({
                     classID: Components.ID("{5FE2C15D-590D-42A0-A2F9-C0D4AE2E3EAF}"),
                     classDescription: "ExQuilla native service",
                     contractID: "@mesquilla.com/ewsnativeservice;1",
                     interfaces: [Ci.msqIEwsNativeService, Ci.nsIObserver],
                     flags: Ci.nsIClassInfo.SINGLETON,
                   }),

  getExistingMailbox(aServerURI) {
    for (let mailbox of gMailboxes) {
      if (mailbox.serverURI == aServerURI)
        return mailbox;
    }
    return null;
  },

  getNativeMailbox(aServerURI) {
    let mailbox = this.getExistingMailbox(aServerURI);
    if (mailbox)
      return mailbox;

    // need to create a mailbox;
    log.info("Creating a new mailbox with URI " + aServerURI);
    mailbox = Cc["@mesquilla.com/ewsnativemailbox;1"]
                .createInstance(Ci.msqIEwsNativeMailbox);
    mailbox.serverURI = aServerURI;
    gMailboxes.push(mailbox);
    return mailbox;
  },

  removeNativeMailbox(aMailbox) {
    for (let i = 0; i < gMailboxes.length; i++) {
      if (gMailboxes[i].serverURI == aMailbox.serverURI) {
        gMailboxes.splice(i, 1);
        break;
      }
    }
  },

  promptUsernameAndPassword(domWindow, aLoginInfo) {
    log.debug("EwsNativeService.promptUsernameAndPassword");
    let username = aLoginInfo.username;
    let password = aLoginInfo.password;
    let hostname = aLoginInfo.hostname;
    aLoginInfo.httpRealm = hostname;

    let stringService = Cc["@mozilla.org/intl/stringbundle;1"]
                          .getService(Ci.nsIStringBundleService);

    let cdStringBundle = stringService.createBundle("chrome://global/locale/commonDialogs.properties");
    // "Authentication Required"
    let authenticationRequired = cdStringBundle.GetStringFromName("PromptUsernameAndPassword2");
    // "Enter Password For"
    let enterPasswordFor = cdStringBundle.formatStringFromName("EnterPasswordFor", [username, hostname], 2);

    let pmStringBundle = stringService.createBundle("chrome://passwordmgr/locale/passwordmgr.properties");
    // "Use Password Manager to remember this password."
    let rememberPassword = pmStringBundle.GetStringFromName("rememberPassword");

    let checkValue = Services.prefs.getBoolPref("extensions.exquilla.savepassword");
    let checkValueObj = { value: checkValue};
    let usernameObj = { value: username};
    let passwordObj = { value: password};

    let wasOK = Services.prompt.promptUsernameAndPassword(domWindow,
                                                          authenticationRequired,
                                                          enterPasswordFor,
                                                          usernameObj,
                                                          passwordObj,
                                                          rememberPassword,
                                                          checkValueObj);
    if (wasOK) {
      username = usernameObj.value || username;
      password = passwordObj.value || password;
      log.config("msqEwsNativeService.promptUsernameAndPassword saving password for username " +
                 username + "> hostname <" + hostname);
      aLoginInfo.username = username;
      aLoginInfo.password = password;

      if (checkValue != checkValueObj.value) {
        checkValue = checkValueObj.value;
        Services.prefs.setBoolPref("extensions.exquilla.savepassword", checkValue);
      }

      // store in password manager
      if (checkValue)
      {
        aLoginInfo.usernameField = "";
        aLoginInfo.passwordField = "";

        // search for existing logins, and remove them if found
        let logins = Services.logins.findLogins({}, hostname, "", hostname);
        for (let login of logins) {
          if (login.username == aLoginInfo.username) {
            log.config("Removing existing saved login for hostname " + hostname +
                       " username " + login.username);
            Services.logins.removeLogin(login);
          }
        }

        Services.logins.addLogin(aLoginInfo);
      }
    }
    return wasOK;
  },

  observe(aSubject, aTopic, aData) {
    if (aTopic == "quit-application")
    {
      Services.obs.removeObserver(this, "quit-application");
      for (let mailbox of gMailboxes)
      {
        mailbox.shutdown();
      }
    }
  },
}
