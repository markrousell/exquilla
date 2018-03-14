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

/* ***** ATTENTION CRACKERS *****
 *
 * Yes, it is all here, everything that you need to know to generate
 * fake ExQuilla licenses. But there's been a crack on the web for a couple
 * of years, so this is not all that new.
 *
 * In case you are not aware, I put much of my time into helping the core
 * Thunderbird project survive, and this addon is how I pay for that work.
 * So how about a little favor. Just use your cleverness to provide crack
 * codes for yourself, and don't use the information here to broadly "help"
 * the rest of the world generate crack codes. Thunderbird is free after all,
 * due to the efforts of people like me and others. So please just help
 * yourself without adding your own effort to bring Thunderbird down
 * by undermining my source of income.
 *
 * If you really want to help the cause of free software, since you were
 * clever enough to find this code, why don't you come join us and help
 * build a better Thunderbird? Heck, I'll even give you free legitimate
 * ExQuilla licenses if you just help a little with the core product!
 *
 * R. Kent James,
 * ExQuilla Developer and Member of the Thunderbird Council
 */

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;
Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource:///modules/mailServices.js");
Cu.import("resource://exquilla/ewsUtils.jsm");
Utils.importLocally(this);

XPCOMUtils.defineLazyModuleGetter(this, "StringArray",
                                  "resource://exquilla/StringArray.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "Preferences",
                                  "resource://gre/modules/Preferences.jsm");

var EXPORTED_SYMBOLS = ["LicenseVerify"];
const GRACE_PERIOD_SECONDS = (61*24*3600);

var _log = null;
XPCOMUtils.defineLazyGetter(this, "log", () => {
  if (!_log) _log = Utils.configureLogging("license");
  return _log;
});

var gSessionLicense = false;
const SALT = "356B4B5C";
var gInited = false;

function LicenseVerify () {
}

LicenseVerify.prototype = {
  QueryInterface: XPCOMUtils.generateQI([Ci.msqIEwsLicenseVerify]),
  classInfo:       XPCOMUtils.generateCI({
                     classID: Components.ID("{3E2AE969-D8AB-47D4-BA01-2EE9E64A5646}"),
                     classDescription: "ExQuilla stub license verify",
                     contractID: "@mesquilla.com/licenseverify;1",
                     interfaces: [Ci.msqIEwsLicenseVerify],
                     flags: 0,
                   }),

  //long licenseStatus(in ACString aLicense, out ACString aType, out ACString aEmail, out PRTime aExpiration)
  licenseStatus(aLicense, aType, aEmail, aExpiration) {
    let licenseStatus = Ci.msqIEwsLicenseVerify.LICENSE_INVALID;

    try {
      let licenseSplit = aLicense.split(",");
      aType.value = licenseSplit[0];
      aEmail.value = licenseSplit[1];
      let expireDate = licenseSplit[2];
      let hash = licenseSplit[3];

      // check the hash
      let payload = [aType.value, aEmail.value, expireDate, SALT].join(",");
      let expectedHash = md5Hash(payload);

      // add 8 hours grace to deal with time zones
      aExpiration.value = Date.parse(expireDate) + 8*3600*1000; // milliseconds
      let expirationSeconds = aExpiration.value/1000;
      let nowSeconds = Date.now()/1000;


      do { // break when license status established
        // are we expired? Allow 36 hours of grace to deal with log.config zone issues.
        if (expirationSeconds + 3600*36 < (nowSeconds))
        {
          licenseStatus = Ci.msqIEwsLicenseVerify.LICENSE_EXPIRED;
          log.config("license is expired");
          break;
        }

        if (expectedHash != hash) {
          log.config("License hash invalid");
          licenseStatus = Ci.msqIEwsLicenseVerify.LICENSE_INVALID;
          break;
        }

        // A universal license, which is generated internally, should never be valid for more than 65 days.
        const OVER_GRACE_PERIOD_SECONDS = (65*24*3600);
        if (aEmail.value == "*@*" && expirationSeconds > (nowSeconds + OVER_GRACE_PERIOD_SECONDS)) {
          log.config("Temporary license has invalid expiration date");
          licenseStatus = Ci.msqIEwsLicenseVerify.LICENSE_INVALID;
          break;
        }

        // Are we expiring soon? Soon is within 21 days.
        const EXPIRING_SOON_SECONDS = (21*24*3600);
        if (expirationSeconds < (nowSeconds + EXPIRING_SOON_SECONDS)) {
          log.config("license is expiring soon");
          licenseStatus = Ci.msqIEwsLicenseVerify.LICENSE_EXPIRES_SOON;
          break;
        }

        // Does the email match?
        if (!checkValidEmail(aEmail.value)) {
          log.config("email does not match");
          licenseStatus = Ci.msqIEwsLicenseVerify.LICENSE_NOMATCH;
          break;
        }

        log.config("license is valid");
        licenseStatus = Ci.msqIEwsLicenseVerify.LICENSE_VALID;

      } while(false);
    } catch (ex) { log.info("Error getting license statue: " + ex);}
    return licenseStatus;
  },

  // initialize licensing
  // void init();
  init() {
    // Grace period for initial license, 61 days
    if (gInited)
      return;
    log.config("Initializing EWS Licensing");
    gInited = true;

    // initialize default license

    // preference "extensions.exquilla.p1" is the first install time in seconds
    let nowSeconds = Date.now()/1000;
    let p1 = Preferences.get("extensions.exquilla.p1", 0);
    if (!p1)
    {
      // initialize
      p1 = nowSeconds;
      Preferences.set("extensions.exquilla.p1", Math.round(p1));
      log.config("EWS P1 set to", Preferences.get("extensions.exquilla.p1", 0));
    }

    // create a default license if missing
    let license = Preferences.get("extensions.exquilla.license", "");
    if (!license && (nowSeconds - p1 < GRACE_PERIOD_SECONDS) )
    {
      license = makeTempLicense();
      log.config("Temporary license created: " + license);
      Preferences.set("extensions.exquilla.license", license);
    }
    log.config("License string is " + Preferences.get("extensions.exquilla.license", ""));
  },

  // Allow access with invalid license for this session only
  // boolean enableSessionLicense();
  enableSessionLicense() {gSessionLicense = true;},

  //readonly attribute boolean sessionLicense;
  get sessionLicense() { return gSessionLicense;},

  // list of valid EWS email addresses
  // readonly attribute msqIStringArray validEwsEmails;
  get validEwsEmails() {
    let emails = new StringArray();
    let accounts = MailServices.accounts.accounts;
    for (let i = 0; i < accounts.length; i++) {
      let account = accounts.queryElementAt(i, Ci.nsIMsgAccount);
      // make sure this is an ews account;
      let ewsServer = safeGetInterface(account.incomingServer, Ci.msqIEwsIncomingServer);
      if (!ewsServer)
        continue;
      emails.append(ewsServer.email);
    }
    return emails;
  },
}

