/* ***** BEGIN LICENSE BLOCK *****
 * ***** END LICENSE BLOCK ***** */
 
 // Originally this demoed OS.File functionality, but now is a catch-all for
 // testing of concepts.
Components.utils.import("resource://gre/modules/osfile.jsm");
Components.utils.import("resource://exquilla/ewsUtils.jsm");
Cu.import("resource://gre/modules/Task.jsm");

let bugmail = do_get_file('data/bugmail19CRLF.eml');
 
var taskTest = Task.async(function* asyncTask(parm) {
  let result = Cr.NS_ERROR_UNEXPECTED;
  try {
    dl("parm is " + parm);
    if (parm) {
      dl("parm must be true");
      throw CE("Some error");
    }
    dl("No error");
    yield PromiseUtils.promiseDelay(100);
    result = Cr.NS_OK;
  }
  catch (e) {
    dl("caught error " + e);
    result = e.result;
  }
  finally {
    return result;
  }
});

function* taskPromise()
{
  // tests some basic promise functionality concepts.
  // 1) then after catch as equivalent to finally.

  // 1) success and failure
  for (let tf of [true, false]) {
    yield taskTest(tf).then(
      (result) => {
        dl(".then with success, result is " + result);
        return result;
      },
      (ex) => {
        dl(".then with failure, ex is " + ex);
        throw ex;
      }
    );
  }

  // interior use of Task.async
  for (let tf of [true, false]) {
    yield Task.async(function* asyncTask(parm) {
        let result = Cr.NS_ERROR_UNEXPECTED;
        try {
          if (parm) throw CE("Some error");
          yield PromiseUtils.promiseDelay(100);
          result = Cr.NS_OK;
        }
        catch (e) {
          dl("caught error " + e);
          result = e.result;
        }
        finally {
          return result;
        }
      })(tf)
    .then(
      (result) => {
        dl(".then with success, result is " + result);
        return result;
      },
      (ex) => {
        dl(".then with failure, ex is " + ex);
        throw ex;
      }
    );
  }

  // interior use of Task.async, variation with tf closure
/*
  for (let tf of [true, false]) {
    yield Task.async(function* asyncTask() {
        let result = Cr.NS_ERROR_UNEXPECTED;
        try {
          if (tf) throw CE("Some error");
          yield PromiseUtils.promiseDelay(100);
          result = Cr.NS_OK;
        }
        catch (e) {
          dl("caught error " + e);
          result = e.result;
        }
        finally {
          return result;
        }
      })()
    .then({(result) => {
      dl(".then with success, result is " + result);
      return result;
    });
  }
  */

  // Task.spawn
  for (let tf of [true, false]) {
    yield Task.spawn(function* asyncTask() {
        let result = Cr.NS_ERROR_UNEXPECTED;
        try {
          if (tf) throw CE("Some error");
          yield PromiseUtils.promiseDelay(100);
          result = Cr.NS_OK;
        }
        catch (e) {
          dl("caught error " + e);
          result = e.result;
        }
        finally {
          return result;
        }
      }.bind(this))
   .then( (result) => {
      dl(".then with success, result is " + result);
      return result;
    });
  }
}

function* taskDemo()
{
  dl("OS.Constants.Sys.DEBUG: " + OS.Constants.Sys.DEBUG);
  dl("OS.Constants.Path.profileDir: " + OS.Constants.Path.profileDir);
  dl("OS.Constants.Path.tmpDir: " + OS.Constants.Path.tmpDir);

  // Add some text to a file
  let path = OS.Path.join(OS.Constants.Path.profileDir, "osfile.txt");
  let testFile = yield OS.File.openUnique(path);
  dl("testFile.path is " + testFile.path);
  dl("exists? " + (yield OS.File.exists(testFile.path)));
  yield OS.File.remove(testFile.path);
  dl("exists? " + (yield OS.File.exists(testFile.path)));

  // open some bugmail
  let array = yield OS.File.read(bugmail.path);
  let message = (new TextDecoder()).decode(array);

  // counts of EOL
  let CRcount = 0;
  let LFcount = 0;
  for (let i = 0; i < message.length; i++) {
    let c = message[i];
    if (c == '\r') CRcount++
    if (c == '\n') LFcount++;
  }
  dl("CRcount: + " + CRcount + " LFcount: " + LFcount);

  // Just get the headers
  let EOH = message.search(/\n\n|\r\n\r\n|\r\r/);
  dl("EOH is " + EOH);
  if (EOH > 0) dl(message.substring(0, EOH));
  let testString = "\r\n\r\nTheBeginning";
  let BOT = testString.search(/[^\r\n]/);
  dl("BOT is " + BOT);

  // logging
  Utils.ewsLog.error("This is an error");
}

var tests = [
  taskPromise,
  //taskDemo,
]

function run_test()
{
  tests.forEach(x => add_task(x));
  run_next_test();
}
