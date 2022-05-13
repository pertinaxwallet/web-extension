import { TonClient, signerExternal, signerNone, signerKeys, abiContract, accountForExecutorAccount } from "@eversdk/core";
import { libWeb } from "@eversdk/lib-web";
import { Vault } from "../common/vault.js";

TonClient.useBinaryLibrary(libWeb);

class EverLib {
  static everClient = null;
  static seedPhraseWordCount = 12;
  static seedPhraseDictionaryEnglish = 1;
  static hdPath = "m/44'/396'/0'/0/0";

  instance = null; //private

  constructor(client) {
    this.everClient = client;
    this.vault = new Vault();
    this.vault.init();
  }

  async getClient(server = "main.everos.dev") {
    const network = await this.vault.getNetwork(server);
    if (this.instance == null || network.endpoints.filter(x => this.instance.config.network.endpoints.includes(x)).length == 0) {
      this.instance = new this.everClient({
        network: {
          endpoints: network.endpoints
        }
      });
    }
    return this;
  }

  async generateSeed() {
    try {
      return await this.instance.crypto.mnemonic_from_random(
        {dictionary: this.seedPhraseDictionaryEnglish, word_count: this.seedPhraseWordCount}
      );
    } catch (exp) {
      throw exp;
    }
  }

  async convertSeedToKeys(seed) {
    try {
      return await this.instance.crypto.mnemonic_derive_sign_keys({
        dictionary: this.seedPhraseDictionaryEnglish,
        word_count: this.seedPhraseWordCount,
        phrase: seed,
        path: this.hdPath
      });
    } catch (exp) {
      throw exp;
    }
  }

  async predictAddress(publicKey, abi, tvc, callParams = {}) {
    try {
      const {address} = await this.instance.abi.encode_message({
        signer: signerExternal(publicKey),
        abi: abiContract(abi),
        deploy_set: {
          tvc: tvc
        },
        call_set: callParams.initFunctionName
          ? {
            function_name: callParams.initFunctionName,
            input: callParams.initFunctionInput,
          }
          : undefined,
      });
      return address;
    } catch (exp) {
      throw exp;
    }
  }

  /**
   * Description
   * https://github.com/tonlabs/ton-client-js/blob/master/packages/core/src/modules.ts#L2942
  **/
  async decodeMessageBody(abi, body) {
    try {
      return await this.instance.abi.decode_message_body({
        abi: abiContract(abi),
        body: body,
        is_internal: true
      });
    } catch (exp) {
      throw exp;
    }
  }

  /**
   * Description
   * https://github.com/tonlabs/ever-sdk-js/blob/master/packages/core/src/modules.ts#L3193
  **/
  async decodeMessage(abi, message) {
    try {
      return await this.instance.abi.decode_message({
        abi: abiContract(abi),
        message: message
      });
    } catch (exp) {
      throw exp;
    }
  }

  /**
   * Description
   * https://github.com/tonlabs/ton-client-js/blob/master/packages/core/src/modules.ts#L2194
  **/
  async encodeMessage(address, functionName, abi, input = {}, keyPair = null) {
    try {
      return await this.instance.abi.encode_message({
        address: address,
        signer: keyPair == null ? signerNone() : signerKeys(keyPair),
        abi: abiContract(abi),
        call_set: {
          function_name: functionName,
          input: input,
        },
      });
    } catch (exp) {
      throw exp;
    }
  }

  /**
   * Description
   * https://github.com/tonlabs/ton-client-js/blob/master/packages/core/src/modules.ts#L2459
  **/
  async encodeMessageBody(abi, functionName, input = {}) {
    try {
      return (await this.instance.abi.encode_message_body({
        signer: signerNone(),
        abi: abiContract(abi),
        call_set: {
          function_name: functionName,
          input: input,
        },
        is_internal: true,
      })).body;
    } catch (exp) {
      throw exp;
    }
  }

  /**
   * Description
   * https://github.com/tonlabs/ton-client-js/blob/master/packages/core/src/modules.ts#L2136
  **/
  async encodeMessageToDeploy(address, abi, tvc, callParams = {}, keyPair = null) {
    try {
      return await this.instance.abi.encode_message({
        address: address,
        signer: signerKeys(keyPair),
        abi: abiContract(abi),
        deploy_set: {
          tvc: tvc
        },
        call_set: callParams.initFunctionName
          ? {
            function_name: callParams.initFunctionName,
            input: callParams.initFunctionInput,
          }
          : undefined,
      });
    } catch (exp) {
      throw exp;
    }
  }

