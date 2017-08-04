/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

const Immutable = require('immutable')
const {makeImmutable} = require('../../common/state/immutableUtil')
const {isUrl, aboutUrls, isNavigatableAboutPage, isSourceAboutUrl} = require('../../../js/lib/appUrlUtil')
const {isHttpOrHttps} = require('../../../js/lib/urlutil')
const suggestionTypes = require('../../../js/constants/suggestionTypes')
const getSetting = require('../../../js/settings').getSetting
const settings = require('../../../js/constants/settings')
const config = require('../../../js/constants/config')
const {topSites, getSiteOrder} = require('../data/topSites')
const fetchSearchSuggestions = require('./fetchSearchSuggestions')
const {getFrameByTabId, getTabsByWindowId} = require('../../common/state/tabState')
const {query} = require('./siteSuggestions')
const debounce = require('../../../js/lib/debounce')
const {createVirtualHistoryItems, getSortForSuggestions, getMapListToElements} = require('./suggestion2')

/*
 * Normalize a location for url suggestion sorting
 *
 * @param {string} location - history item location
 *
 */
const normalizeLocation = (location) => {
  if (typeof location === 'string') {
    location = location.replace(/www\./, '')
    location = location.replace(/^http:\/\//, '')
    location = location.replace(/^https:\/\//, '')
  }
  return location
}

/*
 * Determines based on user input if the location should
 * be normalized.  If the user is typing http prefix then
 * they are specifying something explicitly.
 *
 * @return true if urls being compared should be normalized
 */
const shouldNormalizeLocation = (input) => {
  const prefixes = ['http://', 'https://', 'www.']
  return prefixes.every((prefix) => {
    if (input.length > prefix.length) {
      return true
    }
    for (let i = 0; i < Math.min(prefix.length, input.length); i++) {
      if (input[i] !== prefix[i]) {
        return true
      }
    }
    return false
  })
}

/**
 * Returns a function that sorts 2 hosts
 * The result of that function is a postive, negative, or 0 result.
 */
const getSortByDomainForHosts = (userInputHost) => {
  return (host1, host2) => {
    host1 = host1.replace('www.', '')
    host2 = host2.replace('www.', '')
    let pos1 = host1.indexOf(userInputHost)
    let pos2 = host2.indexOf(userInputHost)
    if (pos1 !== -1 && pos2 === -1) {
      return -2
    }
    if (pos1 === -1 && pos2 !== -1) {
      return 2
    }
    if (pos1 !== -1 && pos2 !== -1) {
      // Try to match on the first position without taking into account decay sort.
      // This is because autocomplete is based on matching prefixes.
      if (pos1 === 0 && pos2 !== 0) {
        return -1
      }
      if (pos1 !== 0 && pos2 === 0) {
        return 1
      }
    }

    const topPos1 = getSiteOrder(host1)
    const topPos2 = getSiteOrder(host2)

    if (topPos1 !== -1 && topPos2 === -1) {
      return -1
    }
    if (topPos2 !== -1 && topPos1 === -1) {
      return 1
    }
    if (topPos1 !== -1 && topPos2 !== -1) {
      return topPos1 - topPos2
    }

    // Can't determine what is the best match
    return 0
  }
}

/**
 * Returns a function that sorts search suggestion results.
 * Results starting with 'http://' or 'https://' are de-prioritized.
 */
const getSortForSearchSuggestions = (userInput) => {
  return (s1, s2) => {
    if (userInput.startsWith('http')) {
      return 0
    }
    if (!isHttpOrHttps(s1) && isHttpOrHttps(s2)) {
      return -1
    }
    if (isHttpOrHttps(s1) && !isHttpOrHttps(s2)) {
      return 1
    }
    return 0
  }
}

const getHistorySuggestions = (state, urlLocationLower) => {
  return new Promise((resolve, reject) => {
    const options = {
      historySuggestionsOn: getSetting(settings.HISTORY_SUGGESTIONS),
      bookmarkSuggestionsOn: getSetting(settings.BOOKMARK_SUGGESTIONS)
    }

    query(urlLocationLower, options).then((results) => {
      const {app} = require('electron')
      const worker = app.createWorker('app/browser/workers/suggestionsWorker')
      worker.on('message', function (evt) {
        console.log('message in:', evt)
      })
      worker.on('start', function () {
        if (worker.postMessage) {
          worker.postMessage({b: 'hi'})
        }
      })
      worker.on('error', function (message, stack) {
        try {
          worker.terminate()
        } catch (ex) {
        }
      })
      worker.start()
      results = results.concat(createVirtualHistoryItems(results, urlLocationLower))
      const sortHandler = getSortForSuggestions(urlLocationLower)
      results = results.sort(sortHandler)
      results = results.slice(0, config.urlBarSuggestions.maxHistorySites)
      results = makeImmutable(results)
      const mapListToElements = getMapListToElements(urlLocationLower)
      const suggestionsList = mapListToElements({
        data: results,
        maxResults: config.urlBarSuggestions.maxHistorySites,
        type: options.historySuggestionsOn ? suggestionTypes.HISTORY : suggestionTypes.BOOKMARK,
        filterValue: null
      })
      resolve(suggestionsList)
    })
  })
}

const getAboutSuggestions = (state, urlLocationLower) => {
  return new Promise((resolve, reject) => {
    const mapListToElements = getMapListToElements(urlLocationLower)
    const suggestionsList = mapListToElements({
      data: aboutUrls.keySeq().filter((x) => isNavigatableAboutPage(x)),
      maxResults: config.urlBarSuggestions.maxAboutPages,
      type: suggestionTypes.ABOUT_PAGES
    })
    resolve(suggestionsList)
  })
}

const getOpenedTabSuggestions = (state, windowId, urlLocationLower) => {
  return new Promise((resolve, reject) => {
    const sortHandler = getSortForSuggestions(urlLocationLower)
    const tabs = getTabsByWindowId(state, windowId)
    let suggestionsList = Immutable.List()
    if (getSetting(settings.OPENED_TAB_SUGGESTIONS)) {
      const mapListToElements = getMapListToElements(urlLocationLower)
      suggestionsList = mapListToElements({
        data: tabs,
        maxResults: config.urlBarSuggestions.maxOpenedFrames,
        type: suggestionTypes.TAB,
        filterValue: (tab) => !isSourceAboutUrl(tab.get('url')) &&
          !tab.get('active') &&
          (
            (tab.get('title') && tab.get('title').toLowerCase().indexOf(urlLocationLower) !== -1) ||
            (tab.get('url') && tab.get('url').toLowerCase().indexOf(urlLocationLower) !== -1)
          ),
        sortHandler
      })
    }
    resolve(suggestionsList)
  })
}

const getSearchSuggestions = (state, tabId, urlLocationLower) => {
  return new Promise((resolve, reject) => {
    let suggestionsList = Immutable.List()
    if (getSetting(settings.OFFER_SEARCH_SUGGESTIONS)) {
      const searchResults = state.get('searchResults')
      const sortHandler = getSortForSearchSuggestions(urlLocationLower)
      if (searchResults) {
        const mapListToElements = getMapListToElements(urlLocationLower)
        suggestionsList = mapListToElements({
          data: searchResults,
          maxResults: config.urlBarSuggestions.maxSearch,
          type: suggestionTypes.SEARCH,
          sortHandler
        })
      }
    }
    resolve(suggestionsList)
  })
}

const getAlexaSuggestions = (state, urlLocationLower) => {
  return new Promise((resolve, reject) => {
    const sortHandler = getSortByDomainForHosts(urlLocationLower)
    let suggestionsList = Immutable.List()
    if (getSetting(settings.TOPSITE_SUGGESTIONS)) {
      const mapListToElements = getMapListToElements(urlLocationLower)
      suggestionsList = mapListToElements({
        data: topSites,
        maxResults: config.urlBarSuggestions.maxTopSites,
        type: suggestionTypes.TOP_SITE,
        sortHandler
      })
    }
    resolve(suggestionsList)
  })
}

const generateNewSuggestionsList = debounce((state, windowId, tabId, urlLocation) => {
  if (!urlLocation) {
    return
  }
  const urlLocationLower = urlLocation.toLowerCase()
  Promise.all([
    getHistorySuggestions(state, urlLocationLower),
    getAboutSuggestions(state, urlLocationLower),
    getOpenedTabSuggestions(state, windowId, urlLocationLower),
    getSearchSuggestions(state, tabId, urlLocationLower),
    getAlexaSuggestions(state, urlLocationLower)
  ]).then(([...suggestionsLists]) => {
    const appActions = require('../../../js/actions/appActions')
    // Flatten only 1 level deep for perf only, nested will be objects within arrrays
    appActions.urlBarSuggestionsChanged(windowId, makeImmutable(suggestionsLists).flatten(1))
  })
}, 5)

const generateNewSearchXHRResults = debounce((state, windowId, tabId, input) => {
  const frame = getFrameByTabId(state, tabId)
  if (!frame) {
    // Frame info may not be available yet in app store
    return
  }
  const frameSearchDetail = frame.getIn(['navbar', 'urlbar', 'searchDetail'])
  const searchDetail = state.get('searchDetail')
  if (!searchDetail && !frameSearchDetail) {
    return
  }
  const autocompleteURL = frameSearchDetail
    ? frameSearchDetail.get('autocomplete')
    : searchDetail.get('autocompleteURL')

  const shouldDoSearchSuggestions = getSetting(settings.OFFER_SEARCH_SUGGESTIONS) &&
    autocompleteURL &&
    !isUrl(input) &&
    input.length !== 0

  if (shouldDoSearchSuggestions) {
    if (searchDetail) {
      const replaceRE = new RegExp('^' + searchDetail.get('shortcut') + ' ', 'g')
      input = input.replace(replaceRE, '')
    }
    fetchSearchSuggestions(windowId, tabId, autocompleteURL, input)
  } else {
    const appActions = require('../../../js/actions/appActions')
    appActions.searchSuggestionResultsAvailable(tabId, undefined, Immutable.List())
  }
}, 10)

const filterSuggestionListByType = (suggestionList) => {
  const bookmarkSuggestions = []
  const historySuggestions = []
  const aboutPagesSuggestions = []
  const tabSuggestions = []
  const searchSuggestions = []
  const topSiteSuggestions = []

  if (suggestionList) {
    suggestionList.forEach(item => {
      switch (item.get('type')) {
        case suggestionTypes.BOOKMARK:
          bookmarkSuggestions.push(item)
          break

        case suggestionTypes.HISTORY:
          historySuggestions.push(item)
          break

        case suggestionTypes.ABOUT_PAGES:
          aboutPagesSuggestions.push(item)
          break

        case suggestionTypes.TAB:
          tabSuggestions.push(item)
          break

        case suggestionTypes.SEARCH:
          searchSuggestions.push(item)
          break

        case suggestionTypes.TOP_SITE:
          topSiteSuggestions.push(item)
          break
      }
    })
  }

  return {
    bookmarkSuggestions,
    historySuggestions,
    aboutPagesSuggestions,
    tabSuggestions,
    searchSuggestions,
    topSiteSuggestions
  }
}

const getNormalizedSuggestion = (suggestionList, activeIndex) => {
  let suggestion = ''
  let normalizedSuggestion = ''
  if (suggestionList && suggestionList.size > 0) {
    suggestion = suggestionList.getIn([activeIndex || 0, 'location'], '')
    normalizedSuggestion = normalizeLocation(suggestion)
  }

  return normalizedSuggestion
}

module.exports = {
  getSortForSuggestions,
  getSortForSearchSuggestions,
  getSortByDomainForHosts,
  normalizeLocation,
  shouldNormalizeLocation,
  getHistorySuggestions,
  getAboutSuggestions,
  getOpenedTabSuggestions,
  getSearchSuggestions,
  getAlexaSuggestions,
  generateNewSuggestionsList,
  generateNewSearchXHRResults,
  filterSuggestionListByType,
  getNormalizedSuggestion
}
