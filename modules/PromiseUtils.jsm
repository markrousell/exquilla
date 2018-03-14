/*
 ***** BEGIN LICENSE BLOCK *****
 * This file is part of ExQuilla by Mesquilla.
 *
 * Copyright 2014 R. Kent James
 *
 * All Rights Reserved
 *
 * ***** END LICENSE BLOCK *****
 */

/**
 *  These methods wrap various Skink and EwsNative events with promises. As a
 *  general plan, we capture errors and use Skink or EwsNative methods to
 *  return error codes from resolved promises on errors.
 */

var EXPORTED_SYMBOLS = ["PromiseUtils"];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;
const Cr = Components.results;
const CE = Components.Exception;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/Task.jsm");
Cu.import("resource://gre/modules/NetUtil.jsm");
Cu.import("resource:///modules/mailServices.js");
XPCOMUtils.defineLazyModuleGetter(this, "StringArray",
                                  "resource://exquilla/StringArray.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "PropertyList",
                                  "resource://exquilla/PropertyList.jsm");

var PromiseUtils = {};

// PromiseBase can be adjusted to use ECMA5 or ECMA6 Promises
function PromiseBase() {
  this.promise = new Promise((resolve, reject) => {
    this._resolve = resolve;
    this._reject = reject;
  });
}
PromiseUtils.PromiseBase = PromiseBase;

PromiseUtils.EwsEventListener = function EwsEventListener(aFinalEvent, aWrapped) {
  PromiseBase.call(this);
  this._wrapped = aWrapped || null;
  this._finalEvent = aFinalEvent;
}

// We don't use the XPCOMUtils QueryInterface because I traced an issue where the
// QI function was being created before msqIEwsEventListener was known, resulting
// in a failed QI method.
PromiseUtils.EwsEventListener.prototype = {
  QueryInterface:   function(iid)
  {
    if (iid.equals(Ci.msqIEwsEventListener) || iid.equals(Ci.nsISupports))
      return this;
    throw Cr.NS_ERROR_NO_INTERFACE;
  },
  onEvent: function onEvent(aItem, aEvent, aData, aResult) {
    try {
      if (this._wrapped)
        this._wrapped(aItem, aEvent, aData, aResult);
    }
    catch (e) {Cu.reportError(e);}
    finally {
      // fire on event or event with "Fake" suffix, used by datastore
      if ( (aEvent == this._finalEvent) || (aEvent == "Fake" + this._finalEvent) )
        this._resolve({item: aItem, data: aData, status: aResult});
    }
  },
};

PromiseUtils.MachineListener = function MachineListener(aWrapped) {
  PromiseUtils.EwsEventListener.call(this, "StopMachine", aWrapped);
}

PromiseUtils.MachineListener.prototype = Object.create(PromiseUtils.EwsEventListener.prototype);

PromiseUtils.DatastoreListener = function DatastoreListener(aWrapped) {
  PromiseUtils.EwsEventListener.call(this, "StatementComplete", aWrapped);
}

PromiseUtils.DatastoreListener.prototype = Object.create(PromiseUtils.EwsEventListener.prototype);

// Note this does not follow the typical pattern of the listener being the
// same type. The listener is msqIEwsEventListener, not msqIEwsSoapResponse
PromiseUtils.SoapResponse = function SoapResponse(aListener) {
  PromiseBase.call(this);
  this.listener = aListener; // msqIEwsEventListener or msqIEwsSoapResponse
  this.responseCode = "";
  this.passwordChanged = false;
}

