/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is web services module code.
 *
 * The Initial Developer of the Original Code is
 * R. Kent James <rkent@mesquilla.com>.
 * Portions created by the Initial Developer are Copyright (C) 2010
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

Cu.import("resource://exquilla/ewsUtils.jsm");
// not sure why this spews uncaught errors
Utils.importLocally(this);
load('utilities.js');

// Utility functions

// shorthand create
function newPL() { return new PropertyList();}

// Magic number for index not found (init32_t(-1))
const PR_UINT32_MAX = 4294967295;

function run_test()
{
    for (var test of tests)
      test();
}

var tests = [
  // test that the component exists
  function* testExists() {
    let pl = newPL();
    Assert.ok(safeInstanceOf(pl, Ci.msqIPropertyList));
  },
  // test of functionality
  function* testWorks() {
    // test AString with an empty-valued PL
    let plBody = newPL();
    let plAttributes = newPL();
    let plMessage = newPL();
    plAttributes.setAString("BodyType", "Text");
    plBody.appendPropertyList("$attributes", plAttributes);
    plMessage.appendPropertyList("Body", plBody);
    Assert.equal("", plMessage.getAString("Body"));

    let pl = newPL();
    dl('msq property list is ' + pl);
    Assert.equal(pl.length, 0);

    // add two properties
    pl.appendElement("name0", 1);
    pl.appendElement("name1", "secondValue");
    Assert.equal(pl.length, 2);

    // test of getValues access
    {
      let array = pl.getValues("name0");
      let variant = array.queryElementAt(0, Ci.nsIVariant);
      dl("variant is " + variant);
      let supports = array.queryElementAt(0, Ci.nsISupports);
      dl("supports is " + supports);
      dl("supports QI variant is " + supports.QueryInterface(Ci.nsIVariant));
      // create a variant and save in the same way
      variant = Cc["@mozilla.org/variant;1"].createInstance(Ci.nsIWritableVariant);
      variant.setAsAString("I am an AString");
      dl("variant as AString:" + variant);
      let qiv = variant.QueryInterface(Ci.nsIVariant);
      dl("QI'd variant:" + qiv);
    }

    // check access by index
    Assert.equal("name0", pl.getNameAt(0));
    Assert.equal("name1", pl.getNameAt(1));
    Assert.equal(1, pl.getValueAt(0));
    Assert.equal("secondValue", pl.getValueAt(1));
    let isError = false;
    try {
      pl.getNameAt(2);
    } catch(e) {isError = true;}
    Assert.ok(isError);
    isError = false;
    try {
      pl.getValueAt(2);
    } catch(e) {isError = true;}
    Assert.ok(isError);

    // test access by name
    Assert.equal(1, pl.getValue("name0"));
    Assert.equal("secondValue", pl.getValue("name1"));

    // test access by enumerator
    let enumerator = pl.enumerate();
    let foundElements = 0;
    while (enumerator.hasMoreElements())
    {
      foundElements++;
      let nameObject = {};
      let value = enumerator.getNext(nameObject);
      let name = nameObject.value;
      dl('value is ' + value);
      dl('value is nsIVariant? ' + (value instanceof Ci.nsIVariant));
      dl('value is ' + value);
      dl('pl.getValueAt(foundElements - 1) is ' + pl.getValueAt(foundElements - 1));
      Assert.equal(value, pl.getValueAt(foundElements - 1));
      Assert.equal(name, pl.getNameAt(foundElements - 1));
    }
    Assert.equal(foundElements, 2);

    // test multi-value names
    Assert.equal(pl.getCountForName("name0"), 1);
    Assert.equal(pl.getCountForName("name1"), 1);
    Assert.equal(pl.getCountForName("idonotexist"), 0);

    // add a repeated name value
    pl.appendElement("name1", "multivalue");
    Assert.equal(pl.getCountForName("name1"), 2);
    let valueArray = pl.getValues("name1");
    Assert.equal(valueArray.length, 2);
    Assert.equal("secondValue", valueArray.queryElementAt(0, Ci.nsIVariant));
    Assert.equal("multivalue", valueArray.queryElementAt(1, Ci.nsIVariant));

    // add an attribute type, which is skipped in enumeration
    pl.appendElement("$attributes", "theAttributes");
    Assert.equal(pl.length, 4);
    foundElements = 0;
    enumerator = pl.enumerate();
    while (enumerator.hasMoreElements())
    {
      foundElements++;
      let nameObject = {};
      let value = enumerator.getNext(nameObject);
      let name = nameObject.value;
      // the following is not true in general, but only here
      // because the attribute item is at the end
      Assert.equal(value, pl.getValueAt(foundElements - 1));
      Assert.equal(name, pl.getNameAt(foundElements - 1));
    }
    Assert.equal(foundElements, 3);

    // test clear
    pl.clear();
    Assert.equal(pl.length, 0);

    // test of extended properties
    let pl1 = newPL();
    pl1.appendString("tail", "thetail");
    pl.appendElement("head", pl1);
    Assert.equal("thetail", pl.getAString("head/tail"));

    // a three level item
    let pl2 = newPL();
    pl.clear();
    pl1.clear();
    pl2.appendString("tail", "thetail");
    pl1.appendElement("mid", pl2);
    pl.appendElement("head", pl1);
    Assert.equal("thetail", pl.getAString("head/mid/tail"));

    // extended properties with multiple values
    pl2.appendString("tail", "anotherTail");
    let plMultiple = pl.getValues("head/mid/tail");  

    let tailArray = pl.getValues("head/mid/tail");
    Assert.equal(tailArray.length, 2);
    Assert.equal("thetail", tailArray.queryElementAt(0, Ci.nsIVariant));
    Assert.equal("anotherTail", tailArray.queryElementAt(1, Ci.nsIVariant));

    // unnamed values
    pl.clear();
    pl1.clear();
    pl2.clear();
    pl2.appendElement("IAmAnAttribute", "the attribute");
    pl1.appendElement("$attributes", pl2);
    pl1.appendElement("$value", "this is the value");
    pl.appendElement("Body", pl1);
    Assert.equal(pl.getAString("Body"), "this is the value");
    pl1.replaceOrAppendElement('$value', 23);
    Assert.equal(pl1.getLong("$value"), 23);
    Assert.equal(pl.getLong("Body"), 23);

    // test of getPropertyListByAttribute
    // add a second pl with different attributes
    let pl1b = newPL();
    let pl2b = newPL();
    pl1b.appendPropertyList("$attributes", pl2b);
    pl2b.appendElement("secondAttribute", "secondAttValue");
    pl2b.appendElement("thirdAttribute", "thirdAttValue");
    pl1b.appendString("$value", "secondValue");
    pl.appendPropertyList("Body", pl1b);
    dl("pl1 length is " + pl1.length);

    let plResult = pl.getPropertyListByAttribute("Body", "thirdAttribute", "thirdAttValue");
    dl('plResult is ' + plResult);
    Assert.ok(safeInstanceOf(plResult, Ci.msqIPropertyList));
    Assert.equal(plResult.getAString("$value"), "secondValue");

    // test of getPropertyLists
    pl.clear();
    pl.appendPropertyList("theName", pl1);
    pl.appendPropertyList("theName", pl2);
    let propertyLists = pl.getPropertyLists("theName");
    dump("test getPropertyLists multiLevel PL:\n" + stringPL(pl) + "\n");
    Assert.equal(propertyLists.length, 2);
    for (let i = 0; i < propertyLists.length; i++)
      Assert.ok(safeInstanceOf(propertyLists.queryElementAt(i, Ci.msqIPropertyList), Ci.msqIPropertyList));

    // test of set with multiple levels
    pl.clear();
    pl.setAString("level1/level2/level3", "levelValue");
    //dump("name[0]: " + pl.getNameAt(0) + "\n");
    //dump("name[1]: " + pl.getNameAt(1) + "\n");
    dump("multiple level PL:\n" + stringPL(pl) + "\n");
    Assert.ok(safeInstanceOf(pl.getPropertyList("level1"), Ci.msqIPropertyList));
    Assert.ok(safeInstanceOf(pl.getPropertyList("level1/level2"), Ci.msqIPropertyList));
    Assert.equal(pl.getAString("level1/level2/level3"), "levelValue");

    // test of cloning
    let cloneMe = newPL();
    cloneMe.appendElement('doClone', 'Iexist');
    cloneMe.appendElement('dontClone', 'ishouldnotclone');
    let excludeList = new StringArray();
    excludeList.append('dontClone');
    let cloned = cloneMe.clone(excludeList);
    Assert.equal(cloneMe.getAString('dontClone'), 'ishouldnotclone');
    Assert.equal(cloneMe.indexOf('dontClone'), 1);
    Assert.equal(cloned.indexOf('doClone'), 0);
    Assert.equal(cloned.indexOf('dontClone'), Ci.msqIStringArray.noIndex);

    /**/
    // test of PLON
    // add two properties
    pl.clear();
    pl.appendElement("name0", 1);
    pl.appendElement("name1", "secondValue");
    pl.appendElement("name2", "embedded\"quote");
    pl.appendElement("name3", "embedded\\backslash");
    pl.appendElement("nameAsPl", oPL({stuff: "someStuff", moreStuff: -2}));
    pl.appendElement("anArrayPL", aPL('theArrayName', ['firstArrayElement', 'secondArrayElement']));
    pl.appendBoolean("someTrue", true);
    pl.appendBoolean("someFalse", false);
    pl.appendLong("someLong", 12345);
    pl.appendString("someString", "theString");
    let plon= pl.PLON;
    dl('PLON of list is\n' + plon + '\n');
    pl1.PLON = plon;
    dl('recreated property list is\n' + stringPL(pl1));

    Assert.equal(pl1.getLong("name0"), 1);
    Assert.equal(pl1.getAString("name1"), "secondValue");
    Assert.equal(pl1.getAString("name2"), "embedded\"quote");
    Assert.equal(pl1.getAString("name3"), "embedded\\backslash");
    Assert.equal(pl1.getAString("nameAsPl/stuff"), "someStuff");
    Assert.equal(pl1.getLong("nameAsPl/moreStuff"), -2);

    let theArray = pl1.getPropertyList("anArrayPL");
    Assert.ok(safeInstanceOf(theArray, Ci.msqIPropertyList));
    let theArrayValues = theArray.getValues("theArrayName");
    Assert.equal(theArrayValues.length, 2);
    Assert.equal('firstArrayElement', theArrayValues.queryElementAt(0, Ci.nsIVariant));
    Assert.equal('secondArrayElement', theArrayValues.queryElementAt(1, Ci.nsIVariant));

    // JSON should also accept this without throwing an error  
    let plAsJSON = JSON.parse(plon);
    dl('dump of JSON\n' + JSON.stringify(plAsJSON));

    // set attributes
    let attPL = newPL();
    attPL.setAttribute("theName", "theValue");
    let attributes = attPL.getPropertyList("$attributes");
    Assert.equal("theValue", attributes.getAString("theName"));
    /**/
  },
]
