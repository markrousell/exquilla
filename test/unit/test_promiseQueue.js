/* ***** BEGIN LICENSE BLOCK *****
 * ***** END LICENSE BLOCK ***** */

// This tests a PromiseQueue that limits active promises

Cu.import("resource://gre/modules/Task.jsm");
const mozModules = {};
Cu.import("resource://gre/modules/PromiseUtils.jsm", mozModules);
XPCOMUtils.defineLazyModuleGetter(this, "PromiseUtils",
                                  "resource://exquilla/PromiseUtils.jsm");
Cu.import("resource://exquilla/ewsUtils.jsm");
// not sure why this spews uncaught errors
Utils.importLocally(this);

var tests = [
  taskPromiseQueue,
]

const kLimit = 10;
const kLength = 50;
function promiseTest(aReject, aValue) {
  let deferred = mozModules.PromiseUtils.defer();
  let resolve = deferred.resolve;
  let reject = deferred.reject;
  do_timeout(50, function () {
    if (aReject)
    {
      reject(CE("test reject"));
    }
    else
    {
      resolve(aValue);
    }
  });
  return deferred.promise;
}

// performs aLength invocations of promiseTest, with an active promise
// limit of aLimit. Promise #aRejectPoint rejects.
//
// returns the promise from a PromiseAll.
function promiseMost(aLimit, aLength, aRejectPoint)
{
  return Task.spawn( function* _taskMost()
  {
    let promises = [];
    let promiseQueue = new PromiseUtils.PromiseLimit(aLimit);

    for (let i = 0; i < aLength; i++)
    {
      dump("Queue length is " + promiseQueue._activeCount + "\n");
      Assert.ok(promiseQueue._activeCount < aLimit);
      let promise = promiseTest(i == Math.floor(aRejectPoint), i);
      promise.then( () => {gCompleted++},
                    () => {gRejected ++});
      promises.push(promise);
      let result = yield promiseQueue.queue(promise)
                                     .then(null, (ex) => {dump("\n\nrejecting queued\n"); throw ex;});
    }
    let result = yield Promise.all(promises);
    return (result);
  });
}

let gCompleted = 0;
let gRejected = 0;

function* taskPromiseQueue() {

  // All succeed
  yield promiseMost(kLimit, kLength, 1000);

  Assert.equal(gCompleted, kLength);
  Assert.equal(gRejected, 0);

  // reject late
  let rejectPoint = 2*kLimit;
  gCompleted = 0;
  gRejected = 0;
  yield promiseMost(kLimit, kLength, rejectPoint).then(null, () => dump("detected rejection\n"));
  dump("gCompleted is " + gCompleted + "\n");
  Assert.ok(gCompleted < rejectPoint + 10);
  Assert.equal(gRejected, 1);

  // reject early
  rejectPoint = kLimit/2;
  gCompleted = 0;
  gRejected = 0;
  yield promiseMost(kLimit, kLength, rejectPoint).then(null, () => dump("detected rejection\n"));;
  dump("gCompleted is " + gCompleted + "\n");
  Assert.ok(gCompleted < rejectPoint + 2*kLimit);
  Assert.ok(gCompleted > rejectPoint - 1);
  Assert.equal(gRejected, 1);
}

function run_test()
{
  tests.forEach(x => add_task(x));
  run_next_test();
}