PromiseUtils.SoapResponse.prototype = {

  // interface msqIEwsSoapResponse : nsISupports
  QueryInterface:   function(iid)
  {
    if (iid.equals(Ci.msqIEwsSoapResponse) || iid.equals(Ci.nsISupports))
      return this;
    throw Cr.NS_ERROR_NO_INTERFACE;
  },

  onStartRequest: function _onStartRequest(aRequest, aContext) {
    try {
      if (this.listener)
        this.listener.onEvent(aRequest, "StartRequest", null, Cr.NS_OK);
    } catch (e) { Cu.reportError(e);}
  },

  onNotify: function _onNotify(aRequest, aData, aStatus) {
    try {
      if (this.listener)
        this.listener.onEvent(aRequest, "SoapNotify", aData, aStatus);
    } catch (e) { Cu.reportError(e);}
  },

  onStopRequest: function _onStopRequest(aRequest, aContext, aStatusCode) {
    try {
      if (this.listener)
        this.listener.onEvent(aRequest, "StopRequest", null, aStatusCode);
    }
    catch (e) {Cu.reportError(e);}
    finally {
      this._resolve({event: "StopRequest", request: aRequest, status: aStatusCode, responseCode: this.responseCode});
    }
  },

  errorResponse: function _errorResponse(aRequest, aContext, aResponseError, aResponseCode, aMessageText)
  {
    this.responseCode = aResponseCode;
    try {
      if (this.listener) {
        let responseStrings = new StringArray();
        responseStrings.append(aResponseError);
        responseStrings.append(aResponseCode);
        responseStrings.append(aMessageText);
        this.listener.onEvent(aRequest, "SoapResponseError", responseStrings, Cr.NS_OK);
      }
    } catch (e) { Cu.reportError(e);}
  },

};

PromiseUtils.UrlListener = function(aWrapped) {
  PromiseBase.call(this);
  this.wrapped = aWrapped;
};

PromiseUtils.UrlListener.prototype = {
  QueryInterface:   function(iid)
  {
    if (iid.equals(Ci.nsIUrlListener) || iid.equals(Ci.nsISupports))
      return this;
    throw Cr.NS_ERROR_NO_INTERFACE;
  },

  OnStartRunningUrl: function(aUrl) {
    if (this.wrapped && ("OnStartRunningUrl" in this.wrapped))
      this.wrapped.OnStartRunningUrl(aUrl);
  },
  OnStopRunningUrl: function(aUrl, aExitCode) {
    if (this.wrapped && ("OnStopRunningUrl" in this.wrapped))
      this.wrapped.OnStopRunningUrl(aUrl, aExitCode);
    this._resolve(aExitCode);
  },
};

PromiseUtils.RequestObserver = function(aWrapped) {
  PromiseBase.call(this);
  this.wrapped = aWrapped;
}
PromiseUtils.RequestObserver.prototype = {
  QueryInterface: XPCOMUtils.generateQI([Ci.nsIStreamListener,
                                         Ci.nsIRequestObserver]),

  onStartRequest(aRequest, aContext) {
    if (this.wrapped && this.wrapped.onStartRequest)
      this.wrapped.onStartRequest(aRequest, aContext);
  },

  // you really SHOULD wrap onDataAvailable for this to make sense
  onDataAvailable(aRequest, aContext, aInputStream, aOffset, aCount) {
    if (this.wrapped && this.wrapped.onDataAvailable)
      this.wrapped.onDataAvailable(aRequest, aContext, aInputStream, aOffset, aCount);
  },

  onStopRequest(aRequest, aContext, aStatusCode) {
    if (this.wrapped && this.wrapped.onStopRequest)
      this.wrapped.onStopRequest(aRequest, aContext, aStatusCode);
    if (aStatusCode == Cr.NS_OK)
      this._resolve();
    else
      this._reject(aStatusCode);
  },
}

/**
 * promiseAsyncFetch - wrapper around NetUtil's asyncFetch to get an input stream from a file or url
 *
 * returns - promise that yields {status: nsresult, inputStream: nsIInputStream, request:  nsIRequest}
 */
PromiseUtils.promiseAsyncFetch = function(aFile) {
  let channel;
  if (aFile instanceof Ci.nsIFile) {
    channel = NetUtil.newChannel({
      uri: NetUtil.ioService.newFileURI(aFile),
      loadUsingSystemPrincipal: true
    });
  }
  let base = new PromiseBase();
  NetUtil.asyncFetch(channel || aFile, function _asyncFetchCallback(inputStream, status, request) {
    base._resolve({status: status, inputStream: inputStream, request: request});
  });
  return base.promise;
}

