import { writable} from 'svelte/store';
import { networksStore } from './stores/networks.js';
import { accountStore } from './stores/account.js';
import { sendNotificationToInPageScript } from './utils.js';

let lastCurrentAccount = null;

//This is called everytime when accountStore is updated
accountStore.subscribe(async (current) => {
  if (current.currentAccount && current.currentAccount.address != lastCurrentAccount) {
    sendNotificationToInPageScript('pertinax-wallet-notification', {"method": "accountChanged", "params": current.currentAccount.address});
    lastCurrentAccount = current.currentAccount.address;
  }
});

let lastCurrentEndpoint = null;

//This is called everytime when networksStore is updated
networksStore.subscribe(async (current) => {
  if (current.currentNetwork && current.currentNetwork.server != lastCurrentEndpoint) {
    sendNotificationToInPageScript('pertinax-wallet-notification', {"method": "endpointChanged", "params": current.currentNetwork.server});
    lastCurrentEndpoint = current.currentNetwork.server;
  }
});

export { settingsStore, currentPage, currentThemeName, currentLang, currentAutologout, currentRetrievingTransactionsPeriod, currentRetrievingTransactionsLastTime, needsBackup, currentEnabledPinPad } from './stores/settings.js';
export { networksStore, currentNetwork } from './stores/networks.js';
export { accountStore, currentAccount } from './stores/account.js';

//MISC Stores
export const SAFE_MULTISIG_WALLET_CODE_HASH = "80d6c47c4a25543c9b397b71716f3fae1e2c5d247174c52e2c19bd896442b105";
export const CURRENT_KS_PASSWORD = writable("G1^8%3*c3Ra9c35");
export const CURRENT_KS_VERSION = writable("1.0");
export const steps = writable({current:0, stepList:[]});
export const lastActionTimestamp = writable();

export function copyItem(item) {
  return JSON.parse(JSON.stringify(item));
}
