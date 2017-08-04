/* global self */

const suggestion = require('app/common/lib/suggestion2')

const log = (msg) =>
  self.postMessage({ msg })

self.onmessage = function (evt) {
  log('hi' + JSON.stringify(muon.url.parse('https://www.brianbondy.com')) + evt.data /*+ suggestion*/)
}
