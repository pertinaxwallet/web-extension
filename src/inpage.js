import Provider from "./common/provider.js";

const provider = new Provider();
window.addEventListener("pertinax-wallet", (event) => {
  const { type, payload } = event.detail;
  if (type == "notification") {
    const { method, params } = payload;
    if (method === 'connect') {
      provider.emit('connect', params);
    } else if (method === 'disconnect') {
      provider.emit('disconnect', params);
    } else if (method === 'accountChanged') {
      provider.emit('accountChanged', params);
    } else if (method === 'unlockStateChanged') {
      provider.emit('unlockStateChanged', params);
    } else if (method === 'endpointChanged') {
      provider.emit('endpointChanged', params);
    } else if (method == "message") {
      provider.emit('message', params);
    }
  }
});

window.everscale = provider;