  /**
   * Description
   * https://github.com/tonlabs/ton-client-js/blob/master/packages/core/src/modules.ts#L3243
  **/
  async run(abi, message) {
    try {
      return await this.instance.processing.send_message({
        message: message.message,
        abi: abiContract(abi),
        send_events: false,
      });
    } catch (exp) {
      throw exp;
    }
  }

  /**
   * Description
   * https://github.com/tonlabs/ton-client-js/blob/master/packages/core/src/modules.ts#L3285
  **/
  async waitForRunTransaction(abi, message, runResult) {
    try {
      const result = await this.instance.processing.wait_for_transaction({
        abi: abiContract(abi),
        message: message.message,
        shard_block_id: runResult.shard_block_id,
        send_events: false
      });
      return result.transaction;
    } catch (exp) {
      throw exp;
    }
  }

  async sendTransaction(address, functionName, abi, input = {}, keyPair = null) {
    try {
      const encoded_message = await this.encodeMessage(address, functionName, abi, input, keyPair);
      const runResult       = await this.run(abi, encoded_message);
      return await this.waitForRunTransaction(abi, encoded_message, runResult);
    } catch (exp) {
      throw exp;
    }
  }

  async sendDeployTransaction(address, abi, tvc, callParams = {}, keyPair = null) {
    try {
      const encoded_message = await this.encodeMessageToDeploy(address, abi, tvc, callParams, keyPair);
      const runResult       = await this.run(abi, encoded_message);
      return await this.waitForRunTransaction(abi, encoded_message, runResult);
    } catch (exp) {
      throw exp;
    }
  }

  async requestAccountsTransactions(addresses, now) {
    try {
      const data = await this.instance.net.query({"query": `
      query {
        transactions(
          filter: {
            account_addr: {in: [${addresses.map((item) => {return `"${item}"`}).join(", ")}]}
            now: {gt: ${now}}
          }
          orderBy: { path: "now", direction: DESC }
        ) {
          id, account_addr, now, in_message {boc, body}, out_messages {boc, body}, aborted, orig_status, end_status, block_id, balance_delta(format:DEC), total_fees(format:DEC)
        }
      }
      `});
      return data.result.data.transactions;
    } catch (exp) {
      throw exp;
    }
  }

  async requestAccountBalance(address) {
    try {
      const data = await this.instance.net.query({"query": `
      query {
       accounts(
         filter: {
           id: {eq: "${address}"}
         }
       ) {
         balance(format: DEC)
       }
      }
      `});
      return data.result.data.accounts.length > 0 ? data.result.data.accounts[0].balance: 0;
    } catch (exp) {
      throw exp;
    }
  }

  async requestManyAccountBalances(accountsList) {
    try {
      let filter = "";
      for (let i in accountsList) {
        filter += `OR: {id: {eq: "${accountsList[i]}"}
        `;
      }
      filter += new String("}").repeat(accountsList.length);
      const data = await this.instance.net.query({"query": `
        query {
         accounts(
           filter: {
             ${filter}
           }
         ) {
           id
           balance(format: DEC)
         }
        }
      `});
      return data.result.data.accounts;
    } catch (exp) {
      throw exp;
    }
  }

  async requestAccountData(address) {
    try {
      const data = await this.instance.net.query({"query": `
      query {
       accounts(
         filter: {
           id: {eq: "${address}"}
         }
       ) {
         id
         code_hash
         boc
         data
       }
      }
      `});
      return data.result.data.accounts.length > 0 ? data.result.data.accounts[0]: false;
    } catch (exp) {
      throw exp;
    }
  }

  /**
   * Description
   * https://github.com/tonlabs/ton-client-js/blob/master/packages/core/src/modules.ts#L3285
  **/
  async calcRunFees(address, functionName, abi, input = {}, keyPair = null) {
    try {
      const data = await this.instance.net.query({"query": `
        query {
         accounts(
           filter: {
             id: {eq: "${address}"}
           }
         ) {
           boc
         }
        }
        `});
      //here needs to check that address is existed
      if (data.result && data.result.data && data.result.data.accounts.length == 0) {
        throw new Error("Account is not existed");
      }
      const boc = data.result.data.accounts[0].boc;
      const encoded_message = await this.encodeMessage(address, functionName, abi, input, keyPair);
      const result = await this.instance.tvm.run_executor({
        message: encoded_message.message,
        account: accountForExecutorAccount(boc, false),
        abi: abiContract(abi),
        skip_transaction_check: false,
        return_updated_account: false
      });
      return result.fees;
    } catch (exp) {
      throw exp;
    }
  }

