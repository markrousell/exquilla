/* ***** BEGIN LICENSE BLOCK *****
 * ***** END LICENSE BLOCK ***** */
 
 // This tests skink search of the GAL
 load('soapRequestUtils.js');

var tests = [
  testSetupEwsServer,
  testGALContact,
  testShutdown
]

var gGALDirectory;
var gJsGALDirectory;
function* testGALContact()
{
  // locate the directory associated with the GAL contact folder
  let abManager = Cc['@mozilla.org/abmanager;1']
                    .getService(Ci.nsIAbManager);
  let directories = abManager.directories;
  let galDirectory = null;
  let jsTestDirectory;
  let ewsTestDirectory;
  while (directories.hasMoreElements())
  {
    let directory = directories.getNext();
    directory instanceof Ci.nsIAbDirectory;
    dl('found nsIAbDirectory ' + directory.dirName);
    jsTestDirectory = safeGetJS(directory);
    if (!jsTestDirectory)
      continue;
    dl("jsTestDirectory is " + jsTestDirectory);
    ewsTestDirectory = jsTestDirectory;
    if (ewsTestDirectory.isGAL) {
      galDirectory = jsTestDirectory;
      break;
    }
  }
  Assert.ok(safeInstanceOf(galDirectory, Ci.nsIAbDirectory));
  Assert.ok(safeInstanceOf(ewsTestDirectory, Ci.msqIEwsAbDirectory));

  // Use searchGAL
  dl('found ews directory, name: ' + ewsTestDirectory.nativeFolder.displayName + " URI: " + galDirectory.URI);
  ewsTestDirectory.searchGAL("test", gEwsEventListener);
  yield false;

  Assert.ok(gCompletionData instanceof Ci.nsIArray);
  Assert.ok(gCompletionData.length > 0);

  // Make sure that those got cached
  let cards = galDirectory.wrappedJSObject.cards;
  let foundOne = false;
  for (let card of cards.values())
  {
    Assert.ok(card instanceof Ci.nsIAbCard);
    foundOne = true;
  }
  Assert.ok(foundOne);
/**/
}

function run_test()
{
  async_run_tests(tests);
}
