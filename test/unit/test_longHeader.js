/* ***** BEGIN LICENSE BLOCK *****
*/

Cu.import("resource://exquilla/ewsUtils.jsm");

// This sample comes from an error report from a user, where the message content was blocked
// by an error.
let sample = `
<AM5PR04MB31699E2CA122C54BAE5F9B86E3C30@AM5PR04MB3169.eurprd04.prod.outlook.com>,<DB6PR0401MB2424138443B8247114EF150BE8C30@DB6PR0401MB2424.eurprd04.prod.outlook.com>,<AM5PR04MB316938378D95294FE61F5FC9E3C30@AM5PR04MB3169.eurprd04.prod.outlook.com>,<AM5PR04MB3169EA4E5B408AC6B43B99C7E3C00@AM5PR04MB3169.eurprd04.prod.outlook.com>,<AM5PR04MB31692F54FCFB51FB394BADE9E3C00@AM5PR04MB3169.eurprd04.prod.outlook.com>,<F92E1EA5-EEF6-4EF3-A088-3C7F787A49C6@novardis.com>,<AM5PR04MB31691EE7D6E2BC858855DD12E3C10@AM5PR04MB3169.eurprd04.prod.outlook.com>,<BA1855CC-DD1B-466A-9195-BF965923E58B@novardis.com>,<FAA0E4CD-674B-46BB-8CE4-85A90FBF2832@novardis.com>,<7AF5A3E1-8D47-4AB2-B584-DAAD69177806@novardis.com>`;

// A failure would be a throw from Utils.oPL
function run_test()
{
  let properties = Utils.oPL({
    References: sample
  });
  dump("Headers: " + Utils.plToHeaders(properties) + "\n");
}
