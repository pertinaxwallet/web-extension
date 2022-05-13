// API is available here https://www.npmjs.com/package/idb#api

import { openDB } from 'idb/with-async-ittr.js';

export class Vault {
  masterDb; //private
  db; //private
  async init () {
    this.masterDb = await openDB('master', 1, {
      upgrade(db) {
        const storeMasterKey = db.createObjectStore('keys', {
          // The 'id' property of the object will be the key.
          keyPath: 'id',
        });
      }
    });

    this.db = await openDB('vault', 5, {
      async upgrade(db, oldVersion, newVersion, transaction) {
        if (await checkMigration(db, oldVersion, newVersion, transaction)) {
          return;
        }
        // Create a store of objects
        const storeAccounts = db.createObjectStore('accounts', {
          // The 'id' property of the object will be the key.
          keyPath: 'address',
        });
        /*
        { address: "0:123",
          nickname: "main",
          balance: {"main.everos.dev": 5000000000},
          transactions: {"main.everos.dev": [{...}]},
          permissions: {"domain.com": ['ever_address', 'ever_endpoint']},
          updatedDate: 123123,
          createdDate: 123123,
          contactList: {"main.everos.dev": ["0:11", "0:12"]},
          contractList: {"main.everos.dev": ["0:21", "0:22"]},
          tokenList: {"main.everos.dev": [{"address": "0:31"}, {"address": "0:32"}]},
          deployed: [], // server list on which was deployed
          encrypted: { //this object is encrypted
            privKey: "e3412345fcd",
            pubKey: "e3412345fcd",
          }
        }
        */
        // Create an index on the 'updatedDate' property of the objects.
        storeAccounts.createIndex('updatedDate', 'updatedDate');
        // Create an index on the 'createdDate' property of the objects.
        storeAccounts.createIndex('createdDate', 'createdDate');

        // Create a store of objects
        const storeNetworks = db.createObjectStore('networks', {
          // The 'id' property of the object will be the key.
          keyPath: 'server',
          autoIncrement: true,
        });
        /*
        { id: 1,
          name: "Main",
          server: "main.everos.dev",
          explorer: "https://ever.live",
          endpoints: ["https://eri01.main.everos.dev",
                      "https://gra01.main.everos.dev",
                      "https://gra02.main.everos.dev",
                      "https://lim01.main.everos.dev",
                      "https://rbx01.main.everos.dev"],
          test: false,
          giver: "",
          coinName: "EVER",
          custom: false
        }
        */
        const networks = [
          { id: 1,
            name: "Main",
            server: "main.everos.dev",
            explorer: "https://ever.live",
            endpoints: ["https://eri01.main.everos.dev",
                        "https://gra01.main.everos.dev",
                        "https://gra02.main.everos.dev",
                        "https://lim01.main.everos.dev",
                        "https://rbx01.main.everos.dev"],
            test: false,
            giver: "",
            coinName: "EVER",
            custom: false
          },
          {
            id: 2,
            name: "Test",
            server: "net.everos.dev",
            explorer: "https://net.ever.live",
            endpoints: ["https://eri01.net.everos.dev",
                        "https://rbx01.net.everos.dev",
                        "https://gra01.net.everos.dev"],
            test: true,
            giver: "",
            coinName: "RUBY",
            custom: false
          },
          {
            id: 3,
            name: "Local",
            server: "localhost:7777",
            explorer: "http://localhost:7777/graphql",
            endpoints: ["http://localhost:7777"],
            test: true,
            giver: "0:b5e9240fc2d2f1ff8cbb1d1dee7fb7cae155e5f6320e585fcc685698994a19a5",
            coinName: "MOONROCK",
            custom: false
          }
        ];

        networks.map((network) => {
          storeNetworks.put(network);
        });
      },
    });
  }

  async addMasterKey (id, key, encrypted) {
    const transaction = this.masterDb.transaction('keys', 'readwrite');
    const store = transaction.objectStore('keys');
    await store.put({"id": id, "key": key, "encrypted": encrypted});
    return true;
  }

