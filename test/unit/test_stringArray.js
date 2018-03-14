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

// Utility functions

// shorthand create
function newSA() { return new StringArray();}

function run_test()
{
    for (var test of tests)
      test();
}

var tests = [
  // test that the component exists
  function* testExists() {
    let sa = newSA();
    Assert.ok(sa.QueryInterface(Ci.msqIStringArray));
  },
  // test of functionality
  function* testWorks() {
    let sa = newSA();
    Assert.equal(sa.length, 0);
    sa.assignAt(0, "aa");
    Assert.equal(sa.getAt(0), "aa");
    Assert.equal(sa.length, 1);
    sa.assignAt(3, "bb");
    Assert.equal(sa.length, 4);
    Assert.equal(sa.getAt(3), "bb");
    Assert.equal(sa.indexOf("bb"), 3);
    Assert.equal(sa.indexOf("notexist"), Ci.msqIStringArray.noIndex);
    Assert.ok(!sa.isEmpty);
    sa.clear();
    Assert.ok(sa.isEmpty);
    sa.append("cc");
    Assert.equal(sa.indexOf("cc"), 0);
    sa.append("dd");
    sa.append("ee");
    Assert.equal(sa.indexOf("ee"), 2);
    sa.removeAt(1);
    Assert.equal(sa.indexOf("ee"), 1);
    let sqa = sa.QueryInterface(Ci.msqIStringArray).wrappedJSObject;
    Assert.ok(!!sqa);
  },
];
