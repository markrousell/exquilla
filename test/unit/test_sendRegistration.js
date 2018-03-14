/* ***** BEGIN LICENSE BLOCK *****
 * ***** END LICENSE BLOCK ***** */
 
load('soapRequestUtils.js');

var tests = [
  //taskSetupEwsServer,
  taskCheckReg,
  taskShutdown,
]

function* taskCheckReg()
{
  // replaced with the exquilla version. We use the local contractID to make
  // sure we are not testing the skink component.
  // identity
  //let identity = MailServices.accounts.getFirstIdentityForServer(gEwsIncomingServer);
  //let identity = MailServices.accounts.getFirstIdentityForServer(localAccountUtils.incomingServer);
  let identity = MailServices.accounts.createIdentity();
  //let account = MailServices.accounts.FindAccountForServer(gEwsIncomingServer);
  let account = localAccountUtils.msgAccount;
  dl("identity email is " +identity.email);
  dl("identity draft folder is " + identity.draftFolder);
  dl("identity stationery folder is " + identity.stationeryFolder);
  dl("identity doFcc is " + identity.doFcc);

  for (let deliverMode of
         [ 
           123, // Basic listener function
         ]) {
    let ewsCompose = Cc["@mesquilla.com/ewscompose;1"].createInstance(Ci.nsIMsgCompose);
    let msgParams = Components.classes["@mozilla.org/messengercompose/composeparams;1"]
                              .createInstance(Components.interfaces.nsIMsgComposeParams);
    let composeFields = Components.classes["@mozilla.org/messengercompose/composefields;1"]
                                  .createInstance(Components.interfaces.nsIMsgCompFields);

    msgParams.type = Components.interfaces.nsIMsgCompType.New;
    msgParams.format = Components.interfaces.nsIMsgCompFormat.Default;
    msgParams.composeFields = composeFields;
    msgParams.identity = identity;
    msgParams.bodyIsLink = false;
    ewsCompose.initialize(msgParams);

    // we are starting too late in ewsCompose to get the listener registered.
    let jsCompose = safeGetInterface(ewsCompose, Ci.nsISupports).wrappedJSObject;
    let sendListener = new PromiseUtils.SendListener();
    jsCompose._sendListener = sendListener;

    ewsCompose.sendMsgToServer(deliverMode, identity, account.key);
    let result = yield sendListener.promise;
    dl("sendMsgToServer result.status is " + result.status);
    Assert.equal(result.status, Cr.NS_OK);
  }
}

function run_test()
{
  tests.forEach(x => add_task(x));
  run_next_test();
}

