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

XPCOMUtils.defineLazyModuleGetter(this, "ewsActivityModule",
  "resource://exquilla/ewsActivity.js");

function ewsActivity()
{
}

ewsActivity.prototype = {
  classDescription: "Mesquilla Ews Activity Listener",
  classID:          Components.ID("{C79DE0F9-15A6-46fb-8E86-036F7861BDD2}"),
  contractID:       "@mesquilla.com/ewsactivitylistener;1",
  QueryInterface:   XPCOMUtils.generateQI([Ci.msqIEwsActivityListener]),

  /**
   * Notification that a folder sync has started.
   *
   * @param aFolder folder in which the download is started.
   */
  onDownloadStarted: function onDownloadStarted(aFolder) {
    ewsActivityModule.onDownloadStarted(aFolder);
  },

  /**
   * Notification about download progress.
   *
   * @param aFolder folder in which the download is happening.
   * @param aNumDownloaded number of the messages that have been downloaded.
   * @param aTotalToDownload total number of messages to download.
   */
  onDownloadProgress: function onDownloadProgress(aFolder, aNumDownloaded, aTotalToDownload) {
    ewsActivityModule.onDownloadProgress(aFolder, aNumDownloaded, aTotalToDownload);
 },

  /**
   * Notification that a download has completed.
   *
   * @param aFolder folder to which the download has completed.
   * @param aNumberOfMessages number of the messages that were downloaded.
   */
  onDownloadCompleted: function onDownloadCompleted(aFolder, aNumberOfMessages) {
    ewsActivityModule.onDownloadCompleted(aFolder, aNumberOfMessages);
  },

 /**
   * Notification that a previously started downloaded was aborted.
   * @param aFolder folder to which the download has completed.
   * @param aMessage  abort message
   */
  onDownloadAborted: function onDownloadAborted(aFolder) {
    ewsActivityModule.onDownloadAborted(aFolder);
  },

  onCopyStarted: function onCopyStarted(aFolder, aNumberOfMessages, aIsMove) {
    ewsActivityModule.onCopyStarted(aFolder, aNumberOfMessages, aIsMove);
  },

  showStatus: function showStatus(aMessage) {
    ewsActivityModule.showStatus(aMessage);
  },

  showFailed: function showFailed() {
    ewsActivityModule.showFailed();
  },

}

var NSGetFactory = XPCOMUtils.generateNSGetFactory([ewsActivity]);