  async getMasterKey (id) {
    const transaction = this.masterDb.transaction('keys', 'readwrite');
    const store = transaction.objectStore('keys');
    const result = await store.get(id);
    return result;
  }

  async removeMasterKey (id) {
    const transaction = this.masterDb.transaction('keys', 'readwrite');
    const store = transaction.objectStore('keys');
    const existingKey = await store.get(id);
    if (existingKey) {
      store.delete(id);
      return true;
    }
    return false;
  }

  async addContact (accountAddress, server, contact) {
    const transaction = this.db.transaction('accounts', 'readwrite');
    const store = transaction.objectStore('accounts');
    const existingAccount = await store.get(accountAddress);
    if (existingAccount) {
      if (existingAccount.contactList[server]) {
        existingAccount.contactList[server].push(contact);
      } else {
        existingAccount.contactList[server] = [];
        existingAccount.contactList[server].push(contact);
      }
      await store.put(existingAccount);
      return true;
    }
    return false;
  }

  async removeContact (accountAddress, server, contact) {
    const transaction = this.db.transaction('accounts', 'readwrite');
    const store = transaction.objectStore('accounts');
    const existingAccount = await store.get(accountAddress);
    if (existingAccount) {
      for (const i in existingAccount.contactList[server]) {
        if (existingAccount.contactList[server][i] == contact) {
          existingAccount.contactList[server].splice(i, 1);
          break;
        }
      }
      await store.put(existingAccount);
      return true;
    }
    return false;
  }

  async addContract (accountAddress, server, contract) {
    const transaction = this.db.transaction('accounts', 'readwrite');
    const store = transaction.objectStore('accounts');
    const existingAccount = await store.get(accountAddress);
    if (existingAccount) {
      if (existingAccount.contractList[server]) {
        existingAccount.contractList[server].push(contract);
      } else {
        existingAccount.contractList[server] = [];
        existingAccount.contractList[server].push(contract);
      }
      await store.put(existingAccount);
      return true;
    }
    return false;
  }

  async removeContract (accountAddress, server, contract) {
    const transaction = this.db.transaction('accounts', 'readwrite');
    const store = transaction.objectStore('accounts');
    const existingAccount = await store.get(accountAddress);
    if (existingAccount) {
      for (const i in existingAccount.contractList[server]) {
        if (existingAccount.contractList[server][i] == contract) {
          existingAccount.contractList[server].splice(i, 1);
          break;
        }
      }
      await store.put(existingAccount);
      return true;
    }
    return false;
  }

  async addToken (accountAddress, server, tokenObject) {
    const transaction = this.db.transaction('accounts', 'readwrite');
    const store = transaction.objectStore('accounts');
    const existingAccount = await store.get(accountAddress);
    if (existingAccount) {
      if (existingAccount.tokenList[server]) {
        existingAccount.tokenList[server].push(tokenObject);
      } else {
        existingAccount.tokenList[server] = [];
        existingAccount.tokenList[server].push(tokenObject);
      }
      await store.put(existingAccount);
      return true;
    }
    return false;
  }

  async removeToken (accountAddress, server, tokenAddress) {
    const transaction = this.db.transaction('accounts', 'readwrite');
    const store = transaction.objectStore('accounts');
    const existingAccount = await store.get(accountAddress);
    if (existingAccount) {
      for (const i in existingAccount.tokenList[server]) {
        if (existingAccount.tokenList[server][i].address == tokenAddress) {
          existingAccount.tokenList[server].splice(i, 1);
          break;
        }
      }
      await store.put(existingAccount);
      return true;
    }
    return false;
  }

