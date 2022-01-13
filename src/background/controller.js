import { accounts } from './accounts.js';
import { networks } from './networks.js';
import { sdk } from './sdk.js';
import { broadcastMessage, sendNotificationToInPageScript, openRequestPopup, closeRequestPopup } from '../common/utils.js';
import { settingsStore, accountStore, currentAccount, networksStore, currentNetwork, currentEnabledPinPad } from "../common/stores.js";

export const controller = () => {
  const accountsController = Object.freeze(accounts());
  const networksController = Object.freeze(networks());
  const sdkController = Object.freeze(sdk());

  const createPassword = async (string) => {
    let created = accountsController.createPassword(string);
    if (created) {
      broadcastMessage('walletIsLocked', {"locked": false, "enabledPinPad": false});
    }
    return created;
  };

  const addNewNetwork = async (network) => {
    if (await networksController.addNewNetwork(network)) {
      broadcastMessage('updateNetworks', true);
      return {"success": true};
    }
    return {"success": false, "error": "Network is existed"};
  };

  const removeNetwork = async (server) => {
    await networksController.removeNetwork(server);
    broadcastMessage('updateNetworks', true);
    return true;
  };

  const unlock = async (data) => {
    const unlocked = await accountsController.unlock(data);

    // get setting about enabled/disabled pin pad
    const enabledPinPad = await new Promise((resolve) => {
      currentEnabledPinPad.subscribe((value) => {
        resolve(value);
      });
    });

    broadcastMessage('walletIsLocked', {"locked": !unlocked, "enabledPinPad": enabledPinPad});

    const account = await new Promise((resolve) => {
      currentAccount.subscribe((value) => {
        resolve(value.address);
      });
    });

    sendNotificationToInPageScript('pertinax-wallet-notification', {"method": "unlockStateChanged", "params": {"account": account, "isLocked": !unlocked}});
    return unlocked;
  };

  const changeAccount = async (data) => {
    accountStore.changeAccount(data);
  };

  const changeNetwork = async (data) => {
    networksStore.changeNetwork(data);
  };

  const lock = async () => {
    accountsController.lock();

    // get setting about enabled/disabled pin pad
    const enabledPinPad = await new Promise((resolve) => {
      currentEnabledPinPad.subscribe((value) => {
        resolve(value);
      });
    });
    broadcastMessage('walletIsLocked', {"locked": true, "enabledPinPad": enabledPinPad});

    sendNotificationToInPageScript('pertinax-wallet-notification', {"method": "unlockStateChanged", "params": {"account": null, "isLocked": true}});
    return true;
  };

  /*
  * Settings is array with key -> functionName to set value. This function must be existed in settingsStore
  */
  const setSettings = async (settings) => {
    for(let i in settings) {
      if (settingsStore[i]) {
        settingsStore[i](settings[i]);
      }
    }
  };

  const deleteAccount = (data) => {
    const { account, string } = data;
    if (accountsController.checkPassword(string)){
      if (accountsController.deleteOne(account)) {
        return true;
      }
    }
    return false;
  };

  const getPermissions = async (data, origin) => {
    const account = await new Promise((resolve) => {
      currentAccount.subscribe((value) => {
        resolve(value.address);
      });
    });
    const permissions = await accountsController.getPermissions(account, origin);
    return {"id": data.id, "data": { code: 4000, data: permissions}};
  }

  const checkPermission = async (data, origin) => {
    const account = await new Promise((resolve) => {
      currentAccount.subscribe((value) => {
        resolve(value.address);
      });
    });
    return await accountsController.checkPermission(account, origin, data.method);
  }

  const requestPermissions = async (data, origin) => {
    data.origin = origin;
    openRequestPopup('ModalRequestPermission', data);
    return new Promise((resolve, reject) => {
      const listener = (message) => {
        if (message.type === "popupMessageResponse" && message.id == data.id) {
          // let's remove this listener in 1 seconds after a response
          setTimeout(browser.runtime.onMessage.removeListener(listener), 1000);
          closeRequestPopup();
          resolve({"id": data.id, "data": message.data});
        }
      };
      browser.runtime.onMessage.addListener(listener);
    });
  };

  const sendTransaction = async (data, origin) => {
    openRequestPopup('ModalSendingTransaction', data);
    return new Promise((resolve, reject) => {
      const listener = (message) => {
        if (message.type === "popupMessageResponse" && message.id == data.id) {
          // let's remove this listener in 1 seconds after a response
          setTimeout(browser.runtime.onMessage.removeListener(listener), 1000);
          closeRequestPopup();
          resolve({"id": data.id, "data": message.data});
        }
      };
      browser.runtime.onMessage.addListener(listener);
    });
  };

  const getProviderState = async (data, origin) => {
    const walletIsLockedObject = await accountsController.walletIsLocked();
    const providerState = { isLocked: walletIsLockedObject.locked };
    if (providerState.isLocked) {
      providerState.account = null;
      providerState.endpoint = null;
    } else {
      providerState.account = await new Promise((resolve) => {
        currentAccount.subscribe((value) => {
          resolve(value.address);
        });
      });
      providerState.endpoint = await new Promise((resolve) => {
        currentNetwork.subscribe((value) => {
          resolve(value.server);
        });
      });
    }
    return {"id": data.id, "data": { code: 4000, data: providerState}};
  };

  const getSdkVersion = async (data, origin) => {
    const version = await sdkController.getSdkVersion();
    return {"id": data.id, "data": { code: 4000, data: version}};
  };

  const getCurrentAccount = async (data, origin) => {
    const walletIsLockedObject = await accountsController.walletIsLocked();
    if (walletIsLockedObject.locked) {
      data.origin = origin;
      openRequestPopup('ModalGetAccount', data);
      return new Promise((resolve, reject) => {
        const listener = (message) => {
          if (message.type === "popupMessageResponse" && message.id == data.id) {
            // let's remove this listener in 1 seconds after a response
            setTimeout(browser.runtime.onMessage.removeListener(listener), 1000);
            closeRequestPopup();
            currentAccount.subscribe(async (value) => {
              const address = value.address;
              const publicKey = await accountsController.getPublicKeyForAccount(value.address);
              resolve({"id": data.id, "data": { code: 4000, data: {address, publicKey}}});
            });
          }
        };
        browser.runtime.onMessage.addListener(listener);
      });
    } else {
      const account = await new Promise((resolve) => {
        currentAccount.subscribe(async (value) => {
          const address = value.address;
          const publicKey = await accountsController.getPublicKeyForAccount(value.address);
          resolve({address, publicKey});
        });
      });
      return {"id": data.id, "data": { code: 4000, data: account}};
    }
  };

  const getCurrentEndpoint = async (data, origin) => {
    const walletIsLockedObject = await accountsController.walletIsLocked();
    if (walletIsLockedObject.locked) {
      data.origin = origin;
      openRequestPopup('ModalGetEndpoint', data);
      return new Promise((resolve, reject) => {
        const listener = (message) => {
          if (message.type === "popupMessageResponse" && message.id == data.id) {
            // let's remove this listener in 1 seconds after a response
            setTimeout(browser.runtime.onMessage.removeListener(listener), 1000);
            closeRequestPopup();
            currentNetwork.subscribe((value) => {
              resolve({"id": data.id, "data": { code: 4000, data: value.server}});
            });
          }
        };
        browser.runtime.onMessage.addListener(listener);
      });
    } else {
      const endpoint = await new Promise((resolve) => {
        currentNetwork.subscribe((value) => {
          resolve(value.server);
        });
      });
      return {"id": data.id, "data": { code: 4000, data: endpoint}};
    }
  };

  const signMessage = async (data, origin) => {
    data.origin = origin;
    openRequestPopup('ModalSignMessage', data);
    return new Promise((resolve, reject) => {
      const listener = (message) => {
        if (message.type === "popupMessageResponse" && message.id == data.id) {
          // let's remove this listener in 1 seconds after a response
          setTimeout(browser.runtime.onMessage.removeListener(listener), 1000);
          closeRequestPopup();
          resolve({"id": data.id, "data": message.data});
        }
      };
      browser.runtime.onMessage.addListener(listener);
    });
  };

  const encryptMessage = async (data, origin) => {
    data.origin = origin;
    openRequestPopup('ModalEncryptMessage', data);
    return new Promise((resolve, reject) => {
      const listener = (message) => {
        if (message.type === "popupMessageResponse" && message.id == data.id) {
          // let's remove this listener in 1 seconds after a response
          setTimeout(browser.runtime.onMessage.removeListener(listener), 1000);
          closeRequestPopup();
          resolve({"id": data.id, "data": message.data});
        }
      };
      browser.runtime.onMessage.addListener(listener);
    });
  };

  const getMessageSignature = async (data, origin) => {
    data.origin = origin;
    openRequestPopup('ModalGetSignature', data);
    return new Promise((resolve, reject) => {
      const listener = (message) => {
        if (message.type === "popupMessageResponse" && message.id == data.id) {
          // let's remove this listener in 1 seconds after a response
          setTimeout(browser.runtime.onMessage.removeListener(listener), 1000);
          closeRequestPopup();
          resolve({"id": data.id, "data": message.data});
        }
      };
      browser.runtime.onMessage.addListener(listener);
    });
  };

  const decryptMessage = async (data, origin) => {
    data.origin = origin;
    openRequestPopup('ModalDecryptMessage', data);
    return new Promise((resolve, reject) => {
      const listener = (message) => {
        if (message.type === "popupMessageResponse" && message.id == data.id) {
          // let's remove this listener in 1 seconds after a response
          setTimeout(browser.runtime.onMessage.removeListener(listener), 1000);
          closeRequestPopup();
          resolve({"id": data.id, "data": message.data});
        }
      };
      browser.runtime.onMessage.addListener(listener);
    });
  };

  const cryptoGenerateRandomBytes = async (data, origin) => {
    const bytes = await sdkController.cryptoGenerateRandomBytes(data.params);
    return {"id": data.id, "data": { code: 4000, data: bytes }};
  };

  const getNaclBoxPublicKey = async (data, origin) => {

    const walletIsLockedObject = await accountsController.walletIsLocked();
    if (walletIsLockedObject.locked) {
      data.origin = origin;
      openRequestPopup('ModalGetNaclBoxPublicKey', data);
      return new Promise((resolve, reject) => {
        const listener = (message) => {
          if (message.type === "popupMessageResponse" && message.id == data.id) {
            // let's remove this listener in 1 seconds after a response
            setTimeout(browser.runtime.onMessage.removeListener(listener), 1000);
            closeRequestPopup();
            currentAccount.subscribe(async (value) => {
              const publicKey = await accountsController.getNaclBoxPublicKey(value.address);
              resolve({"id": data.id, "data": { code: 4000, data: publicKey}});
            });
          }
        };
        browser.runtime.onMessage.addListener(listener);
      });
    } else {
      const account = await new Promise((resolve) => {
        currentAccount.subscribe(async (value) => {
          resolve(value.address);
        });
      });
      const publicKey = await accountsController.getNaclBoxPublicKey(account);
      return {"id": data.id, "data": { code: 4000, data: publicKey}};
    }
  };

  const saveGrantedPermissions = async (data) => {
    const { origin, grantedPermissions } = data;
    const account = await new Promise((resolve) => {
      currentAccount.subscribe((value) => {
        resolve(value.address);
      });
    });
    return await accountsController.saveGrantedPermissions(account, origin, grantedPermissions) ? grantedPermissions: [];
  }

  const getSignForData = async (data) => {
    const account = await new Promise((resolve) => {
      currentAccount.subscribe((value) => {
        resolve(value.address);
      });
    });
    return await accountsController.getSignForData(account, data.data);
  };

  const doEncryptionForMessage = async (data) => {
    const account = await new Promise((resolve) => {
      currentAccount.subscribe((value) => {
        resolve(value.address);
      });
    });
    return await accountsController.doEncryptionForMessage(account, data);
  };

  const doDecryptionForMessage = async (data) => {
    const account = await new Promise((resolve) => {
      currentAccount.subscribe((value) => {
        resolve(value.address);
      });
    });
    return await accountsController.doDecryptionForMessage(account, data);
  };

  const getAccountSignature = async (data) => {
    const account = await new Promise((resolve) => {
      currentAccount.subscribe((value) => {
        resolve(value.address);
      });
    });
    return await accountsController.getAccountSignature(account, data);
  };

  const getSignature = async (data, origin) => {
    const account = await new Promise((resolve) => {
      currentAccount.subscribe(async (value) => {
        resolve(value.address);
      });
    });
    return await accountsController.getSignature(account, data.data);
  };

  const runSdkMethod = async (moduleName, methodName, methodParams) => {
    const endpoint = await new Promise((resolve) => {
      currentNetwork.subscribe((value) => {
        resolve(value.server);
      });
    });
    return await sdkController.runSdkMethod(endpoint, moduleName, methodName, methodParams);
  };

  const getSubscriptionId = async (data) => {
    const endpoint = await new Promise((resolve) => {
      currentNetwork.subscribe((value) => {
        resolve(value.server);
      });
    });

    let subscriptionId = 0;
    const callback = (params, responseType) => {
      sendNotificationToInPageScript('pertinax-wallet-notification', { method: "message",
                                                                   params: {
                                                                     type: "ever_subscription",
                                                                     data: {subscriptionId, params, responseType}
                                                                   }
                                                                 });
    };

    subscriptionId = await sdkController.getSubscriptionId(endpoint, data.params, callback);
    return {"id": data.id, "data": { code: 4000, data: subscriptionId}};
  };

  const removeSubscriptionId = async (data) => {
    const endpoint = await new Promise((resolve) => {
      currentNetwork.subscribe((value) => {
        resolve(value.server);
      });
    });
    const result = await sdkController.removeSubscriptionId(endpoint, data.params);
    return {"id": data.id, "data": { code: 4000, data: result}};
  };

  return {
    "accounts": accountsController,
    "networks": networksController,
    "sdk": sdkController,
    runSdkMethod,
    getProviderState,
    getSdkVersion,
    saveGrantedPermissions,
    checkPermission,
    getPermissions,
    requestPermissions,
    changeAccount,
    getCurrentAccount,
    getCurrentEndpoint,
    sendTransaction,
    signMessage,
    getSignForData,
    getMessageSignature,
    encryptMessage,
    doEncryptionForMessage,
    getNaclBoxPublicKey,
    decryptMessage,
    doDecryptionForMessage,
    getAccountSignature,
    cryptoGenerateRandomBytes,
    createPassword,
    deleteAccount,
    setSettings,
    unlock,
    lock,
    getSignature,
    addNewNetwork,
    changeNetwork,
    removeNetwork,
    getSubscriptionId,
    removeSubscriptionId
  };
};
