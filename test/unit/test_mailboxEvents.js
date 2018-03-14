/* ***** BEGIN LICENSE BLOCK *****
 * ***** END LICENSE BLOCK ***** */

// Tests the mailbox event listener

let eventCount = 0;
let listener1 = {
  onEvent: function onEvent(aItem, aEvent, aData, aResult)
  {
    eventCount++;
    Assert.ok(aItem instanceof Ci.msqIEwsNativeMailbox);
  }
}

let listener2 = {
  onEvent: function onEvent(aItem, aEvent, aData, aResult)
  {
    eventCount++;
    Assert.ok(aItem instanceof Ci.msqIEwsNativeMailbox);
  }
}

function run_test()
{
  let mailbox = Cc["@mesquilla.com/ewsnativemailbox;1"]
                  .createInstance(Ci.msqIEwsNativeMailbox);
  mailbox.addListener(listener1);
  mailbox.addListener(listener2);
  mailbox.addListener(listener1);
  mailbox.domain = "dummy";
  Assert.equal(eventCount, 2);
}