  async getToken (accountAddress, server, tokenAddress) {
    const transaction = this.db.transaction('accounts', 'readwrite');
    const store = transaction.objectStore('accounts');
    const existingAccount = await store.get(accountAddress);
    if (existingAccount) {
      let tokenObject = {};
      for (const i in existingAccount.tokenList[server]) {
        if (existingAccount.tokenList[server][i].address == tokenAddress) {
          tokenObject = existingAccount.tokenList[server][i]
          break;
        }
      }
      return tokenObject;
    }
    return {};
  }

  async tokenList (accountAddress, server) {
    const transaction = this.db.transaction('accounts', 'readwrite');
    const store = transaction.objectStore('accounts');
    const existingAccount = await store.get(accountAddress);
    if (existingAccount) {
      return typeof existingAccount.tokenList[server] == "undefined" ? [] : existingAccount.tokenList[server];
    }
    return false;
  }

  async updateTokenBalance(destination, server, tokenAddress, amount) {
    const transaction = this.db.transaction('accounts', 'readwrite');
    const store = transaction.objectStore('accounts');
    const existingAccount = await store.get(destination);
    if (existingAccount) {
      let needUpdate = false;
      for (const i in existingAccount.tokenList[server]) {
        if (existingAccount.tokenList[server][i].address == tokenAddress) {
          existingAccount.tokenList[server][i].balance = amount;
          needUpdate = true;
          break;
        }
      }
      if (needUpdate) {
        await store.put(existingAccount);
        return true;
      } else {
        return false;
      }
    }
    return false;
  }

  async addTransaction (accountAddress, server, tx) {
    const transaction = this.db.transaction('accounts', 'readwrite');
    const store = transaction.objectStore('accounts');
    const existingAccount = await store.get(accountAddress);
    if (existingAccount) {
      if (existingAccount.transactions[server]) {
        existingAccount.transactions[server].push(tx);
      } else {
        existingAccount.transactions[server] = [];
        existingAccount.transactions[server].push(tx);
      }
      await store.put(existingAccount);
      return true;
    }
    return false;
  }

  async getTransactions (accountAddress, server, count, page) {
    const transaction = this.db.transaction('accounts', 'readwrite');
    const store = transaction.objectStore('accounts');
    const existingAccount = await store.get(accountAddress);
    if (existingAccount) {
      if (existingAccount.transactions[server]) {
        const sortedTransactions = existingAccount.transactions[server].sort(function(a, b) {
          return b.now - a.now;
        });
        return sortedTransactions.slice((page - 1) * count, page * count);
      } else {
        return [];
      }
    }
    return [];
  }

  async updateNickname (accountAddress, nickname) {
    const transaction = this.db.transaction('accounts', 'readwrite');
    const store = transaction.objectStore('accounts');
    const existingAccount = await store.get(accountAddress);
    if (existingAccount) {
      existingAccount.nickname = nickname;
      await store.put(existingAccount);
      return true;
    }
    return false;
  }

  async updateBalance (accountAddress, server, amount) {
    const transaction = this.db.transaction('accounts', 'readwrite');
    const store = transaction.objectStore('accounts');
    const existingAccount = await store.get(accountAddress);
    if (existingAccount) {
      existingAccount.balance[server] = amount;
      await store.put(existingAccount);
      return true;
    }
    return false;
  }

  async markAsDeployed (accountAddress, server) {
    const transaction = this.db.transaction('accounts', 'readwrite');
    const store = transaction.objectStore('accounts');
    const existingAccount = await store.get(accountAddress);
    if (existingAccount) {
      if (existingAccount.deployed) {
        existingAccount.deployed.push(server);
      } else {
        existingAccount.deployed = [server];
      }
      await store.put(existingAccount);
      return true;
    }
    return false;
  }

  async addNewAccount (account) {
    const transaction = this.db.transaction('accounts', 'readwrite');
    const store = transaction.objectStore('accounts');
    const existingAccount = await store.get(account.address);
    if (!existingAccount) {
      store.put(account);
      return true;
    }
    return false;
  }

