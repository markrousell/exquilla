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

const EXPORTED_SYMBOLS = ["StringArray"];

var Cu = Components.utils;
Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://exquilla/ewsUtils.jsm");
Utils.importLocally(this);

function StringArray() {
  this._a = [];
}

StringArray.prototype = {
  // Used to access an instance as JS, bypassing XPCOM.
  get wrappedJSObject() {
    return this;
  },
  QueryInterface: XPCOMUtils.generateQI([Ci.msqIStringArray]),
  classInfo:       XPCOMUtils.generateCI({
                     classID: Components.ID("{370A1309-257C-48D7-88B0-012912AAEE7D}"),
                     classDescription: "ExQuilla string array",
                     contractID: "@mesquilla.com/stringarray;1",
                     interfaces: [Ci.msqIStringArray],
                     flags: 0,
                   }),
  get length() { return this._a.length;},
  assignAt(index, value) {
    // make sure we have elements
    while (index >= this._a.length) {
      this._a.push(null);
    }
    this._a[index] = value;
  },
  getAt(index) { return this._a[index];},
  removeAt(index) { this._a.splice(index, 1); },
  indexOf(value) {
    let result = this._a.indexOf(value);
    return (result == -1 ? Ci.msqIStringArray.noIndex : result);
  },
  get isEmpty() { return this._a.length == 0;},
  append(value) { this._a.push(value);},
  clear() { this._a.length = 0;},
}
