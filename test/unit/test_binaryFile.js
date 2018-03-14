// tests reading and writing a binary file using base64 encoding
// This is typical in attachment handling.

Cu.import("resource://exquilla/ewsUtils.jsm");
Components.utils.import("resource://gre/modules/osfile.jsm");
Utils.importLocally(this);
XPCOMUtils.defineLazyModuleGetter(this, "Base64", "resource://exquilla/Base64.jsm");

// test files
let asciiFile = do_get_file("data/ascii.bin");
let binaryFile = do_get_file("data/pdfFragment.bin");

var tests = [
  compare512,
  binaryRead,
  fileRead,
  fileWrite
  
];

let test_cases = [
  [
    asciiFile,
    "Two-line ASCII\r\nPretending to be binary.",
    "VHdvLWxpbmUgQVNDSUkNClByZXRlbmRpbmcgdG8gYmUgYmluYXJ5Lg==",
  ],
  [
    binaryFile,
    "",
    "Pj5zdHJlYW0NCmjeYmJkEGBgYmBaCCQYp4IIZSDBYggieEDEfhCxC0gwg5SwnAYRJ0FcTxDrHJC4xcnAxMgYDWQxMDDiJv4zCPwCCDAAGWUKDg0KZW5kc3RyZWFtDQ==",
  ],
];

//Uiint8Array with content of binary file
let binaryArray;
function* binaryRead() {
  // reads in the second file to establish the correct binary
  binaryArray = yield OS.File.read(binaryFile.path);
  dl("binaryArray length is " + binaryArray.length);
  Assert.ok(binaryArray.length > 0);
}

function* compare512() {
  let dbl256 = [];
  for (let i of [0, 1]) {
    for (let j = 0; j < 256; j++) {
      dbl256.push(j);
    }
  }
  let str512 = String.fromCharCode(...dbl256);
  dl("str512 length is " + str512.length);
  arrayCompare(str512, atob(btoa(str512)));
  let uint8Array = new Uint8Array(dbl256);
  arrayCompare(uint8Array, dbl256);

  let basePath = OS.Path.join(OS.Constants.Path.tmpDir, "test.bin");
  let {path:tempPath, file:tempFile} = yield OS.File.openUnique(basePath);
  dl("tempFile path is " + tempPath);
  yield tempFile.close();
  //yield OS.File.remove(tempPath);

  yield OS.File.writeAtomic(tempPath, uint8Array);
  let uint8Result = yield OS.File.read(tempPath);
  arrayCompare(dbl256, uint8Result);
  yield OS.File.remove(tempPath);

}

function* fileRead() {
  for (let testCase of test_cases) {
    let [theFile, binaryExpected, b64Expected] = testCase;
    // read file into local buffer
    let contentBUF = yield OS.File.read(theFile.path);
    dl("contentBUF is " + contentBUF);
    // check contents
    let decoder = new TextDecoder();
    if (binaryExpected)
      arrayCompare(binaryExpected, decoder.decode(contentBUF));
    else {
      arrayCompare(binaryArray, contentBUF);
    }

    // show the results
    let count = 0;
    for (let ch of contentBUF) {
      dump("<" + String.fromCharCode(ch) + ">(" + ch.toString(16) + "), ");
      if ((++count % 8) == 0) {
        dump("\n");
      }
    }
    dump("\n");
    let b64BUF = Base64.fromByteArray(contentBUF);
    dl("b64BUF is " + b64BUF + "\n");
    // base64 encode
    arrayCompare(b64BUF, b64Expected);

    // alternate sync approach
    let istream = Cc["@mozilla.org/network/file-input-stream;1"]
                    .createInstance(Ci.nsIFileInputStream);
    istream.init(theFile, -1, -1, false);
    let bstream = Cc["@mozilla.org/binaryinputstream;1"]
                    .createInstance(Ci.nsIBinaryInputStream);
    bstream.setInputStream(istream);
    // xxx todo This claims it is ASCII but I am not making that assumption!
    //let content = IOUtils.loadFileToString(file);
    let contentSYN = bstream.readBytes(bstream.available());
    count = 0;
    for (let ch of contentSYN) {
      dump("<" + ch + ">(" + ch.charCodeAt().toString(16) + "), ");
      if ((++count % 8) == 0) {
        dump("\n");
      }
    }
    dump("\n");
   arrayCompare(btoa(contentSYN), b64Expected);

  }
}

function* fileWrite() {

  for (let testCase of test_cases) {
    let basePath = OS.Path.join(OS.Constants.Path.tmpDir, "test.bin");
    let {path:tempPath, file:tempFile} = yield OS.File.openUnique(basePath);
    dl("tempFile path is " + tempPath);
    Assert.ok(yield OS.File.exists(tempPath));
    yield tempFile.close();
    yield OS.File.remove(tempPath);

    let [theFile, binaryExpected, b64Expected] = testCase;

    // 1) Old-style byte-by-byte
    let tempUri = OS.Path.toFileURI(tempPath);
    let tempUriObj = Services.io.newURI(tempUri, null, null).QueryInterface(Ci.nsIFileURL);
    dl("tempUriObj = " + tempUriObj);
    let stream = Cc["@mozilla.org/network/file-output-stream;1"]
                   .createInstance(Ci.nsIFileOutputStream);
    dl("stream is " + stream);
    dl("tempUriObj.file is " + tempUriObj.file);
    stream.init(tempUriObj.file, 0x04 | 0x08 | 0x20, 0o600, 0); // readwrite, create, truncate
    let buffer  = Cc["@mozilla.org/network/buffered-output-stream;1"]
                    .createInstance(Ci.nsIBufferedOutputStream);
    buffer.init(stream, 4096);
    let bstream = Cc["@mozilla.org/binaryoutputstream;1"]
                    .createInstance(Ci.nsIBinaryOutputStream);
    bstream.setOutputStream(buffer);

    /*
    let charArray = atob(b64Expected);
    let byteArray = [];
    for (let i = 0; i < charArray.length; i++)
      byteArray.push(charArray.charCodeAt(i));
    */
    let contentDecodedArray = Base64.toByteArray(b64Expected);
    let byteArray = [...contentDecodedArray];

    if (binaryExpected) {
      let byteExpected = [];
      for (let i = 0; i < binaryExpected.length; i++)
        byteExpected.push(binaryExpected.charCodeAt(i));
      arrayCompare(byteExpected, byteArray);
    }
    else
      arrayCompare(binaryArray, byteArray);

    // Write out the binary file using old-style byte writes
    bstream.writeByteArray(byteArray, byteArray.length);
    
    bstream.close();
    buffer.close();
    stream.close();

    // Now read in the file
    let contentBUF = yield OS.File.read(tempPath);
    arrayCompare(contentBUF, byteArray);
    yield OS.File.remove(tempPath);

  /**/
  }

}

function run_test()
{
  tests.forEach(x => add_task(x));
  run_next_test();
}

function arrayCompare(first, second) {
  Assert.equal(first.length, second.length);
  let matches = true;
  for (let i = 0; i < first.length; i++) {
    if (first[i] != second[i]) {
      matches = false;;
      break;
    }
  }
  Assert.ok(matches);
}