  async getAccount (accountAddress) {
    const transaction = this.db.transaction('accounts', 'readwrite');
    const store = transaction.objectStore('accounts');
    const existingAccount = await store.get(accountAddress);
    return existingAccount;
  }

  async removeAccount (accountAddress) {
    const transaction = this.db.transaction('accounts', 'readwrite');
    const store = transaction.objectStore('accounts');
    const existingAccount = await store.get(accountAddress);
    if (existingAccount) {
      store.delete(accountAddress);
      return true;
    }
    return false;
  }

  async getAccountCount () {
    const transaction = this.db.transaction('accounts', 'readwrite');
    const store = transaction.objectStore('accounts');
    return await store.count();
  }

  async getAccounts () {
    const transaction = this.db.transaction('accounts', 'readwrite');
    const store = transaction.objectStore('accounts');
    return await store.getAll();
  }

  async addNewNetwork (network) {
    const transaction = this.db.transaction('networks', 'readwrite');
    const store = transaction.objectStore('networks');
    const existingNetwork = await store.get(network.server);
    if (!existingNetwork) {
      store.add(network);
      return true;
    }
    return false;
  }

  async removeNetwork (server) {
    const transaction = this.db.transaction('networks', 'readwrite');
    const store = transaction.objectStore('networks');
    const existingNetwork = await store.get(server);
    if (existingNetwork && existingNetwork.custom) {
      await store.delete(server);
      return true;
    }
    return false;
  }

  async getNetworks () {
    const transaction = this.db.transaction('networks', 'readwrite');
    const store = transaction.objectStore('networks');
    return await store.getAll();
  }

  async getNetwork (server) {
    const transaction = this.db.transaction('networks', 'readwrite');
    const store = transaction.objectStore('networks');
    return await store.get(server);
  }

  async getPermissions (accountAddress, origin) {
    const transaction = this.db.transaction('accounts', 'readwrite');
    const store = transaction.objectStore('accounts');
    const existingAccount = await store.get(accountAddress);
    return existingAccount && existingAccount.permissions && existingAccount.permissions[origin] ? existingAccount.permissions[origin]: [];
  }

  async savePermissions (accountAddress, origin, permissions) {
    const transaction = this.db.transaction('accounts', 'readwrite');
    const store = transaction.objectStore('accounts');
    const existingAccount = await store.get(accountAddress);
    if (existingAccount) {
      if (typeof existingAccount.permissions == "undefined") {
        existingAccount.permissions = {};
        existingAccount.permissions[origin] = permissions;
      } else {
        if (existingAccount.permissions[origin]) {
          existingAccount.permissions[origin] = [...new Set([...existingAccount.permissions[origin],...permissions])]
        } else {
          existingAccount.permissions[origin] = permissions;
        }
      }
      await store.put(existingAccount);
      return true;
    }
    return false;
  }

  async checkPermission (accountAddress, origin, methodName) {
    const transaction = this.db.transaction('accounts', 'readwrite');
    const store = transaction.objectStore('accounts');
    const existingAccount = await store.get(accountAddress);
    return typeof existingAccount != "undefined" && typeof existingAccount.permissions != "undefined" && typeof existingAccount.permissions[origin] != "undefined" && existingAccount.permissions[origin].includes(methodName);
  }
}

