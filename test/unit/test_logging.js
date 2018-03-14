// tests the RotatingFileAppender used in ExQuilla

dump("First line in the test\n");
let existingLogFile = do_get_file('data/exquillalog.txt');
let profileDirectory = Services.dirsvc.get("ProfD", Ci.nsIFile);
existingLogFile.copyTo(profileDirectory, null);
Services.prefs.setIntPref("extensions.exquilla.log.filesize", 6000);

Cu.import("resource://exquilla/ewsUtils.jsm");
Components.utils.import("resource://gre/modules/osfile.jsm");
Utils.importLocally(this);

var tests = [
  testLog,
];

var _log = null;
XPCOMUtils.defineLazyGetter(this, "log", () => {
  if (!_log) _log = Utils.configureLogging("testing");
  return _log;
});

function* testLog() {
  for (let count = 0; count < 10; count++)
    log.info("This is a log count " + count);

  let fileAppender = null;
  for (let appender of log.appenders) {
    if (appender._name == "RotatingFileAppender") {
      fileAppender = appender;
    }
  }
  Assert.ok(fileAppender);

  if (fileAppender._fileReadyPromise) {
    dl("Waiting1 for _fileReadyPromise");
    yield fileAppender._fileReadyPromise;
    dl("done Waiting1 for _fileReadyPromise");
  }

  dl("Log size1 is " + fileAppender._size);

  for (let count = 0; count < 300;) {
    for (let batch = 0; batch < 50; batch++) {
      log.info("This is a log count " + count);
      count++
    }
    yield fileAppender._rotateFilePromise;
    yield fileAppender._fileReadyPromise;
  }

  yield fileAppender._rotateFilePromise;
  yield fileAppender._fileReadyPromise;

  // Make sure that the log file exists.
  let profilePath = OS.Constants.Path.profileDir;
  let logPath = OS.Path.join(profilePath, "exquillalog.txt");
  Assert.ok(yield OS.File.exists(logPath));
  let logPath2 = OS.Path.join(profilePath, "exquillalog-1.txt");
  Assert.ok(yield OS.File.exists(logPath2));

  let pendingFile;
  if (fileAppender._file)
    pendingFile = fileAppender._file;
  else
    pendingFile = yield OS.File.open(logPath);
  let fileStat = yield pendingFile.stat();
  dl("File stat.size is " + fileStat.size);
  // Tests show stat size of 2520, check a range
  Assert.ok(fileStat.size > 2000 && fileStat.size < 3000);
  yield pendingFile.close();

  // Test show final size of 4824, check a range
  dl("Log size2 is " + fileAppender._size);
  Assert.ok(fileAppender._size > 2000 && fileAppender._size < 3000);
  yield promiseFlushLogging();
}

function run_test()
{
  tests.forEach(x => add_task(x));
  run_next_test();
}
