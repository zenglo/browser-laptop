/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

const electron = require('electron')
const BrowserWindow = electron.BrowserWindow
const AppStore = require('../js/stores/appStore')
const config = require('../js/constants/config')
const {getExtensionsPath} = require('../js/lib/appUrlUtil')
const {getSetting} = require('../js/settings')
const messages = require('../js/constants/messages')
const settings = require('../js/constants/settings')
const {passwordManagers, extensionIds} = require('../js/constants/passwordManagers')
const braveManifest = require('./braveManifest')
const extensions = electron.extensions
const installedExtensions = {}

const checkExtensions = () => {
  // Holds an array of arrays of the form: [extensionId, shouldEnable, extensionPath]
  const activePasswordManagerIs = (passwordManager) => getSetting(settings.ACTIVE_PASSWORD_MANAGER) === passwordManager
  const availableExtensions = [
    [config.PDFJSExtensionId, getSetting(settings.PDFJS_ENABLED), getExtensionsPath('pdfjs')],
    [extensionIds[passwordManagers.ONE_PASSWORD], activePasswordManagerIs(passwordManagers.ONE_PASSWORD), getExtensionsPath('1password')],
    [extensionIds[passwordManagers.DASHLANE], activePasswordManagerIs(passwordManagers.DASHLANE), getExtensionsPath('dashlane')],
    [extensionIds[passwordManagers.LAST_PASS], activePasswordManagerIs(passwordManagers.LAST_PASS), getExtensionsPath('lastpass')]
  ]
  const handleExtension = ([extensionId, shouldEnable, extensionPath]) => {
    if (shouldEnable) {
      installExtension(extensionId, extensionPath)
      enableExtension(extensionId)
    } else {
      disableExtension(extensionId)
    }
  }
  availableExtensions.forEach(handleExtension)
}

const installExtension = (extensionId, baseDir, options = {}) => {
  if (!installedExtensions[extensionId]) {
    const manifest = options.manifest || {}
    const manifestLocation = options.manifestLocation || 'unpacked'
    const flags = options.flags || 0
    console.log('----load extension', baseDir, manifest, manifestLocation, flags)
    try {
      var installInfo = extensions.load(baseDir, manifest, manifestLocation, flags)
      installedExtensions[installInfo.id] = installInfo
      console.log('loaded extension with info', installInfo)
    } catch (e) {
      console.log('exception caught: ', e)
    }
  }
}

const enableExtension = (extensionId) => {
  var installInfo = installedExtensions[extensionId]
  if (installInfo) {
    extensions.enable(installInfo.id)
  }
}

const disableExtension = (extensionId) => {
  var installInfo = installedExtensions[extensionId]
  if (installInfo) {
    extensions.disable(installInfo.id)
  }
}

module.exports.init = () => {
  process.on('chrome-browser-action-popup', function (extensionId, tabId, name, props, popup) {
    // TODO(bridiver) find window from tabId
    let win = BrowserWindow.getFocusedWindow()
    if (!win) {
      return
    }
    win.webContents.send(messages.NEW_POPUP_WINDOW, extensionId, popup, props)
  })

  extensions.on('crx-installer-done', () => {
    // TODO
    console.log('--------front-end-crx-installer-done')
  })

  extensions.on('extension-enabled', () => {
    // TODO
    console.log('--------extension-enabled')
  })

  // Install the Brave extension
  installExtension(config.braveExtensionId, getExtensionsPath('brave'), {manifest_location: 'component', manifest: braveManifest})

  AppStore.addChangeListener(() => {
    checkExtensions()
  })
  checkExtensions()
}
