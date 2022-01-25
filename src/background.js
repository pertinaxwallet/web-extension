import { eventsHandler } from './background/eventsHandler.js';
import { controller } from './background/controller.js';

const devMode = __DEV_MODE__;

let INSTALL_URL = {
  "en": "https://pertinaxwallet.com/welcome_page_for_extension",
  "ru": "https://pertinaxwallet.com/ru/welcome_page_for_extension",
};

let UNINSTALL_URL = {
  "en": "https://pertinaxwallet.com/regret_page_for_extension",
  "ru": "https://pertinaxwallet.com/ru/regret_page_for_extension",
};

if (devMode) {
  browser.browserAction.setBadgeText({'text': 'Dev'}); // to mark that it is not from the webstore
}

browser.notifications.onClicked.addListener((id) => {
  browser.tabs.create({ url: id });
});

eventsHandler(Object.freeze(controller()));

if (window.localStorage && !window.localStorage.getItem('pertinax_wallet_user_has_seen_intro')) {
  window.localStorage.setItem('pertinax_wallet_user_has_seen_intro', true);
  if (navigator.language && INSTALL_URL[navigator.language]) {
    browser.tabs.create({url: INSTALL_URL[navigator.language]});
  } else {
    browser.tabs.create({url: INSTALL_URL["en"]});
  }
}

if (navigator.language && UNINSTALL_URL[navigator.language]) {
  browser.runtime.setUninstallURL(UNINSTALL_URL[navigator.language]);
} else {
  browser.runtime.setUninstallURL(UNINSTALL_URL["en"]);
}
