/*
 ***** BEGIN LICENSE BLOCK *****
 * This file is part of ExQuilla by Mesquilla.
 *
 * Copyright 2016 R. Kent James
 *
 * All Rights Reserved
 *
 * ***** END LICENSE BLOCK *****
 */

load('utilities.js');
XPCOMUtils.defineLazyModuleGetter(this, "EwsNativeService",
                                  "resource://exquilla/EwsNativeService.jsm");

// Utility functions
Cu.import("resource://exquilla/ewsUtils.jsm");
// not sure why this spews uncaught errors
Utils.importLocally(this);

// shorthand create

function run_test()
{
    for (var test of tests)
      test();
}

var tests = [
  // test that the component exists
  function* testExists() {
    let sa = new EwsNativeService();
    Assert.ok(safeInstanceOf(sa, Ci.msqIEwsNativeService));
  },
  // test of functionality
  function* testWorks() {
    let sa = new EwsNativeService();
    Assert.equal(sa.getExistingMailbox("nothing"), null);

    let newMailbox = sa.getNativeMailbox("dummy://mb1");
    Assert.ok(!!newMailbox);
    Assert.equal(newMailbox.serverURI, "dummy://mb1");

    let existingMailbox = sa.getExistingMailbox("dummy://mb1");
    Assert.equal(existingMailbox.serverURI, "dummy://mb1");
    Assert.ok(existingMailbox === newMailbox);

    let secondMailbox = sa.getNativeMailbox("dummy://mb2");
    sa.removeNativeMailbox(newMailbox);
    let oldMailbox = sa.getExistingMailbox("dummy://mb1");
    Assert.ok(oldMailbox === null);
    Assert.equal(sa.getExistingMailbox("dummy://mb2").serverURI, "dummy://mb2");
  },
];
