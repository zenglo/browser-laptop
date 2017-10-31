/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

// Constants
const settings = require('../../../js/constants/settings')

// State helpers
const partitionState = require('../../common/state/tabContentState/partitionState')
const privateState = require('../../common/state/tabContentState/privateState')
const closeState = require('../../common/state/tabContentState/closeState')
const historyState = require('../../common/state/historyState')
const frameStateUtil = require('../../../js/state/frameStateUtil')

// Utils
const {isEntryIntersected} = require('../../../app/renderer/lib/observerUtil')
const {getTextColorForBackground} = require('../../../js/lib/color')

// Settings
const {getSetting} = require('../../../js/settings')

// Styles
const {intersection} = require('../../renderer/components/styles/global')
const {theme} = require('../../renderer/components/styles/theme')

module.exports.getThemeColor = (state, windowState, frameKey) => {
  const frame = frameStateUtil.getFrameByKey(windowState, frameKey)

  if (frame == null) {
    return false
  }
  const location = frame.get('location')
  const themeColor = historyState.getThemeColor(state, location) ||
    historyState.getComputedThemeColor(state, location)
  return getSetting(settings.PAINT_TABS) && themeColor
}

module.exports.getTabIconColor = (state, windowState, frameKey) => {
  const frame = frameStateUtil.getFrameByKey(windowState, frameKey)

  if (frame == null) {
    return ''
  }

  const isPrivate = frame.get('isPrivate')
  const isActive = frameStateUtil.isFrameKeyActive(windowState, frameKey)
  const hoverState = frameStateUtil.getTabHoverState(windowState, frameKey)
  const themeColor = module.exports.getThemeColor(state, windowState, frameKey)
  const activeNonPrivateTab = !isPrivate && isActive
  const isPrivateTab = isPrivate && (isActive || hoverState)
  const defaultColor = isPrivateTab ? 'white' : 'black'
  const isPaintTabs = getSetting(settings.PAINT_TABS)

  return activeNonPrivateTab && isPaintTabs && !!themeColor
    ? getTextColorForBackground(themeColor)
    : defaultColor
}

module.exports.checkIfTextColor = (state, windowState, frameKey, color) => {
  const frame = frameStateUtil.getFrameByKey(windowState, frameKey)

  if (frame == null) {
    return false
  }

  return module.exports.getTabIconColor(state, windowState, frameKey) === color
}

module.exports.showTabEndIcon = (windowState, frameKey) => {
  const frame = frameStateUtil.getFrameByKey(windowState, frameKey)

  if (frame == null) {
    return false
  }

  return (
    !closeState.hasFixedCloseIcon(windowState, frameKey) &&
    !closeState.hasRelativeCloseIcon(windowState, frameKey) &&
    !isEntryIntersected(windowState, 'tabs', intersection.at40)
  )
}

module.exports.addExtraGutterToTitle = (windowState, frameKey) => {
  const frame = frameStateUtil.getFrameByKey(windowState, frameKey)

  if (frame == null) {
    return false
  }

  return frameStateUtil.frameLocationMatch(frame, 'about:newtab')
}

module.exports.centralizeTabIcons = (windowState, frameKey, isPinned) => {
  const frame = frameStateUtil.getFrameByKey(windowState, frameKey)

  if (frame == null) {
    return false
  }

  return isPinned || isEntryIntersected(windowState, 'tabs', intersection.at40)
}

module.exports.getTabEndIconBackgroundColor = (state, windowState, frameKey) => {
  const frame = frameStateUtil.getFrameByKey(windowState, frameKey)

  if (frame == null) {
    return false
  }

  const themeColor = module.exports.getThemeColor(state, windowState, frameKey)
  const isPrivate = privateState.isPrivateTab(windowState, frameKey)
  const isPartition = partitionState.isPartitionTab(windowState, frameKey)
  const isHover = frameStateUtil.getTabHoverState(windowState, frameKey)
  const isActive = frameStateUtil.isFrameKeyActive(windowState, frameKey)
  const hasCloseIcon = closeState.showCloseTabIcon(windowState, frameKey)
  const isIntersecting = isEntryIntersected(windowState, 'tabs', intersection.at40)

  let backgroundColor = theme.tab.background

  if (isActive && themeColor) {
    backgroundColor = themeColor
  }
  if (isActive && !themeColor) {
    backgroundColor = theme.tab.active.background
  }
  if (isIntersecting) {
    backgroundColor = 'transparent'
  }
  if (!isActive && isPrivate) {
    backgroundColor = theme.tab.private.background
  }
  if ((isActive || isHover) && isPrivate) {
    backgroundColor = theme.tab.active.private.background
  }

  return isPartition || isPrivate || hasCloseIcon
    ? `linear-gradient(to left, ${backgroundColor} 10px, transparent 40px)`
    : `linear-gradient(to left, ${backgroundColor} 0, transparent 12px)`
}