PromiseUtils.promiseAutodiscover = function promiseAutodiscover
  (aEmail, aUsername, aDomain, aPassword, aSavePassword, aWindow, aSiteCallback)
{
  if (typeof EwsAutoDiscover == "undefined")
    Cu.import("resource://exquilla/autodiscover.js");

  let base = new PromiseBase();
  let adListener = {
    handleAutodiscover: function _handleAutodiscover(aStatus, aResult, aDisplayName, aFoundSite)
    {
      base._resolve({htmlStatus: aStatus,
                     status: aFoundSite ? Cr.NS_OK : Cr.NS_ERROR_FAILURE,
                     ewsUrl: aResult.mEwsUrl,
                     internalEwsUrl: aResult.mInternalEwsUrl,
                     ewsOWAGuessUrl: aResult.mEwsOWAGuessUrl,
                     displayName: aDisplayName,
                     foundSite: aFoundSite});
    }
  };

  EwsAutoDiscover.doAutodiscover(aEmail, aUsername, aDomain, aPassword, aSavePassword, adListener, aWindow, aSiteCallback);
  return base.promise;
}

PromiseUtils.PromiseLimit = function PromiseLimit(aLimit)
{
  this._limit = aLimit;
  this._activeCount = 0;
  this._resolve = null;
  this._reject = null;
  this.rejected = false;
  this.rejectedValue = undefined;
}

PromiseUtils.PromiseLimit.prototype = {
  queue: function add(aPromise)
  {
    // returns a promise that resolves when length of unresolved
    // promise queue is less than the limit.
    this._activeCount++;
    if (this.rejected)
    {
      this.rejected = false;
      return Promise.reject(this.rejectedValue);
    }

    aPromise.then(
      aValue =>
      {
        this._activeCount--;
        if (this._resolve) {
          this._resolve();
          this._reject = null;
          this._resolve = null;
        }
      },
      aValue =>
      {
        this._activeCount--;
        if (this._reject) {
          this._reject(aValue);
          this._reject = null;
          this._resolve = null;
        }
        else {
          this.rejected = true;
          this.rejectedValue = aValue;
        }
      }
    );

    if (this._activeCount < this._limit)
      return Promise.resolve();
    let promise = new Promise((resolve, reject) => {
      this._resolve = resolve;
      this._reject = reject;
    });
    return promise;
  }
}

/**
 * Timer to resolve a promise after a delay
 *
 * @param aDelay    delay in milliseconds
 * @return          promise that resolves after the delay
 */

PromiseUtils.promiseDelay = function promiseDelay(aDelay)
{
  return new Promise((resolve, reject) => {
    let timer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
    timer.initWithCallback(resolve, aDelay, Ci.nsITimer.TYPE_ONE_SHOT);
  });
}

/**
 * Observe an event.
 *
 * @param   nsISupports expected subject (or false)
 * @param   string expected topic
 * @param   string expected data (or false)
 * @return  promise after observation
 */

PromiseUtils.promiseObservation = function promiseObservation(aSubject, aTopic, aData)
{
  return new Promise((resolve, reject) => {
    let observer = {
      observe: function(subject, topic, data) {
        if (topic == aTopic &&
            (!aSubject || (aSubject === subject)) &&
            (!aData || (data == aData))) {
          Services.obs.removeObserver(this, topic);
          resolve();
        }
      }
    }
    Services.obs.addObserver(observer, aTopic, false);
  });
}

PromiseUtils.promiseAbItemAdded = function promiseAbItemAdded(aDirectory)
{
  return new Promise((resolve, reject) => {
    let listener = {
      onItemAdded: function(parentDir, item) {
        if (aDirectory === parentDir) {
          MailServices.ab.removeAddressBookListener(this);
          resolve(item);
        }
        else {
          dump("item mismatch in PromiseUtils.promiseAbItemAdded onItemAdded, parentDir is " + parentDir + "\n");
          dump(" aDirectory is " + aDirectory + "\n");
        }
      },
    };
    MailServices.ab.addAddressBookListener(listener, Ci.nsIAbListener.itemAdded);
  });
}

PromiseUtils.promiseAbItemsDeleted = function promiseAbItemsDeleted(aDirectory, aCount)
{
  let count = 0;
  return new Promise((resolve, reject) => {
    let listener = {
      onItemRemoved: function(parentDir, item) {
        if (aDirectory === parentDir) {
          count++;
          if (count >= aCount) {
            MailServices.ab.removeAddressBookListener(this);
            resolve();
          }
        }
        else {
          dump("item mismatch in PromiseUtils.promiseAbItemsDeleted onItemAdded, parentDir is " + parentDir + "\n");
          dump(" aDirectory is " + aDirectory + "\n");
        }
      },
    };
    MailServices.ab.addAddressBookListener(listener, Ci.nsIAbListener.directoryItemRemoved);
  });
}

