const geolocationChanged = (position) => {
  chrome.ipc.send('dispatch-action', JSON.stringify({
    actionType: 'app-geolocation-changed',
    lat: position.coords.latitude,
    lon: position.coords.longitude
  }))
}
let watchId = null

const start = () => {
  if (!watchId) {
    navigator.geolocation.getCurrentPosition(geolocationChanged);
    watchId = navigator.geolocation.watchPosition(geolocationChanged);
  }
}

const stop = () => {
  if (watchId) {
     navigator.geolocation.clearWatch(watchId);
  }
}

// TODO(bridiver) - implement permissions
// chrome.permissions.contains({
//   permissions: ['geolocation'],
//   origins: ['brave://browser']
// }, function(result) {
//   if (result) {
    start()
//   } else {
//     stop()
//   }
// })

// chrome.permissions.onAdded.addListener((permission) => {
//   permissions.some((permission) => {
//     if (permission.permissions.includes('geolocation') && permission.origins.includes('brave://browser')) {
//       start()
//       return true
//     }
//   })
// })

// chrome.permissions.onRemoved.addListener((permission) => {
//   permissions.some((permission) => {
//     if (permission.permissions.includes('geolocation') && permission.origins.includes('brave://browser')) {
//       stop()
//       return true
//     }
//   })
// })
