/* global describe, it, beforeEach */

const Brave = require('../lib/brave')
const {urlInput, bookmarksToolbar, navigator, navigatorNotBookmarked, doneButton} = require('../lib/selectors')
const settings = require('../../js/constants/settings')
const siteTags = require('../../js/constants/siteTags')
const assert = require('assert')

function * setup (client) {
  yield client
    .waitForUrl(Brave.newTabUrl)
    .waitForBrowserWindow()
    .waitForEnabled(urlInput)
}

const findBookmarkFolder = (folderName, val) => {
  const bookmarksMenu = val.value.menu.template.find((item) => {
    return item.label === 'Bookmarks'
  })
  if (bookmarksMenu && bookmarksMenu.submenu) {
    const bookmarkFolder = bookmarksMenu.submenu.find((item) => {
      return item.label === folderName
    })
    if (bookmarkFolder) return true
  }
  return false
}

describe.only('bookmarksToolbar', function () {
  describe('configuration settings', function () {
    Brave.beforeAll(this)

    it('shows the bookmarks toolbar if the setting is enabled', function * () {
      yield this.app.client
        .changeSetting(settings.SHOW_BOOKMARKS_TOOLBAR, true)
        .waitForVisible(bookmarksToolbar)
    })

    it('hides the bookmarks toolbar if the setting is disabled', function * () {
      yield this.app.client
        .changeSetting(settings.SHOW_BOOKMARKS_TOOLBAR, false)
        .waitForElementCount(bookmarksToolbar, 0)
    })
  })

  describe('when clicking a bookmark folder', function () {
    Brave.beforeEach(this)
    beforeEach(function * () {
      yield setup(this.app.client)
    })

    it('shows a context menu', function * () {
      yield this.app.client
        .changeSetting(settings.SHOW_BOOKMARKS_TOOLBAR, true)
        .waitForVisible(bookmarksToolbar)
        .addSite({
          customTitle: 'demo1',
          folderId: Math.random(),
          parentFolderId: 0,
          tags: [siteTags.BOOKMARK_FOLDER]
        }, siteTags.BOOKMARK_FOLDER)
        .waitUntil(function () {
          return this.getAppState().then((val) => {
            return findBookmarkFolder('demo1', val)
          })
        })
        .click('.bookmarkToolbarButton[title=demo1]')
        .waitForVisible('.contextMenuItemText[data-l10n-id=emptyFolderItem]')
    })

    it('automatically opens context menu if you move mouse over a different folder', function * () {
      this.page1Url = Brave.server.url('page1.html')

      const folderId1 = Math.random()
      const folderId2 = Math.random()

      yield this.app.client
        .changeSetting(settings.SHOW_BOOKMARKS_TOOLBAR, true)
        .waitForVisible(bookmarksToolbar)
        .addSite({
          customTitle: 'demo1',
          folderId: folderId1,
          parentFolderId: 0,
          tags: [siteTags.BOOKMARK_FOLDER]
        }, siteTags.BOOKMARK_FOLDER)
        .waitUntil(function () {
          return this.getAppState().then((val) => {
            return findBookmarkFolder('demo1', val)
          })
        })
        .addSite({
          customTitle: 'demo2',
          folderId: folderId2,
          parentFolderId: 0,
          tags: [siteTags.BOOKMARK_FOLDER]
        }, siteTags.BOOKMARK_FOLDER)
        .waitUntil(function () {
          return this.getAppState().then((val) => {
            return findBookmarkFolder('demo2', val)
          })
        })
        .waitForUrl(Brave.newTabUrl)
        .loadUrl(this.page1Url)
        .windowParentByUrl(this.page1Url)
        .waitForSiteEntry(this.page1Url)
        .waitForVisible(navigator)
        .moveToObject(navigator)
        .waitForVisible(navigatorNotBookmarked)
        .click(navigatorNotBookmarked)
        .waitForVisible(doneButton)
        .waitForEnabled(doneButton)
        .selectByValue('#bookmarkParentFolder select', folderId2)
        .click(doneButton)
        .click('.bookmarkToolbarButton[title=demo1]')
        .moveToObject('.bookmarkToolbarButton[title=demo2]')
        .getText('.contextMenuItemText').then((val) => {
          assert(val === 'Page 1')
        })
    })

    it('hides context menu when mousing over regular bookmark', function * () {
      this.page1Url = Brave.server.url('page1.html')
      console.log('-----1')
      yield this.app.client
        .changeSetting(settings.SHOW_BOOKMARKS_TOOLBAR, true)
      console.log('-----2')
      yield this.app.client
        .waitForVisible(bookmarksToolbar)
      console.log('-----3')
      yield this.app.client
        .addSite({
          customTitle: 'demo1',
          folderId: Math.random(),
          parentFolderId: 0,
          tags: [siteTags.BOOKMARK_FOLDER]
        }, siteTags.BOOKMARK_FOLDER)
      console.log('-----4')
      yield this.app.client
        .waitUntil(function () {
          return this.getAppState().then((val) => {
            return findBookmarkFolder('demo1', val)
          })
        })
      console.log('-----5')
      yield this.app.client
        .waitForUrl(Brave.newTabUrl)
      console.log('-----6')
      yield this.app.client
        .loadUrl(this.page1Url)
      console.log('-----7')
      yield this.app.client
        .windowParentByUrl(this.page1Url)
      console.log('-----8')
      yield this.app.client
        .waitForSiteEntry(this.page1Url)
      console.log('-----9')
      yield this.app.client
        .waitForVisible(navigator)
      console.log('-----10')
      yield this.app.client
        .moveToObject(navigator)
      console.log('-----11')
      yield this.app.client
        .waitForVisible(navigatorNotBookmarked)
      console.log('-----12')
      yield this.app.client
        .click(navigatorNotBookmarked)
      console.log('-----13')
      yield this.app.client
        .waitForVisible(doneButton)
      console.log('-----14')
      yield this.app.client
        .waitForEnabled(doneButton)
      console.log('-----15')
      yield this.app.client
        .setValue('#bookmarkName input', 'test1')
      console.log('-----16')
      yield this.app.client
        .click(doneButton)
      console.log('-----17')
      yield this.app.client
        .waitForVisible('.bookmarkToolbarButton[title^=test1]')
      console.log('-----18')
      yield this.app.client
        .click('.bookmarkToolbarButton[title=demo1]')
      console.log('-----19')
      yield this.app.client
        .waitForVisible('.contextMenuItemText[data-l10n-id=emptyFolderItem]')
      console.log('-----20')
      yield this.app.client
        .moveToObject('.bookmarkToolbarButton[title^=test1]')
      console.log('-----21')
      yield this.app.client
        .waitForElementCount('.contextMenuItemText', 0)
      console.log('-----22')
    })
  })

  describe('display favicon on bookmarks toolbar', function () {
    Brave.beforeEach(this)
    beforeEach(function * () {
      yield setup(this.app.client)
    })

    it('display bookmark favicon for url that has it', function * () {
      const pageWithFavicon = Brave.server.url('favicon.html')

      console.log('-----a1')
      yield this.app.client
        .changeSetting(settings.SHOW_BOOKMARKS_TOOLBAR, true)
      console.log('-----a2')
      yield this.app.client
        .changeSetting(settings.SHOW_BOOKMARKS_TOOLBAR_FAVICON, true)
      console.log('-----a3')
      yield this.app.client
        .waitForVisible(bookmarksToolbar)
      console.log('-----a4')
      yield this.app.client
        .waitForUrl(Brave.newTabUrl)
      console.log('-----a5')
      yield this.app.client
        .loadUrl(pageWithFavicon)
      console.log('-----a6')
      yield this.app.client
        .windowParentByUrl(pageWithFavicon)
      console.log('-----a7')
      yield this.app.client
        .waitForSiteEntry(pageWithFavicon, false)
      console.log('-----a8')
      yield this.app.client
        .waitForVisible(navigator)
      console.log('-----a9')
      yield this.app.client
        .moveToObject(navigator)
      console.log('-----a10')
      yield this.app.client
        .waitForVisible(navigatorNotBookmarked)
      console.log('-----a11')
      yield this.app.client
        .click(navigatorNotBookmarked)
      console.log('-----a12')
      yield this.app.client
        .waitForVisible(doneButton)
      console.log('-----a13')
      yield this.app.client
        .waitForEnabled(doneButton)
      console.log('-----a14')
      yield this.app.client
        .click(doneButton)
      console.log('-----a15')
      yield this.app.client.waitUntil(() =>
        this.app.client.getCssProperty('.bookmarkFavicon', 'background-image').then((backgroundImage) =>
          backgroundImage.value === `url("${Brave.server.url('img/test.ico')}")`
      ))
      console.log('-----a16')
    })

    it('fallback to default bookmark icon when url has no favicon', function * () {
      const pageWithoutFavicon = Brave.server.url('page_favicon_not_found.html')

      yield this.app.client
        .changeSetting(settings.SHOW_BOOKMARKS_TOOLBAR, true)
        .changeSetting(settings.SHOW_BOOKMARKS_TOOLBAR_FAVICON, true)
        .waitForVisible(bookmarksToolbar)
        .waitForUrl(Brave.newTabUrl)
        .loadUrl(pageWithoutFavicon)
        .windowParentByUrl(pageWithoutFavicon)
        .waitForSiteEntry(pageWithoutFavicon, false)
        .waitForVisible(navigator)
        .moveToObject(navigator)
        .waitForVisible(navigatorNotBookmarked)
        .click(navigatorNotBookmarked)
        .waitForVisible(doneButton)
        .waitForEnabled(doneButton)
        .click(doneButton)

      yield this.app.client.waitUntil(() =>
        this.app.client.getAttribute('.bookmarkFavicon', 'class').then((className) =>
          className === 'bookmarkFavicon bookmarkFile fa fa-file-o'
      ))
    })
  })
})
