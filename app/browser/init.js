/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

const {app} = require('electron')
const path = require('path')

if (process.env.NODE_ENV === 'development') {
  app.setPath('sourceDir', path.join(__dirname, '..', '..'))
}