// promiseSoalCall: Make a call to msqIEwsSoapRequest with name: aMethodName and optional
// parameters

// testing purposes only
PromiseUtils.doError = 0;

PromiseUtils.promiseMachineCall = Task.async(
  function* taskMachineCall(aMailbox, aListener, aMethodName, ...methodParms)
  {
    let result = {status: Cr.NS_ERROR_FAILURE};
    try {
      let machineListener = new PromiseUtils.MachineListener(aListener);
      methodParms.push(machineListener);
      aMailbox[aMethodName].apply(aMailbox, methodParms);
      result = yield machineListener.promise;
    }
    catch (e) {dump(aMethodName + " error: " + e + "\n");}
    finally { return result;}
  }
);

PromiseUtils.promiseSoapCall = Task.async(
  function* taskSoapCall(aMailbox, aListener, aMethodName, ...methodParms)
  {
    let result = {status: Cr.NS_ERROR_FAILURE};
    try {
      let request = Cc["@mesquilla.com/ewssoaprequest;1"]
                      .createInstance(Ci.msqIEwsSoapRequest);
      request.mailbox = aMailbox;
      if (PromiseUtils.doError != 0)
        request.doError = PromiseUtils.doError;
      let soapResponse = new PromiseUtils.SoapResponse(aListener);
      methodParms.unshift(soapResponse);
      request[aMethodName].apply(request, methodParms);
      request.invoke();
      result = yield soapResponse.promise;
    }
    catch (e) {dump(aMethodName + " error: " + e + "\n");}
    finally {
      return result;
    }
  }
);

PromiseUtils.promiseFolderAdded = function promiseFolderAdded()
{
  return new Promise((resolve, reject) => 
  {
    // setup notification of folder events
    let MFNService = Cc["@mozilla.org/messenger/msgnotificationservice;1"]
                        .getService(Ci.nsIMsgFolderNotificationService);
    let folderListener =
    {
      folderAdded(aFolder)
      {
        MFNService.removeListener(this);
        resolve(aFolder);
      }
    };
    MFNService.addListener(folderListener, Ci.nsIMsgFolderNotificationService.folderAdded);
  });
}

PromiseUtils.promiseFolderDeleted = function promiseFolderDeleted(folder) {
  if (!(folder instanceof Ci.nsIMsgFolder))
    throw CE("Need a folder for delete notification");
  return new Promise((resolve, reject) => {
    // setup notification of folder events
    let folderListener = {
      folderDeleted(aFolder) {
        if (folder.URI == aFolder.URI) {
          MFNService.removeListener(this);
          resolve(aFolder);
        }
      }
    };
    MailServices.mfn.addListener(folderListener, Ci.nsIMsgFolderNotificationService.folderDeleted);
  });
}

// This uses the observer service to really detect when the deletion if done (or fails)
// aFolderIds is msqIStringArray
PromiseUtils.promiseFolderDeletedObservation = function promiseFolderDeletedObservation(aFolderIds) {
  return new Promise((resolve, reject) => {
    const observer = {
      observe(aSubject, aTopic, aData)
      {
        if (aTopic == "exquilla.folderDeleted") {
          let subjectSA = aSubject.QueryInterface(Ci.msqIStringArray).wrappedJSObject;
          let containsOne = false;
          let extraOne = false;
          for (let i = 0; i < subjectSA.length; i++) {
            let deletedId = subjectSA.getAt(i);
            if (aFolderIds.indexOf(deletedId) == Ci.msqIStringArray.noIndex)
              extraOne = true;
            else
              containsOne = true;
          }
          if (containsOne) {
            if (!extraOne && (subjectSA.length == aFolderIds.length))
              resolve({folderIds: aSubject, message: aData});
            else
              reject({folderIds: aSubject, message: aData});
            Services.obs.removeObserver(this, aTopic);
          }
          else
            dump("unprocessed observation of topic " + aTopic + " aSubject= " + aSubject + " aFolderIds = " + aFolderIds + "\n");
        }
      }
    };
    Services.obs.addObserver(observer, "exquilla.folderDeleted", false);
  });
}

