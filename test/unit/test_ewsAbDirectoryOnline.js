/* ***** BEGIN LICENSE BLOCK *****
 * This file is part of ExQuilla by Mesquilla.
 *
 * Copyright 2016 R. Kent James
 *
 * All Rights Reserved
 *
 * ***** END LICENSE BLOCK ***** */

// This file tests aspects of the ExQuilla Ab directory implementation that
// require interaction with a server to accomplish.

load('utilities.js');
load('soapRequestUtils.js');

function dl(a) { dump(a + "\n");}

function* taskSetupAB() {

  // XXX TODO: automate creation of the test directory

  //let directories = MailServices.ab.directories;
  //while (directories.hasMoreElements()) {
  //  let dir = directories.getNext()
  //                       .QueryInterface(Ci.nsIAbDirectory);
  //  dl("directory URI is :" + dir.URI);
  // }
  let url = "";
  url += Services.prefs.getCharPref("extensions.exquilla.abScheme", "exquilla-directory");
  url += /:\/\/.*/.exec(gNativeMailbox.serverURI)[0];
  url += "/Contacts/TestContacts";
  dl("proposed url is " + url);
  let gDirectory = MailServices.ab.getDirectory(url);
  Assert.ok(gDirectory instanceof Ci.nsIAbDirectory);

  yield PromiseUtils.promiseDelay(1000);
  dl("after delay1");
  /**/
  let listener = machineListener();
  let ewsDirectory = safeGetJS(gDirectory);
  ewsDirectory.updateDirectory(listener);
  yield listener.promise;

  let count = 0;
  let promiseObserve = PromiseUtils.promiseObservation(null, "exquilla-gettingNewItems-StopMachine", gDirectory.URI);
  let childCards = gDirectory.childCards;
  yield promiseObserve;

  while (childCards.hasMoreElements()) {
    let card = childCards.getNext().QueryInterface(Ci.nsIAbCard);
    count++;
  }
  dl("count is " + count);
}

var tests = [
  taskSetupEwsServer,
  taskSetupTestContactFolder,
  testAddSkinkDirectory,
  taskTestContact,
  //taskSetupAB,
  taskShutdown,
];

function run_test()
{
  tests.forEach(x => add_task(x));
  run_next_test();
}

// TODO: move to soapRequestUtils.jsm

function* taskTestContact() {

  // test the nsIAbDirectory overrides

  // add a contact
  let card = Cc["@mozilla.org/addressbook/cardproperty;1"]
               .createInstance(Ci.nsIAbCard);

  card.primaryEmail = "userprim@foo.invalid";
  let promise = PromiseUtils.promiseAbItemAdded(gDirectory);
  gDirectory.addCard(card);
  let promisedCard = yield promise;

  Assert.ok(promisedCard instanceof Ci.nsIAbCard);
  Assert.equal(card.primaryEmail, promisedCard.primaryEmail);

  // modify a contact
  promisedCard.lastName = "Testly";
  promise = PromiseUtils.promiseObservation(promisedCard, "exquilla-updateCard-StopMachine", null);

  gDirectory.modifyCard(promisedCard);
  yield promise;

  // test that the nativeFolder surname matches the new last name
  let itemId = promisedCard.getProperty('itemId', '');
  showPL(gNativeMailbox.getItem(itemId).properties);
  let surname = gNativeMailbox.getItem(itemId)
                              .properties
                              .getAString("Surname");
  Assert.equal(surname, "Testly");

  // test the nsIAbCollection overrides since we have a card
  let collection = gDirectory.QueryInterface(Ci.nsIAbCollection);
  let foundCard = collection.cardForEmailAddress("userprim@foo.invalid");
  Assert.equal(foundCard.lastName, "Testly");

  let gotCard = collection.getCardFromProperty('PrimaryEmail', "userprim@foo.invalid", true);
  Assert.equal(gotCard.lastName, "Testly");

  // continue testing nsIAbDirectory overrides

  // deleteCards
  let cards = Cc["@mozilla.org/array;1"].createInstance(Ci.nsIMutableArray);
  cards.appendElement(gotCard, false);

  // The skink deleteCards has no listener. The EWS version just calls a version
  // with a listener, so we'll use that to test.
  let deleteListener = new PromiseUtils.MachineListener();
  let ewsDirectory = safeGetJS(gDirectory);
  ewsDirectory.deleteCardsWithListener(cards, deleteListener);
  yield deleteListener.promise;

  gotCard = collection.getCardFromProperty('PrimaryEmail', "userprim@foo.invalid", true);
  Assert.ok(!gotCard);
}
