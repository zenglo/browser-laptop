/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict'

const aboutNewTabState = require('../../common/state/aboutNewTabState')
const appConstants = require('../../../js/constants/appConstants')
const {calculateTopSites} = require('../api/topSites')

const topSitesReducer = (state, action) => {
  switch (action.actionType) {
    case appConstants.APP_TOP_SITE_DATA_AVAILABLE:
      state = aboutNewTabState.setSites(state, action.topSites)
      break
    case appConstants.APP_TAB_FAV_ICON_UPDATED:
    case appConstants.APP_TAB_THEME_COLOR_UPDATED:
    case appConstants.APP_TAB_COMPUTED_THEME_COLOR_UPDATED:
      calculateTopSites(false)
      break
  }
  return state
}

module.exports = topSitesReducer