// This uses the observer service to really detect when the biff if done (or fails)
PromiseUtils.promiseBiffObservation = function promiseBiffObservation(aServer) {
  return new Promise((resolve, reject) => {
    const observer = {
      observe(aSubject, aTopic, aData)
      {
        let msgServer = null;
        try {
          msgServer = aServer.QueryInterface(Ci.nsIMsgIncomingServer);
        } catch (e) {}
        if ( (aTopic == "exquilla.performBiff") && msgServer &&
             (msgServer.serverURI == aServer.serverURI))
        {
          Services.obs.removeObserver(this, aTopic);
          if (aData.startsWith("failure")) 
            reject({ server: aSubject, message: aData});
          else
            resolve({server: aSubject, message: aData});
        }
      }
    };
    Services.obs.addObserver(observer, "exquilla.performBiff", false);
  });
}

/**
 * Copy listener that can wrap another listener and trigger a callback.
 *
 * @param [aWrapped] The nsIMsgCopyServiceListener to pass all notifications through to.
 *     This gets called prior to the callback (or async resumption).
 *
 * In EWS tests, this is used expecting an msqIEwsEventListener and StopCopy as terminating
 * event. Seems kludgy, but for now I just want to convert to promises, so I'll duplicate.
 */
PromiseUtils.CopyListener = function(aWrapped) {
  this.wrapped = aWrapped;
  this._resolved = false;
  this.promise = new Promise((resolve, reject) => {
    this._resolve = resolve;
    this._reject = reject;
  });
  this._result = { messageKeys: [], messageIds: [], status: Cr.NS_ERROR_FAILURE };
};

PromiseUtils.CopyListener.prototype = {
  QueryInterface: XPCOMUtils.generateQI([Ci.nsIMsgCopyServiceListener,
                                         Ci.msqIEwsEventListener]),
  OnStartCopy: function() {
    if (this.wrapped && this.wrapped.OnStartCopy)
      this.wrapped.OnStartCopy();
  },
  OnProgress: function(aProgress, aProgressMax) {
    if (this.wrapped && this.wrapped.OnProgress)
      this.wrapped.OnProgress(aProgress, aProgressMax);
  },
  SetMessageKey: function(aKey) {
    if (this.wrapped && this.wrapped.SetMessageKey)
      this.wrapped.SetMessageKey(aKey);

    this._result.messageKeys.push(aKey);
  },
  SetMessageId: function(aMessageId) {
    if (this.wrapped && this.wrapped.SetMessageId)
      this.wrapped.SetMessageId(aMessageId);

    this._result.messageIds.push(aMessageId);
  },
  OnStopCopy: function(aStatus) {
    if (this.wrapped && this.wrapped.OnStopCopy)
      this.wrapped.OnStopCopy(aStatus);

    if (!this._resolved) {
      this._resolved = true;
      this._result.status = aStatus;
      if (aStatus == Cr.NS_OK)
        this._resolve(this._result);
      else
        this._reject(aStatus);
    }
  },
  onEvent: function onEvent(aItem, aEvent, aData, result) {
    if (!this._resolved && aEvent == "StopCopy") {
      this._resolved = true;
      if (result == Cr.NS_OK)
        this._resolve(result);
      else
        this._reject(result);
    }
  },

};

/**
 * Folder listener to resolve a promise when a certain folder event occurs.
 *
 * @param folder   nsIMsgFolder to listen to
 * @param events   array of string event name to listen for. Example event is
 *                 "DeleteOrMoveMsgCompleted".
 * @return         promise that resolves with event name when the event occurs
 */

var nsIMFNService = Ci.nsIMsgFolderNotificationService;
PromiseUtils.promiseFolderEvents = function promiseFolderEvents(folder, events) {
  return new Promise( (resolve, reject) => {
    let folderListener = {
      QueryInterface: XPCOMUtils.generateQI([Ci.nsIFolderListener]),
      OnItemEvent: function onItemEvent(aEventFolder, aEvent) {
        if (folder.folderURL == aEventFolder.folderURL && events.includes(aEvent)) {
          MailServices.mailSession.RemoveFolderListener(folderListener);
          resolve(aEvent);
        }
      },
    };
    MailServices.mailSession.AddFolderListener(folderListener, Ci.nsIFolderListener.event);
  });
};  

