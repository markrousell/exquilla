/* ***** BEGIN LICENSE BLOCK *****
 * ***** END LICENSE BLOCK ***** */
 
 // This tests getDistinguishedNativeFolder request
 
load('utilities.js');
load('soapRequestUtils.js');

var tests = [
  testSetupServer,
  testCache,
  testShutdown,
]

function* testCache()
{
  let inbox = gNativeMailbox.getNativeFolder('theinbox');
  inbox.distinguishedFolderId = 'inbox';
  inbox = null;
  calendar = gNativeMailbox.getNativeFolder('thecalendar');
  calendar.distinguishedFolderId = 'calendar';
  calendar = null;
  let foundInbox = gNativeMailbox.getDistinguishedNativeFolder('inbox');
  Assert.equal('inbox', foundInbox.distinguishedFolderId);
  let foundCalendar = gNativeMailbox.getDistinguishedNativeFolder('calendar');
  Assert.equal('calendar', foundCalendar.distinguishedFolderId);
}

function run_test()
{
  async_run_tests(tests);
}
