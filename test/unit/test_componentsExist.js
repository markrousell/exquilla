/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is MesQuilla code.
 *
 * The Initial Developer of the Original Code is
 * Kent James <kent@caspia.com>.
 * Portions created by the Initial Developer are Copyright (C) 2010, 2016
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

Cu.import("resource://exquilla/EwsNativeMachine.jsm");

let tests = [
              // JaSend
              ["@mesquilla.com/ewssend;1", "nsIMsgSend"],

              // JaCompose
              ["@mozilla.org/messengercompose/compose;1", "nsIMsgCompose"],
              ["@mesquilla.com/ewscompose;1", "nsIMsgCompose"],

              // JaMsgFolder
              ["@mozilla.org/rdf/resource-factory;1?name=exquilla", "nsIMsgFolder"],

              // JaIncomingServer
              ["@mozilla.org/messenger/server;1?type=exquilla", "nsISupports"],
              ["@mozilla.org/messenger/server;1?type=exquilla", "nsIMsgIncomingServer"],
              ["@mozilla.org/messenger/server;1?type=exquilla", "msgIOverride"],
              ["@mozilla.org/messenger/server;1?type=exquilla", "nsIInterfaceRequestor"],
              ["@mozilla.org/messenger/server;1?type=exquilla", "nsISupportsWeakReference"],

              ["@mesquilla.com/ewsprotocol;1", "nsIChannel"],
              ["@mesquilla.com/ewsprotocol;1", "nsIRequest"],
              ["@mesquilla.com/ewsprotocol;1", "nsIMsgHeaderSink"],
              ["@mesquilla.com/ewsprotocol;1", "nsIStreamListener"],
              ["@mesquilla.com/ewsprotocol;1", "nsIRequestObserver"],
              ["@mesquilla.com/ewsprotocol;1", "msqIEwsEventListener"],
              ["@mesquilla.com/ewsprotocol;1", "nsITimerCallback"],
              ["@mozilla.org/messenger/messageservice;1?type=exquilla", "msqIEwsService"],
              ["@mozilla.org/messenger/messageservice;1?type=exquilla", "nsIMsgMessageService"],
              ["@mozilla.org/messenger/messageservice;1?type=exquilla-message", "nsIMsgMessageService"],
              ["@mozilla.org/messenger/protocol/info;1?type=exquilla", "nsIMsgProtocolInfo"],
              ["@mozilla.org/messenger/protocol/info;1?type=exquilla-message", "nsIMsgProtocolInfo"],
              ["@mozilla.org/network/protocol;1?name=exquilla", "nsIProtocolHandler"],
              ["@mozilla.org/network/protocol;1?name=exquilla-message", "nsIProtocolHandler"],
              /**/
              ["@mesquilla.com/ewssoaprequest;1", "msqIEwsSoapRequest"],
              ["@mozilla.org/addressbook/directory;1?type=exquilla-directory", "nsIAbDirectory"],
              ["@mesquilla.com/ewsurl;1", "nsIMsgMailNewsUrl"],
              ["@mesquilla.com/ewsnativeattachment;1", "msqIEwsNativeAttachment"],
              ["@mesquilla.com/ewsnativeitem;1", "msqIEwsNativeItem"],
              ["@mozilla.org/autocomplete/search;1?name=exquilla-ab", "nsIAutoCompleteSearch"],
              // exquilla components
              //["@mozilla.org/calendar/calendar;1?type=exquilla", "calICalendar"],
              ["@mesquilla.com/ewsmachine;2", "msqIEwsMachine"],
              ["@mesquilla.com/ewschainlistener;1", "msqIEwsChainListener"],
              ["@mesquilla.com/ewsnativefolder;2", "msqIEwsNativeFolder"],
              ["@mozilla.org/rdf/resource-factory;1?name=exquilla", "nsIMsgFolder"],
              ["@mozilla.org/rdf/resource-factory;1?name=exquilla", "nsIRDFResource"],
              ["@mesquilla.com/ewsdatastore;1", "msqIEwsDatastore"],
              ["@mesquilla.com/ewsmailfolder;1", "nsIMsgFolder"],
              ["@mozilla.org/messenger/server;1?type=exquilla", "nsIMsgIncomingServer"],
              ["@mesquilla.com/ewsnativemailbox;1", "msqIEwsNativeMailbox"],
              ["@mesquilla.com/ewsnativeservice;1", "msqIEwsNativeService"],
              ["@mesquilla.com/ewsactivitylistener;1", "msqIEwsActivityListener"],
              ["@mesquilla.com/webservices/propertylist;1", "msqIPropertyList"],
              ["@mesquilla.com/stringarray;1", "msqIStringArray"],
              ["@mozilla.org/accountmanager/extension;1?name=exquillaserver", "nsIMsgAccountManagerExtension"],
              // utilities
              ["@mozilla.org/addressbook/directory-factory;1?name=exquilla-directory", "nsIAbDirFactory"],
              // We can't test creation of the database, because it crashes unless
              // created in context.
              /**/
            ];

function run_test()
{
  var test;
  while (test = tests.shift(), !!test) {
    dump('trying to create component ' + test[0] + ' with interface ' + test[1] + '\n');
    try {
      dump(Cc[test[0]] + " " + Ci[test[1]] + '\n');
    }
    catch (e) {dump(e + '\n');}

    let comp = Cc[test[0]].createInstance(Ci[test[1]]);
    Assert.ok(comp instanceof Ci[test[1]]);
  }

  // now I want to test instanceof replacement is wrappedJSObject with non-XPCOM components
  let jsMachine = new EwsNativeMachine();
  let xpMachine = Cc["@mesquilla.com/ewsmachine;2"].createInstance(Ci.msqIEwsMachine);
  Assert.ok(!!jsMachine.wrappedJSObject);
  Assert.ok(!!xpMachine.wrappedJSObject);

  Assert.ok(!!jsMachine.QueryInterface(Ci.msqIEwsMachine));
  Assert.ok(!!xpMachine.QueryInterface(Ci.msqIEwsMachine));

  let arr1 = Cc["@mozilla.org/array;1"].createInstance(Ci.nsIMutableArray);
  let arr2 = Cc["@mozilla.org/array;1"].createInstance(Ci.nsIMutableArray);

  arr1.appendElement(jsMachine, false);
  let supports = arr1.queryElementAt(0, Ci.nsISupports);
  dl("supports is " + supports);
  let jsWrap = supports.wrappedJSObject;
  dl("jsWrap is " + jsWrap);
  Assert.ok("checkOnline" in jsWrap);

  arr2.appendElement(xpMachine, false);
  let supports2 = arr2.queryElementAt(0, Ci.nsISupports);
  dl("supports2 is " + supports2);
  let xpWrap = supports2.wrappedJSObject;
  dl("xpWrap is " + xpWrap);
  Assert.ok("checkOnline" in xpWrap);

}
