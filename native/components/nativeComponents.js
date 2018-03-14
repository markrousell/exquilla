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

const { classes: Cc, Constructor: CC, interfaces: Ci, utils: Cu, Exception: CE, results: Cr, } = Components;
Cu.import("resource://gre/modules/XPCOMUtils.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "Utils",
  "resource://exquilla/ewsUtils.jsm");
var _log = null;
XPCOMUtils.defineLazyGetter(this, "log", () => {
  if (!_log) _log = Utils.configureLogging("native");
  return _log;
});

XPCOMUtils.defineLazyModuleGetter(this, "EwsNativeFolder",
                                  "resource://exquilla/EwsNativeFolder.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "EwsNativeMachine",
                                  "resource://exquilla/EwsNativeMachine.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "StringArray",
                                  "resource://exquilla/StringArray.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "PropertyList",
                                  "resource://exquilla/PropertyList.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "EwsNativeService",
                                  "resource://exquilla/EwsNativeService.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "EwsNativeAttachment",
                                  "resource://exquilla/EwsNativeAttachment.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "EwsNativeMailbox",
                                  "resource://exquilla/EwsNativeMailbox.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "EwsNativeItem",
                                  "resource://exquilla/EwsNativeItem.jsm");

var global = this;

function nativeMailboxComponent()
{
  EwsNativeMailbox.call(this);
}

nativeMailboxComponent.prototype = {
  classID:         Components.ID("{6F3A2233-4FF4-4810-8727-2DC658BA7600}"),
  __proto__:       EwsNativeMailbox.prototype,
}


function nativeAttachmentComponent()
{
  EwsNativeAttachment.call(this);
}

nativeAttachmentComponent.prototype = {
  classID:         Components.ID("{78415047-8577-46B4-9CEC-6B9FB2B3580F}"),
  __proto__:       EwsNativeAttachment.prototype,
}

function nativeItemComponent()
{
  EwsNativeItem.call(this);
}

nativeItemComponent.prototype = {
  classID:         Components.ID("{BE4E14E9-308D-41E2-92D7-E4F920776684}"),
  __proto__:       EwsNativeItem.prototype,
}

function nativeServiceComponent()
{
  EwsNativeService.call(this);
}

nativeServiceComponent.prototype = {
  classID:         Components.ID("{5FE2C15D-590D-42A0-A2F9-C0D4AE2E3EAF}"),
  __proto__:       EwsNativeService.prototype,
}

function stringArrayComponent()
{
  StringArray.call(this);
}

stringArrayComponent.prototype = {
  classID:         Components.ID("{370A1309-257C-48D7-88B0-012912AAEE7D}"),
  __proto__:       StringArray.prototype,
}

function propertyListComponent()
{
  PropertyList.call(this);
}

propertyListComponent.prototype = {
  classID:         Components.ID("{2671A21A-990F-4D32-954E-B8546539863F}"),
  __proto__:       PropertyList.prototype,
}

function nativeFolderComponent()
{
  EwsNativeFolder.call(this);
}

nativeFolderComponent.prototype = {
  classID:          Components.ID("{9E5D1E43-077F-4a18-8755-EA5E0CF65A1E}"),
  __proto__:        EwsNativeFolder.prototype,
}

function nativeMachineComponent()
{
  EwsNativeMachine.call(this);
}

nativeMachineComponent.prototype = {
  classID:          Components.ID("{35EDFFE3-8533-4bb1-81D2-DE2A6AC24892}"),
  __proto__:        EwsNativeMachine.prototype,
}

// This object is used to chain event listeners for async calls
function ewsChainListener()
{
  this._head = null;
  this._tail = null;
}

ewsChainListener.prototype = {
  classID:          Components.ID("{F3B84F64-CD6B-4f02-93C8-801C98CB15F3}"),
  QueryInterface:   XPCOMUtils.generateQI([Components.interfaces.msqIEwsChainListener,
                                           Components.interfaces.msqIEwsEventListener]),
  get head()  { return this._head;},
  set head(a) { this._head = a;},
  get tail()  { return this._tail;},
  set tail(a) { this._tail = a;},
  onEvent: function _onEvent(aItem, aEvent, aData, aResult) { try {
    if (this._head)
      this._head.onEvent(aItem, aEvent, aData, aResult);
    if (this._tail)
      this._tail.onEvent(aItem, aEvent, aData, aResult);
  } catch (e) {log.warn('listener return error ' + e);}},
}

var components = [nativeFolderComponent,
                  nativeMachineComponent,
                  ewsChainListener,
                  stringArrayComponent,
                  propertyListComponent,
                  nativeServiceComponent,
                  nativeMailboxComponent,
                  nativeItemComponent,
                  nativeAttachmentComponent];
var NSGetFactory = XPCOMUtils.generateNSGetFactory(components);
