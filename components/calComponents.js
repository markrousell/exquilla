/*
 ***** BEGIN LICENSE BLOCK *****
 * This file is part of ExQuilla by Mesquilla.
 *
 * Copyright 2010 R. Kent James
 *
 * All Rights Reserved
 *
 * ***** END LICENSE BLOCK *****
 */
 
// This file defines components used as the Colonial-layer calendar
//  for ExQuilla.
 
const { classes: Cc, Constructor: CC, interfaces: Ci, utils: Cu, Exception: CE, results: Cr, } = Components;
Cu.import("resource://gre/modules/XPCOMUtils.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "Utils",
  "resource://exquilla/ewsUtils.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "Services",
  "resource://gre/modules/Services.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "MailServices",
  "resource:///modules/mailServices.js");
var _log = null;
XPCOMUtils.defineLazyGetter(this, "log", () => {
  if (!_log) _log = Utils.configureLogging("calendar");
  return _log;
});

let global = this;
function Calendar()
{ 
  if (typeof (safeGetInterface) == "undefined")
    Utils.importLocally(global);
  try {
  if (typeof (EwsCalendar) == "undefined")
  {
    Cu.import("resource://exquilla/ewsUtils.jsm");
    Utils.importLocally(global);
    Cu.import("resource://exquilla/ewsCalendar.jsm");
  }
  this.__proto__ = EwsCalendar.prototype;
  EwsCalendar.call(this);
} catch(e) {Cu.reportError(e);}}

Calendar.prototype = {
  classID:          Components.ID("{A91EBE7F-DD10-428d-AE1D-988DD1F84492}"),
}

// xxx todo: this should really be a service
function CalUtils()
{ try {
  if (typeof (EwsCalendar) == "undefined")
  {
    Cu.import("resource://exquilla/ewsUtils.jsm");
    Utils.importLocally(global);
    Cu.import("resource://exquilla/ewsCalendar.jsm");
  }
  this.__proto__ = EwsCalUtils.prototype;
  EwsCalUtils.call(this);
} catch(e) {Cu.reportError(e);}}

CalUtils.prototype = {
  classID: Components.ID("{76D5E2A4-37FE-4870-9E30-0C7E993D6455}"),
}

var components = [Calendar, CalUtils];  
if (XPCOMUtils.generateNSGetFactory)
  var NSGetFactory = XPCOMUtils.generateNSGetFactory(components);
else
  var NSGetModule = XPCOMUtils.generateNSGetModule(components);
