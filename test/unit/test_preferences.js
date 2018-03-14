/**
 * See if we can load preferences
 */

function run_test() {
  // Loaded in head_exchangesws.js
  Assert.ok(Services.prefs.getBoolPref("extensions.exquilla.log.logBodies"));
  // Set in preferences.js
  Assert.ok(Services.prefs.getBoolPref("extensions.exquilla.useGAL"));
}
