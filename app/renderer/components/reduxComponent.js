const ipc = require('electron').ipcRenderer
const appStore = require('../../../js/stores/appStoreRenderer')
const ImmutableComponent = require('./immutableComponent')
const React = require('react')
const windowStore = require('../../../js/stores/windowStore')
const {isList, isSameHashCode} = require('../../common/state/immutableUtil')
const messages = require('../../../js/constants/messages')

const mergePropsImpl = (stateProps, ownProps) => {
  return Object.assign({}, stateProps, ownProps)
}

const buildPropsImpl = (props, componentType, mergeStateToProps) => {
  const fn = mergeStateToProps || mergePropsImpl
  const state = appStore.state.set('currentWindow', windowStore.state)
  return fn(state, props)
}

const checkParam = function (old, next, prop) {
  return isList(next[prop])
    ? !isSameHashCode(next[prop], old[prop])
    : next[prop] !== old[prop]
}

const didPropsChange = function (oldProps, newProps) {
  let checked = {}
  const oldKeys = Object.keys(oldProps)
  for (let prop of oldKeys) {
    if (checkParam(oldProps, newProps, prop)) {
      return true
    } else {
      checked[prop] = true
    }
  }
  const newKeys = Object.keys(newProps)
  for (let prop of newKeys) {
    if (!checked[prop] && checkParam(oldProps, newProps, prop)) {
      return true
    }
  }
  return false
}

let perfRunningInterval = null
let mergePropsWasteMs = 0
ipc.on(messages.DEBUG_REACT_PROFILE, (e, args) => {
  if (!perfRunningInterval) {
    let totalMergePropsWaste = 0

    const logMergePropsWaste = function () {
      const timeWasted = mergePropsWasteMs
      if (timeWasted) {
        mergePropsWasteMs = 0
        totalMergePropsWaste += timeWasted
        console.log(`wasted ${timeWasted}ms in the last 1 second performing mergeProps that did not change, now wasted a total of ${totalMergePropsWaste}ms`)
      }
    }
    perfRunningInterval = setInterval(logMergePropsWaste, 1000)
  } else {
    window.clearInterval(perfRunningInterval)
    perfRunningInterval = null
    mergePropsWasteMs = null
    // TODO: show count of component mergeProps state re-evaluations,
    // in order to track how many components are subscribing to state,
    // as a metric to strive to reduce, for performance
  }
})

class ReduxComponent extends ImmutableComponent {
  constructor (componentType, mergeStateToProps, props) {
    super(props)
    this.componentType = componentType
    this.mergeStateToProps = mergeStateToProps
    this.state = this.buildProps(this.props)
    this.checkForUpdates = this.checkForUpdates.bind(this)
    this.dontCheck = true
  }

  checkForUpdates () {
    if (!this.dontCheck) {
      const t0 = perfRunningInterval && window.performance.now()
      const newState = this.buildProps(this.props)
      const t1 = perfRunningInterval && window.performance.now()
      if (didPropsChange(this.state, newState)) {
        this.setState(newState)
      } else if (perfRunningInterval) {
        // log, if requested
        const timeTaken = t1 - t0
        mergePropsWasteMs += timeTaken
      }
    }
  }

  componentDidMount () {
    this.dontCheck = false
    appStore.addChangeListener(this.checkForUpdates)
    windowStore.addChangeListener(this.checkForUpdates)
  }

  componentWillUnmount () {
    this.dontCheck = true
    appStore.removeChangeListener(this.checkForUpdates)
    windowStore.removeChangeListener(this.checkForUpdates)
  }

  componentWillReceiveProps (nextProps) {
    if (didPropsChange(this.props, nextProps)) {
      this.setState(this.buildProps(nextProps))
    }
  }

  shouldComponentUpdate (nextProps, nextState) {
    // we only update the state when it actually changes so this can be a simple equality check
    return this.state !== nextState
  }

  mergeProps (stateProps, ownProps) {
    return mergePropsImpl(stateProps, ownProps)
  }

  buildProps (props = this.props) {
    return buildPropsImpl(props, this.componentType, this.mergeStateToProps)
  }

  render () {
    return React.createElement(this.componentType, this.state)
  }
}

module.exports.connect = (componentType, mergeStateToProps = componentType.prototype.mergeProps) => {
  return ReduxComponent.bind(null, componentType, mergeStateToProps)
}