// SendListener is odd, because in nsMsgSend the nsIMsgSendListener
// is sometimes QId to nsIMsgCopyServiceListener, and it is actually
// the nsIMsgCopyServiceListener.onStopCopy that really ends things.
PromiseUtils.SendListener = function(aWrapped) {
  PromiseBase.call(this);
  this.wrapped = aWrapped;
};

PromiseUtils.SendListener.prototype = {
  QueryInterface: function(iid)
  {
    if (iid.equals(Ci.nsIMsgSendListener) ||
        iid.equals(Ci.nsIMsgCopyServiceListener) ||
        iid.equals(Ci.nsISupports))
      return this;
    throw Cr.NS_ERROR_NO_INTERFACE;
  },

  // nsIMsgSendListener
  onStartSending(aMsgID, aMsgSize) {
    if (this.wrapped && this.wrapped.onStartSending)
      this.wrapped.onStartSending(aMsgID, aMsgSize);
  },
  onProgress(aMsgID, aProgress, aProgressMax) {
    if (this.wrapped && this.wrapped.onProgress)
      this.wrapped.onProgress(aMsgID, aProgress, aProgressMax);
  },
  onStatus(aMsgID, aMsg) {
    if (this.wrapped && this.wrapped.onStatus)
      return this.wrapped.onStatus(aMsgID, aMsg);
  },
  onStopSending(aMsgID, aStatus, aMsg, aReturnFile) {
    if (this.wrapped && this.wrapped.onStopSending)
      this.wrapped.onStopSending(aMsgID, aStatus, aMsg, aReturnFile);
  },
  onGetDraftFolderURI(aFolderURI) {
    if (this.wrapped && this.wrapped.onGetDraftFolderURI)
      this.wrapped.onGetDraftFolderURI(aFolderURI);
  },
  onSendNotPerformed(aMsgID, aStatus) {
    if (this.wrapped && this.wrapped.onSendNotPerformed)
      this.wrapped.onSendNotPerformed(aMsgID, aStatus);
    this._resolve({msgID: aMsgID, status: aStatus, msg: null,
                   returnFile: null, performed: false});
  },

  //nsIMsgCopyServiceListener
  OnStartCopy() {
    if (this.wrapped && this.wrapped.OnStartCopy)
      this.wrapped.OnStartCopy();
  },

  // Note this differs on by beginning capitalization and signature
  // from the equivalent sendListener method
  OnProgress(aProgress, aProgressMax) {
    if (this.wrapped && this.wrapped.OnProgress)
      this.wrapped.OnProgress(aProgress, aProgressMax)
  },

  SetMessageKey(aKey) {
    if (this.wrapped && this.wrapped.SetMessageKey)
      this.wrapped.SetMessageKey(aKey);
  },

  GetMessageId(aMessageId) {
    if (this.wrapped && this.wrapped.GetMessageId)
      this.wrapped.GetMessageId(aMessageId);
  },

  OnStopCopy(aStatus) {
    if (this.wrapped && this.wrapped.OnStopCopy)
      this.wrapped.OnStopCopy(aStatus)
    this._resolve(aStatus);
  },
};

PromiseUtils.ComposeDoneListener = function(aWrapped) {
  PromiseBase.call(this);
  this.wrapped = aWrapped;
};

PromiseUtils.ComposeDoneListener.prototype = {
  QueryInterface: function(iid)
  {
    if (iid.equals(Ci.nsIMsgComposeStateListener) ||
        iid.equals(Ci.nsISupports))
      return this;
    throw Cr.NS_ERROR_NO_INTERFACE;
  },

  NotifyComposeFieldsReady() {
    if (this.wrapped && this.wrapped.NotifyComposeFieldsReady)
      this.wrapped.NotifyComposeFieldsReady();
  },

  ComposeProcessDone(aResult) {
    if (this.wrapped && this.wrapped.ComposeProcessDone)
      this.wrapped.ComposeProcessDone(aResult);
    this._resolve(aResult);
  },

  SaveInFolderDone(folderName) {
    if (this.wrapped && this.wrapped.SaveInFolderDone)
      this.wrapped.SaveInFolderDone(folderName);
  },

  NotifyComposeBodyReady() {
    if (this.wrapped && this.wrapped.NotifyComposeBodyReady)
      this.wrapped.NotifyComposeBodyReady();
  },
};
