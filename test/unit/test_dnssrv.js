/* ***** BEGIN LICENSE BLOCK *****
 * ***** END LICENSE BLOCK ***** */
 
load('soapRequestUtils.js');
Cu.import("resource://exquilla/autodiscover.js");
Cu.import("resource://gre/modules/Services.jsm");

var tests = [
  testDnssrv,
]

function* testDnssrv()
{
  EwsAutoDiscover.getSrv("caspia.net", function(status, adServer) {
    dl('status is ' + status + ' server is ' + adServer);
    Assert.equal(adServer, "autodiscover.easymail.ca");
    async_driver();
  });
  yield false;
}

function run_test()
{
  async_run_tests(tests);
}
