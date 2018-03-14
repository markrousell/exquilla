// tests the conversion of a property list to mime headers

Cu.import("resource://exquilla/ewsUtils.jsm");
// not sure why this spews uncaught errors
Utils.importLocally(this);

var tests = [
  testHeaders,
];

let test_cases = [
  [oPL({
        Subject: "the subject",
        InternetMessageId: "<bug-1293401-254728-mWUG357zkd@https.bugzilla.mozilla.org/>"
      }),
      "Subject: the subject\r\nMessage-ID: <bug-1293401-254728-mWUG357zkd@https.bugzilla.mozilla.org/>\r\n"],
  [oPL({ References: "<c8ee05d1-43b6-db2b-f68a-0f3bef5546af@documentfoundation.org> <100c8d16-f284-7993-0953-e1164014ebed@caspia.com>"}),
      "References: <c8ee05d1-43b6-db2b-f68a-0f3bef5546af@documentfoundation.org>\r\n <100c8d16-f284-7993-0953-e1164014ebed@caspia.com>\r\n"],
  [oPL({ From: oPL(
         { Mailbox: oPL(
           {Name: "some user", EmailAddress: "user@example.com"
           })
         })
      }),
      "From: some user <user@example.com>\r\n"],
  // Test may fail because of time zone issues, but works for me now.
  //[oPL({ DateTimeReceived: "2014-02-28T20:06:18Z",}),"Date: Fri, 28 Feb 2014 12:06:18 -0800\r\n"],
  [oPL({
    ToRecipients: aPL('Mailbox', [
      oPL(
          { Name: "First To",
            EmailAddress: "firstto@example.com",
            RoutingType: "SMTP"
          }),
      oPL(
          { Name: "Second To",
            EmailAddress: "secondto@example.com",
            RoutingType: "SMTP"
          }),
      ]),
    }),
    "To: First To <firstto@example.com>\r\nTo: Second To <secondto@example.com>\r\n"],
];

function testHeaders() {

  for (let test_case of test_cases) {
    Assert.equal(plToHeaders(test_case[0]), test_case[1]);
  }
}

function run_test()
{
  tests.forEach(x => add_task(x));
  run_next_test();
}
