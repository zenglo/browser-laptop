/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

const assert = require('assert')
const Immutable = require('immutable')
const {STATE_SITES} = require('../../../js/constants/stateConstants')
const historyUtil = require('../lib/historyUtil')
const urlUtil = require('../../../js/lib/urlutil')
const {makeImmutable, isMap} = require('./immutableUtil')

const validateState = function (state) {
  state = makeImmutable(state)
  assert.ok(isMap(state), 'state must be an Immutable.Map')
  assert.ok(isMap(state.get(STATE_SITES.HISTORY_SITES)), 'state must contain an Immutable.Map of historySites')
  return state
}

const historyState = {
  getSites: (state) => {
    state = validateState(state)
    return state.get(STATE_SITES.HISTORY_SITES, Immutable.Map())
  },

  getSite: (state, key) => {
    state = validateState(state)
    return state.getIn([STATE_SITES.HISTORY_SITES, key], Immutable.Map())
  },

  hasSite: (state, key) => {
    state = validateState(state)
    return state.hasIn([STATE_SITES.HISTORY_SITES, key], Immutable.Map())
  },

  addSite: (state, siteDetail) => {
    let sites = historyState.getSites(state)
    let siteKey = historyUtil.getKey(siteDetail)
    siteDetail = makeImmutable(siteDetail)

    const oldSite = sites.get(siteKey)
    let site
    if (oldSite) {
      site = historyUtil.mergeSiteDetails(oldSite, siteDetail)
    } else {
      let location
      if (siteDetail.has('location')) {
        location = urlUtil.getLocationIfPDF(siteDetail.get('location'))
        siteDetail = siteDetail.set('location', location)
      }

      siteKey = historyUtil.getKey(siteDetail)
      site = historyUtil.prepareHistoryEntry(siteDetail)
    }

    state = state.setIn([STATE_SITES.HISTORY_SITES, siteKey], site)
    return state
  },

  removeSite: (state, siteKey) => {
    return state.deleteIn([STATE_SITES.HISTORY_SITES, siteKey])
  },

  clearSites: (state) => {
    return state.set(STATE_SITES.HISTORY_SITES, Immutable.Map())
  },

  getLocationProperty: (state, location, propName, defaultValue) => {
    const historyKey = historyUtil.getKey(Immutable.fromJS({ location }))
    if (historyKey == null) {
      return defaultValue
    }

    let historyItem = historyState.getSite(state, historyKey)
    if (historyItem.isEmpty()) {
      return defaultValue
    }
    return historyItem.get(propName)
  },

  updateProperty: (state, siteDetails, propName, propValue) => {
    const historyKey = historyUtil.getKey(siteDetails)
    if (historyKey == null) {
      return state
    }

    let historyItem = historyState.getSite(state, historyKey)
    if (historyItem.isEmpty()) {
      return state
    }

    historyItem = historyItem.set(propName, propValue)
    return state.setIn([STATE_SITES.HISTORY_SITES, historyKey], historyItem)
  },

  updateFavicon: (state, siteDetails, favIcon) => {
    return historyState.updateProperty(state, siteDetails, 'favicon', favIcon)
  },

  updateTitle: (state, siteDetails, title) => {
    return historyState.updateProperty(state, siteDetails, 'title', title)
  },

  updateThemeColor: (state, siteDetails, themeColor) => {
    return historyState.updateProperty(state, siteDetails, 'themeColor', themeColor)
  },

  updateComputedThemeColor: (state, siteDetails, computedThemeColor) => {
    return historyState.updateProperty(state, siteDetails, 'computedThemeColor', computedThemeColor)
  },

  getThemeColor: (state, location) => {
    return historyState.getLocationProperty(state, location, 'themeColor')
  },

  getComputedThemeColor: (state, location) => {
    return historyState.getLocationProperty(state, location, 'computedThemeColor')
  }
}

module.exports = historyState
