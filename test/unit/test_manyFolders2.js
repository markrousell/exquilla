/* ***** BEGIN LICENSE BLOCK *****
 * ***** END LICENSE BLOCK ***** */
 
 // This follows test_manyFolders to delete the folders
 
load('soapRequestUtils.js');
load('utilities.js');

var tests = [
  testSetupServer,
  testSetupTestFolder,
  testShutdown,
]

function run_test()
{
  async_run_tests(tests, 1200);
}