  async calcDeployFees(keyPair, contract, initParams, constructorParams) {
    try {
      return await this.instance.contracts.calcDeployFees({
        package: contract,
        constructorParams,
        initParams,
        keyPair,
        emulateBalance: true,
        newaccount: true,
      });
    } catch (exp) {
      throw exp;
    }
  }

  async runLocalContract(address, abi, functionName, input = {}, keyPair = null) {
    try {
      const encoded_message = await this.encodeMessage(address, functionName, abi, input, keyPair);

      const bocResult = await this.instance.net.query_collection({
        collection: 'accounts',
        filter: { id: { eq: address } },
        result: 'boc'
      });

      if (bocResult.result.length == 0) {
        throw new Error("Account doesn't exists");
      }

      const response = await this.instance.tvm.run_tvm({
        message: encoded_message.message,
        account: bocResult.result[0].boc,
        abi: {
          type: 'Contract',
          value: (abi)
        }
      });

      return response.decoded.output;
    } catch (exp) {
      throw exp;
    }
  }

  async signMessageInBox(keyPair, unsigned) {
    try {
      const signing_box = await this.instance.crypto.get_signing_box(keyPair);
      const result = await this.instance.crypto.signing_box_sign({signing_box: signing_box.handle, unsigned: unsigned});
      await this.instance.crypto.remove_signing_box(signing_box);
      return result.signature;
    } catch (exp) {
      throw exp;
    }
  }

  async encryptMessageInNaclBox(keyPair, data) {
    try {
      const naclKeyPair = await this.getNaclBoxKeyPair(keyPair.secret);
      const result = await this.instance.crypto.nacl_box({
        decrypted: data.decrypted,
        nonce: data.nonce,
        their_public: data.their_public,
        secret: naclKeyPair.secret
      });
      return result.encrypted;
    } catch (exp) {
      throw exp;
    }
  }

  async decryptMessageInNaclBox(keyPair, data) {
    try {
      const naclKeyPair = await this.getNaclBoxKeyPair(keyPair.secret);
      const result = await this.instance.crypto.nacl_box_open({
        encrypted: data.encrypted,
        nonce: data.nonce,
        their_public: data.their_public,
        secret: naclKeyPair.secret
      });
      return result.decrypted;
    } catch (exp) {
      throw exp;
    }
  }

  async cryptoGenerateRandomBytes(data) {
    try {
      const result = await this.instance.crypto.generate_random_bytes({
        length: data
      });
      return result.bytes;
    } catch (exp) {
      throw exp;
    }
  }

  async getNaclBoxKeyPair(secret) {
    try {
      const result = await this.instance.crypto.nacl_box_keypair_from_secret_key({
        secret: secret
      });
      return result;
    } catch (exp) {
      throw exp;
    }
  }

  async getSignature(secret, unsigned) {
    try {
      const naclKeyPair = await this.instance.crypto.nacl_box_keypair_from_secret_key({
        secret: secret
      });
      const result = await this.instance.crypto.nacl_sign({
        unsigned: unsigned,
        secret: `${naclKeyPair.secret}${naclKeyPair.public}`
      });
      return result.signed;
    } catch (exp) {
      throw exp;
    }
  }

  checkThatSdkMethodExists(module, method) {
    return typeof this.instance[module] != "undefined" && typeof this.instance[module][method] != "undefined";
  }

  async runSdkMethodDirectly(module, method, params = {}) {
    try {
      if (Object.keys(params).length != 0) {
        return await this.instance[module][method](params);
      } else {
        return await this.instance[module][method]();
      }
    } catch (exp) {
      throw exp;
    }
  }

  async getSubscriptionId(params, callback) {
    try {
      const result = await this.instance.net.subscribe_collection(params, callback);
      return result.handle;
    } catch (exp) {
      throw exp;
    }
  }

  async removeSubscriptionId(params) {
    try {
      await this.instance.net.unsubscribe(params);
      return true;
    } catch (exp) {
      throw exp;
    }
  }
};

export default new EverLib(TonClient);
