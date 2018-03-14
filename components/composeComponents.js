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
 
// This file defines components used by compose

// XXX obsolete and not used, delete
 
const { utils: Cu } = Components;
Cu.import("resource://gre/modules/XPCOMUtils.jsm");

function ewsComposeComponent()
{
  Cu.import("resource://exquilla/compose.js");
  this.__proto__ = EwsCompose.prototype;
  EwsCompose.call(this);
}

ewsComposeComponent.prototype = {
  classID:          Components.ID("{2A225206-3733-4211-A806-9CF3BC93FF78}"),
}

var NSGetFactory = XPCOMUtils.generateNSGetFactory([ewsComposeComponent]);
