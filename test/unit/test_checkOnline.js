/* ***** BEGIN LICENSE BLOCK *****
 * ***** END LICENSE BLOCK ***** */
 
load('soapRequestUtils.js');

function* taskCheckOnline()
{
  gNativeMailbox.needOnlineCheck = true;
  Assert.ok(gNativeMailbox.needOnlineCheck);
  var promiseStopMachine = new PromiseUtils.MachineListener();
  gNativeMailbox.checkOnline(promiseStopMachine);
  let result = yield promiseStopMachine.promise;

  Assert.ok(gNativeMailbox.isOnline);
  Assert.ok(!gNativeMailbox.needOnlineCheck);
  Assert.equal(result.status, Cr.NS_OK);

  // set an invalid url, which should force autodiscover
  gNativeMailbox.ewsURL = "http://idonotexist.example.com";
  var promiseStopMachine = new PromiseUtils.MachineListener();
  gNativeMailbox.checkOnline(promiseStopMachine);
  result = yield promiseStopMachine.promise;
  Assert.ok(gNativeMailbox.isOnline);
  Assert.ok(!gNativeMailbox.needOnlineCheck);
}

var tests = [
  taskSetupServer,
  taskCheckOnline,
  taskShutdown
]

function run_test()
{
  tests.forEach(x => add_task(x));
  run_next_test();
}