async function checkMigration(db, oldVersion, newVersion, transaction) {
  if (oldVersion == 1 && newVersion == 2) {
    const store = transaction.objectStore('networks');
    const allNetworks = await store.getAll();
    for (let i in allNetworks) {
      if (typeof allNetworks[i].endpoints == "undefined") {
        allNetworks[i].server = allNetworks[i].server.replace("https://", "");
        switch(allNetworks[i].id) {
          case 1:
            allNetworks[i].endpoints = ["https://main2.ton.dev",
                                        "https://main3.ton.dev",
                                        "https://main4.ton.dev"];
            break;
          case 2:
            allNetworks[i].endpoints = ["https://net1.ton.dev",
                                        "https://net5.ton.dev"];
            break;
          case 3:
            allNetworks[i].endpoints = ["http://localhost:7777"];
            break;
        }
        await store.delete(allNetworks[i].server);
        await store.put(allNetworks[i]);
      }
    }
    return true;
  }

  // clean network db from old servers without endpoints
  if (oldVersion == 2 && newVersion == 3) {
    const store = transaction.objectStore('networks');
    const allNetworks = await store.getAll();
    for (let i in allNetworks) {
      await store.delete("https://" + allNetworks[i].server);
    }
    return true;
  }

  // change coin name on mainnet
  if (oldVersion == 3 && newVersion == 4) {
    const store = transaction.objectStore('networks');
    const mainNetwork = await store.get("main.ton.dev");
    mainNetwork.coinName = "EVER";
    await store.put(mainNetwork);
    return true;
  }

  // change endpoints, networks name, explorers
  if (oldVersion == 4 && newVersion == 5) {
    const storeNetworks = transaction.objectStore('networks');

    //copies the old main network and creates with the new server name
    const mainNetwork = await storeNetworks.get("main.ton.dev");
    mainNetwork.server    = "main.everos.dev",
    mainNetwork.explorer  = "https://ever.live",
    mainNetwork.endpoints = ["https://eri01.main.everos.dev",
                            "https://gra01.main.everos.dev",
                            "https://gra02.main.everos.dev",
                            "https://lim01.main.everos.dev",
                            "https://rbx01.main.everos.dev"];

    await storeNetworks.put(mainNetwork);

    //removes the main network with the old server name
    await storeNetworks.delete("main.ton.dev");

    //copies the old dev network and creates with the new server name
    const devNetwork = await storeNetworks.get("net.ton.dev");

    devNetwork.server    = "net.everos.dev";
    devNetwork.explorer  = "https://net.ever.live";
    devNetwork.endpoints = [ "https://eri01.net.everos.dev",
                             "https://rbx01.net.everos.dev",
                             "https://gra01.net.everos.dev"];

    //removes the dev network with the old server name
    await storeNetworks.put(devNetwork);

    await storeNetworks.delete("net.ton.dev");

    const storeAccounts = transaction.objectStore('accounts');
    const allAccounts = await storeAccounts.getAll();
    const networks = [{"old": "main.ton.dev", "new": "main.everos.dev"}, {"old": "net.ton.dev", "new": "net.everos.dev"}];
    for (let i in allAccounts) {
      for (let j in networks) {
        if (typeof allAccounts[i].balance[networks[j].old] != "undefined") {
          allAccounts[i].balance[networks[j].new] = allAccounts[i].balance[networks[j].old];
        }
        if (typeof allAccounts[i].transactions[networks[j].old] != "undefined") {
          allAccounts[i].transactions[networks[j].new] = allAccounts[i].transactions[networks[j].old];
        }
        if (typeof allAccounts[i].contactList[networks[j].old] != "undefined") {
          allAccounts[i].contactList[networks[j].new] = allAccounts[i].contactList[networks[j].old];
        }
        if (typeof allAccounts[i].contractList[networks[j].old] != "undefined") {
          allAccounts[i].contractList[networks[j].new] = allAccounts[i].contractList[networks[j].old];
        }
        if (typeof allAccounts[i].tokenList[networks[j].old] != "undefined") {
          allAccounts[i].tokenList[networks[j].new] = allAccounts[i].tokenList[networks[j].old];
        }
        if (allAccounts[i].deployed.includes(networks[j].old)) {
          allAccounts[i].deployed.push(networks[j].new);
        }
      }
      //need to fix bug when imports from a file
      if (typeof allAccounts[i].keyPair != "undefined") {
        delete allAccounts[i].keyPair;
      }
      if (typeof allAccounts[i].checked != "undefined") {
        delete allAccounts[i].checked;
      }
      await storeAccounts.put(allAccounts[i]);
    }

    return true;
  }

  return false;
}
