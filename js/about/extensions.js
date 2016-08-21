/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

// Note that these are webpack requires, not CommonJS node requiring requires
const React = require('react')
const Immutable = require('immutable')
const ImmutableComponent = require('../components/immutableComponent')
const messages = require('../constants/messages')
const aboutActions = require('./aboutActions')

const ipc = window.chrome.ipc

// Stylesheets
require('../../less/about/itemList.less')
require('../../less/about/extensions.less')
require('../../node_modules/font-awesome/css/font-awesome.css')

const bravifyText = (text) => text.replace(/Google Chrome/g, 'Brave')
class ExtensionItem extends ImmutableComponent {
  constructor () {
    super()
    this.onContextMenu = this.onContextMenu.bind(this)
  }
  onContextMenu (e) {
    aboutActions.contextMenu(this.props.extension.toJS(), 'extensions', e)
  }
  render () {
    console.log('extension: ', this.props.extension.toJS())
    console.log('extension name: ', this.props.extension.get('name'))
    return <div role='listitem'
      className='listItem'
      onContextMenu={this.onContextMenu}
      data-context-menu-disable>
      <h3 className='extensionTitle'>{bravifyText(this.props.extension.get('name'))}</h3>
      <span className='extensionVersion'>{this.props.extension.get('version')}</span>
      <div className='extensionDescription'>{bravifyText(this.props.extension.get('description'))}</div>
      <div className='extensionPath'><span data-l10n-id='extensionPathLabel' /> <span>{this.props.extension.get('path')}</span></div>
      <div className='extensionID'><span data-l10n-id='extensionIdLabel' /> <span>{this.props.extension.get('id')}</span></div>
    </div>
  }
}

class ExtensionList extends ImmutableComponent {
  render () {
    return <list className='extensionDetailsList'>
    {
      this.props.extensions.map((entry) =>
        <ExtensionItem extension={entry} />)
    }
    </list>
  }
}

class AboutExtensions extends React.Component {
  constructor () {
    super()
    this.state = {
      extensions: Immutable.List()
    }
    ipc.on(messages.EXTENSIONS_UPDATED, (e, detail) => {
      console.log('on extensions: ', detail, Immutable.fromJS(detail && detail.extensions))
      this.setState({
        extensions:
          Immutable.fromJS(detail &&
              detail.extensions &&
              detail.extensions.filter(extension => extension.id !== 'mnojpmjdmbbfmejpflffifhffcmidifd') || [])
      })
    })
  }
  onChangeSelectedEntry (id) {
    this.setState({
      selectedEntry: id,
      search: ''
    })
  }
  onChangeSearch (evt) {
    this.setState({
      search: evt.target.value
    })
  }
  onClearSearchText (evt) {
    this.setState({
      search: ''
    })
  }
  render () {
    return <div className='extensionDetailsPage'>
      <h2 data-l10n-id='extensions' />

      <div className='extensionDetailsPageContent'>
        <ExtensionList extensions={this.state.extensions} />
      </div>
    </div>
  }
}

module.exports = <AboutExtensions />
