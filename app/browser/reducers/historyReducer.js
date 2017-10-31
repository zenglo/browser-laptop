/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

const Immutable = require('immutable')
const BrowserWindow = require('electron').BrowserWindow

// State
const historyState = require('../../common/state/historyState')
const aboutHistoryState = require('../../common/state/aboutHistoryState')
const tabState = require('../../common/state/tabState')

// Constants
const appConstants = require('../../../js/constants/appConstants')
const {STATE_SITES} = require('../../../js/constants/stateConstants')
const messages = require('../../../js/constants/messages')

// Utils
const {makeImmutable} = require('../../common/state/immutableUtil')
const {remove} = require('../../common/lib/siteSuggestions')
const syncUtil = require('../../../js/state/syncUtil')
const filtering = require('../../filtering')
const {calculateTopSites} = require('../api/topSites')
const bookmarkLocationCache = require('../../common/cache/bookmarkLocationCache')

/**
 * Helper to pass message to windows to clear closed frames
 * @param {Array.BrowserWindow} windows
 * @param {string} historyKey
 */
const clearClosedFrames = (windows, historyKey) => {
  windows.forEach((wnd) => {
    if (!wnd.webContents) {
      return
    }
    wnd.webContents.send(messages.CLEAR_CLOSED_FRAMES, historyKey.split('|')[0])
  })
}

const historyReducer = (state, action, immutableAction) => {
  action = immutableAction || makeImmutable(action)
  switch (action.get('actionType')) {
    case appConstants.APP_ON_CLEAR_BROWSING_DATA:
      {
        const defaults = state.get('clearBrowsingDataDefaults')
        const temp = state.get('tempClearBrowsingData', Immutable.Map())
        const clearData = defaults ? defaults.merge(temp) : temp
        if (clearData.get('browserHistory')) {
          let historyList = Immutable.List()
          historyState.getSites(state).forEach((site) => {
            const bookmarkKey = bookmarkLocationCache.getCacheKey(state, site.get('location'))
            if (bookmarkKey.size === 0) {
              historyList = historyList.push(site)
            }
          })

          remove(historyList)
          state = historyState.clearSites(state)
          state = aboutHistoryState.clearHistory(state)
          filtering.clearHistory()
        }
        break
      }
    case appConstants.APP_ADD_HISTORY_SITE:
      {
        const detail = action.get('siteDetail', Immutable.Map())

        if (detail.isEmpty()) {
          break
        }

        if (Immutable.List.isList(detail)) {
          detail.forEach((item) => {
            state = historyState.addSite(state, item)
            state = syncUtil.updateObjectCache(state, item, STATE_SITES.HISTORY_SITES)
          })
        } else {
          state = historyState.addSite(state, detail)
          state = syncUtil.updateObjectCache(state, detail, STATE_SITES.HISTORY_SITES)
        }

        calculateTopSites(true)
        state = aboutHistoryState.setHistory(state, historyState.getSites(state))
        break
      }

    case appConstants.APP_REMOVE_HISTORY_SITE:
      {
        const historyKey = action.get('historyKey')
        if (historyKey == null) {
          break
        }
        const windows = BrowserWindow.getAllWindows()

        if (Immutable.List.isList(historyKey)) {
          action.get('historyKey', Immutable.List()).forEach((key) => {
            state = historyState.removeSite(state, key)
            clearClosedFrames(windows, key)
            // TODO: Implement Sync history site removal
            // state = syncUtil.updateObjectCache(state, action.get('siteDetail'), STATE_SITES.HISTORY_SITES)
          })
        } else {
          state = historyState.removeSite(state, historyKey)
          clearClosedFrames(windows, historyKey)
          // TODO: Implement Sync history site removal
          // state = syncUtil.updateObjectCache(state, action.get('siteDetail'), STATE_SITES.HISTORY_SITES)
        }

        calculateTopSites(true)
        state = aboutHistoryState.setHistory(state, historyState.getSites(state))
        break
      }

    case appConstants.APP_POPULATE_HISTORY:
      state = aboutHistoryState.setHistory(state, historyState.getSites(state))
      break

    case appConstants.APP_TAB_FAV_ICON_UPDATED: {
      const tabId = action.get('tabId')
      const favIconUrls = action.get('favIconUrls')
      const url = tabState.getUrl(state, tabId)
      if (favIconUrls.size > 0) {
        state = historyState.updateFavicon(state, Immutable.fromJS({ location: url }), favIconUrls.get(0))
        state = aboutHistoryState.setHistory(state, historyState.getSites(state))
      }
      break
    }
    case appConstants.APP_TAB_TITLE_UPDATED: {
      const tabId = action.get('tabId')
      const title = action.get('title')
      const url = tabState.getUrl(state, tabId)
      state = historyState.updateTitle(state, Immutable.fromJS({ location: url }), title)
      state = aboutHistoryState.setHistory(state, historyState.getSites(state))
      break
    }
    case appConstants.APP_TAB_THEME_COLOR_UPDATED: {
      const tabId = action.get('tabId')
      const themeColor = action.get('themeColor')
      const url = tabState.getUrl(state, tabId)
      console.log('app-tab-theme-color-updated:', url, tabId, themeColor)
      // Due to a bug in Electron, after navigating to a page with a theme color
      // to a page without a theme color, the background is sent to us as black
      // even know there is no background. To work around this we just ignore
      // the theme color in that case and let the computed theme color take over.
      // TODO: This is moved over from frame.js, is it still needed?
      state = historyState.updateThemeColor(state, Immutable.fromJS({ location: url }), themeColor !== '#000000' ? themeColor : null)
      break
    }
    case appConstants.APP_TAB_COMPUTED_THEME_COLOR_UPDATED: {
      const location = action.get('location')
      const computedThemeColor = action.get('computedThemeColor')
      console.log('app-tab-computed-theme-colo-updated:', location, computedThemeColor)
      state = historyState.updateComputedThemeColor(state, Immutable.fromJS({ location }), computedThemeColor)
      break
    }
  }
  return state
}

module.exports = historyReducer