// Is the email from the license valid?
function checkValidEmail(aEmail) {
  if (aEmail == "*@*") {
    // a universal license
    return true;
  }

  let licensedDomain = aEmail.startsWith("*@") ?
                         aEmail.substring(2).toLowerCase() :
                         "";
  let identities = MailServices.accounts.allIdentities;
  for (let i = 0; i < identities.length; i++) {
    let identity = identities.queryElementAt(i, Ci.nsIMsgIdentity);
    let emailCandidate = identity.email || "";
    if (licensedDomain) {
      // check for a domain match
      let ambersandIndex = emailCandidate.indexOf("@");
      if (ambersandIndex > 0) {
        let domain = emailCandidate.substring(ambersandIndex + 1);
        if (domain.toLowerCase() == licensedDomain) {
          return true;
        }
      }
    }
    if (aEmail.toLowerCase() == emailCandidate.toLowerCase()) {
      return true;
    }
  }
  return false;
}

function makeTempLicense() {
  let expiration = new Date(Date.now() + GRACE_PERIOD_SECONDS*1000);
  let date = expiration.toISOString().substring(0, 10);
  let type = "EX0";
  let email = "*@*";
  log.config("Creating temporary license to expire " + date);

  let tempPayload = [type, email, date, SALT].join(",");
  return [type, email, date, md5Hash(tempPayload)].join(",");
}

function md5Hash(aContent, aHashHex)
{
  let payload = aContent;

  let converter = Cc["@mozilla.org/intl/scriptableunicodeconverter"]
                     .createInstance(Ci.nsIScriptableUnicodeConverter);
  converter.charset = "UTF-8";

  let byteArray = converter.convertToByteArray(payload, {});

  let crypto = Cc["@mozilla.org/security/hash;1"].createInstance(Ci.nsICryptoHash);
  crypto.init(Ci.nsICryptoHash.MD5);
  crypto.update(byteArray, byteArray.length);
  let hash = crypto.finish(false);
  // Convert the binary hash data to a hex string.
  return Array.from(hash, (c, i) => toHexString(hash.charCodeAt(i))).join("");
}
// Testing only
LicenseVerify.md5Hash = md5Hash;

// Return the two-digit hexadecimal code for a byte.
function toHexString(charCode) {
  return ("0" + charCode.toString(16)).slice(-2);
}
