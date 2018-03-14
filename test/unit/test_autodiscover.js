/* ***** BEGIN LICENSE BLOCK *****
 * ***** END LICENSE BLOCK ***** */
 
load('soapRequestUtils.js');
Cu.import("resource://exquilla/autodiscover.js");
Cu.import("resource://gre/modules/Services.jsm");

var tests = [
  taskAutodiscover,
]

let adListener = {
  ewsURL: '',
  displayName: '',
  handleAutodiscover: function handleAutodiscover(aStatus, aResult, aDisplayName)
  {
    this.ewsURL = aResult.mEwsUrl;
    dl('handleAutodiscover aStatus is ' + aStatus + ' aDisplayName is ' + aDisplayName);
    dl('ewsURL: ' + aResult.mEwsUrl + ' mInternalEwsUrl: ' + aResult.mInternalEwsUrl + ' mEwsOWAGuessUrl: ' + aResult.mEwsOWAGuessUrl);
    this.displayName = aDisplayName;
    async_driver();
  }
}

function* taskAutodiscover()
{
  //for (let account of gAccounts)
  {
    let domainAndUser = account.domain && account.domain.length ? account.domain + "\\" + account.username : account.username;
    savePassword("https://autodiscover." + account.hostname, domainAndUser, account.password);
    savePassword("https://" + account.hostname, domainAndUser, account.password);
    let host = (/@(.*)/.exec(account.emailaddress))[1];

    dl("Trying to trust certificates for " + account.ewsURL);
    // make sure that the test server certificate is trusted
    let listener = new AcceptCertListener(account.ewsURL, Moz.PromiseUtils.defer());
    listener.sendRequest();
    yield listener.promise;
    dl("Done with AcceptCertListener promise");

    let result = yield PromiseUtils.promiseAutodiscover
      (account.emailaddress, account.username, account.domain, account.password, true);
    dump("promiseAutoDiscover result is " + JSON.stringify(result) + "\n");

    Assert.equal(result.status, Cr.NS_OK);
    Assert.ok(result.foundSite);
    Assert.equal(result.ewsUrl.toLowerCase(), account.ewsURL.toLowerCase());
    Assert.equal(result.displayName, account.displayName);
  }
}

function run_test()
{
  tests.forEach(x => add_task(x));
  run_next_test();
}

function savePassword(aHostname, aUser, aPassword)
{
  // delete existing logins
  let foundLogins = Services.logins.findLogins({}, aHostname, null, aHostname);
  let newLogin = Cc["@mozilla.org/login-manager/loginInfo;1"]
                   .createInstance(Ci.nsILoginInfo);
  newLogin.init(aHostname, null, aHostname, aUser, aPassword, "", "");
  if (foundLogins && foundLogins.length)
  {
    for (let login of foundLogins)
    {
      if (login.matches(newLogin, true))
        Services.logins.removeLogin(login);
    }
  }
  Services.logins.addLogin(newLogin);
}

