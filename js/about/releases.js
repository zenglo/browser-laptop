/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

const React = require('react')
// const Immutable = require('immutable')
// const messages = require('../constants/messages')
// const SortableTable = require('../components/sortableTable')
// const ClipboardButton = require('../../app/renderer/components/clipboardButton')
// const aboutActions = require('./aboutActions')

// const ipc = window.chrome.ipcRenderer

require('../../less/about/history.less')
// require('../../less/about/brave.less')
require('../../node_modules/font-awesome/css/font-awesome.css')

class AboutReleases extends React.Component {
  // constructor () {
  //   super()
  //   this.state = { versionInformation: Immutable.fromJS([]) }
  //   ipc.on(messages.VERSION_INFORMATION_UPDATED, (e, versionInformation) => {
  //     if (this.state.versionInformation.size === 0) {
  //       this.setState({versionInformation: Immutable.fromJS(versionInformation)})
  //     }
  //   })
  //   this.onCopy = this.onCopy.bind(this)
  // }

  // onCopy () {
  //   aboutActions.setClipboard(tranformVersionInfoToString(this.state.versionInformation))
  // }

  constructor () {
    super()
    this.state = { notes: {} }
  }

  componentWillMount () {
    return window.fetch('https://api.github.com/repos/brave/browser-laptop/releases/latest')
      .then(result => {
        if (result.ok) {
          result.json().then(data => {
            console.log('result: ' + JSON.stringify(data))
            this.setState({ notes: data })
          })
        } else {
          console.log('maybe -- hey your connection is not ok sorry')
        }
      })
      // just for debugging
      .catch(err => console.log('houston we have a problem', err))
  }

  render () {
    // don't render until resource is fetch
    if (this.state.notes === {}) {
      return null
    }
    return (
      <div>
        <h1>Release Notes:</h1>
        <h2>{JSON.stringify(this.state.notes)}</h2>
        {
          // Object
          //   .keys(this.state.notes)
          //   .map(note => <div> <h1>{this.state.notes[note]}</h1> </div>)
        }
      </div>
    )
  }
}

module.exports = <AboutReleases />
