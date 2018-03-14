/*
 ***** BEGIN LICENSE BLOCK *****
 * This file is part of ExQuilla by Mesquilla.
 *
 * Copyright 2010, 2016 R. Kent James
 *
 * All Rights Reserved
 *
 * ***** END LICENSE BLOCK *****
 */
 
const { utils: Cu } = Components;
Cu.import("resource://gre/modules/XPCOMUtils.jsm");

XPCOMUtils.defineLazyModuleGetter(this, "EwsDataStore",
  "resource://exquilla/datastore.js");

function ds()
{
  EwsDataStore.call(this);
}

ds.prototype = {
  classID:          Components.ID("{B9EABBF5-8E0A-46cc-B8C9-5313D4AC7B17}"),
  __proto__:        EwsDataStore.prototype,
}

var NSGetFactory = XPCOMUtils.generateNSGetFactory([ds]);
