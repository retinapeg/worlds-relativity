import { readFileSync, writeFileSync } from 'node:fs';

// Aliyun 7.3.3 inherits the page's HTTP scheme for signed media signalling.
// Our loopback development page must still send those credentials over HTTPS.
// Patch only these two known expressions, fail closed on any upstream change.
const root = 'node_modules/aliyun-rtc-sdk/';
const manifest = JSON.parse(readFileSync(root + 'package.json', 'utf8'));
if (manifest.version !== '7.3.3') throw new Error('Review the RTC HTTPS compatibility patch before changing SDK versions.');
const path = root + 'dist/aliyun-rtc-sdk.es.js';
let source = readFileSync(path, 'utf8');
const marker = '"https://" /* Worlds: encrypted media signalling on localhost */';
for (const variable of source.split(marker).length - 1 === 2 ? [] : ['e', 'i']) {
  const before = `(["http:", "https:"].indexOf(${variable}) > -1 ? ${variable} : "https:") + "//"`;
  if (source.split(before).length - 1 !== 1) throw new Error('Unexpected RTC signalling source; no broad replacement applied.');
  source = source.replace(before, marker);
}
// Preferred raw-IP signalling prevents TLS hostname validation. Use the SDK's
// existing DNS route immediately, without the two 60-second IP timeouts.
const dnsMarker = '/* Worlds: TLS signalling uses DNS names */';
if (!source.includes(dnsMarker)) {
  const assignment = /^.*R\.l1ip \?.*this\.bizControl\.rtsManager\.preferredSubL1Ip = void 0;$/m;
  if (!assignment.test(source)) throw new Error('Unexpected RTC preferred-IP source; review before patching.');
  source = source.replace(assignment, `            this.bizControl.rtsManager.preferredPubL1Ip = void 0; this.bizControl.rtsManager.preferredSubL1Ip = void 0; ${dnsMarker}`);
}
writeFileSync(path, source);
console.log('Verified RTC HTTPS and DNS signalling compatibility patches.');
