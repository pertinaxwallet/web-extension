import { Vault } from "../common/vault.js";
import EverLib from "../common/everLib.js";
import SafeMultisigWallet from "./solidity/SafeMultisigWallet/SafeMultisigWallet.json";
import { toNano, strToHex, broadcastMessage } from "../common/utils.js";
import { accounts } from './accounts.js';
import Transfer from "./solidity/Transfer/Transfer.abi.json";
import TokenRoot from "./solidity/TIP-3/TokenRoot.abi.json";
import TokenWallet from "./solidity/TIP-3/TokenWallet.abi.json";

const DEPLOY_WALLET_VALUE = toNano(0.1);

export const tokens = () => {
  const vault = new Vault();
  vault.init();

  const getFamousTokens = () => {
    return {"main.ton.dev": [
            /*
            {
              "name": "Wrapped TON",
              "symbol": "WTON",
              "decimals": 9,
              "address": "",
              "icon": "",
              "type": "3"
            }
            */
            ],
          };
  };

  const importToken = async (accountAddress, server, tokenObject) => {
    const result = await vault.addToken(accountAddress, server, tokenObject);
    broadcastMessage("updateWalletUI");
    return result;
  };

  /**
  *  we can add caching here later
  */
  const getTokenListForUser = async (accountAddress, server) => {
    const tokenList = await vault.tokenList(accountAddress, server);
    for (let i in tokenList) {
      try {
        tokenList[i].balance = await getCurrentTokenBalance(accountAddress, server, tokenList[i].address);
      } catch(e) {
        tokenList[i].balance = 0;
      }
    };
    return tokenList;
  };

  const calculateFeeForToken = async (accountAddress, server, txData, keyPair) => {
    if (txData.params.token.type == 3) {
      return calculateFeeForTokenType3(accountAddress, server, txData, keyPair);
    }
  };

  const transferToken = async (accountAddress, server, txData, keyPair) => {
    if (txData.params.token.type == 3) {
      return transferTokenType3(accountAddress, server, txData, keyPair);
    }
  };

  const getCurrentTokenBalance = async (destination, server, tokenRootAddress) => {
    const EverLibClient = await EverLib.getClient(server);
    let amount = 0;
    try {
      const tokenObject = await vault.getToken(destination, server, tokenRootAddress);
      if (typeof tokenObject.type != "undefined") {
        if (tokenObject.type == "3") {
          const walletAddress = await getTokenType3WalletAddress(server, tokenRootAddress, destination);
          amount = await getTokenType3Balance(server, walletAddress);
        }
      }
    } catch(e) {
      throw e;
    }
    await vault.updateTokenBalance(destination, server, tokenRootAddress, amount);
    return amount;
  };

  const getTokenInfo = async (server, tokenRootAddress) => {
    const type3 = await getTokenType3Info(server, tokenRootAddress);
    if (type3 != false) {
      type3.type = 3;
      return type3;
    }
    return false;
  };

  const detectTokenTransaction = async (server, body) => {
    const EverLibClient = await EverLib.getClient(server);

    // Let's suppose that it is Native transfer
    try {
      const payloadForNativeTransfer = await EverLibClient.decodeMessageBody(Transfer, body);
      console.log('payloadForNativeTransfer', payloadForNativeTransfer);
    } catch (exp) {
      console.log(exp.message);
    }

    // Let's suppose that it is TIP-3
    try {
      const payloadForToken = await EverLibClient.decodeMessageBody(TokenWallet, body);
      console.log('payloadForToken', payloadForToken);
    } catch (exp) {
      console.log(exp.message);
    }
  }

  const calculateFeeForTokenType3 = async (accountAddress, server, txData, keyPair) => {
    try {
      const EverLibClient = await EverLib.getClient(server);
      const payloadForToken = await EverLibClient.encodeMessageBody(Transfer,
        "transfer",
        { comment: strToHex(txData.params.message) }
      );

      const walletAddressRecipient = await getTokenType3WalletAddress(server, txData.params.token.address, txData.params.destination);

      const walletAddressOwner = await getTokenType3WalletAddress(server, txData.params.token.address, accountAddress);

      const payloadBody = await EverLibClient.encodeMessageBody(TokenWallet, "transfer", {
        amount: txData.params.amount,
        recipient: walletAddressRecipient,
        deployWalletValue: DEPLOY_WALLET_VALUE,
        remainingGasTo: accountAddress,
        notify: false,
        payload: payloadForToken
      });

      const result = await EverLibClient.calcRunFees(accountAddress,
                                                    "sendTransaction",
                                                    SafeMultisigWallet.abi,
                                                    { dest: walletAddressOwner,
                                                      value: DEPLOY_WALLET_VALUE,
                                                      bounce: true,
                                                      flags: 0,
                                                      payload: payloadBody
                                                    },
                                                    keyPair);
      return {fee: result};
    } catch (exp) {
      return {error: exp.message};
    }
  }

  const getTokenType3WalletAddress = async (server, tokenRootAddress, ownerAddress) => {
    const EverLibClient = await EverLib.getClient(server);
    const runResult = await EverLibClient.runLocalContract(tokenRootAddress, TokenRoot, 'walletOf', {
      answerId: 0,
      walletOwner: ownerAddress
    }, null);
    return runResult.value0;
  };

  const getTokenType3Info = async (server, tokenRootAddress) => {
    const EverLibClient = await EverLib.getClient(server);
    try {
      const runResultName = await EverLibClient.runLocalContract(tokenRootAddress, TokenRoot, 'name', {answerId: 0});
      const outName = runResultName.value0;

      const runResultSymbol = await EverLibClient.runLocalContract(tokenRootAddress, TokenRoot, 'symbol', {answerId: 0});
      const outSymbol = runResultSymbol.value0;

      const runResultDecimals = await EverLibClient.runLocalContract(tokenRootAddress, TokenRoot, 'decimals', {answerId: 0});
      const outDecimals = runResultDecimals.value0;

      const runResultTotalSupply = await EverLibClient.runLocalContract(tokenRootAddress, TokenRoot, 'totalSupply', {answerId: 0});
      const outTotalSupply = runResultTotalSupply.value0;

      return {
        name: outName,
        symbol: outSymbol,
        decimals: Number(outDecimals),
        totalSupply: Number(outTotalSupply),
        icon: ''
      }
    } catch(e) {
      return false;
    }
  };

  const getTokenType3Balance = async (server, walletAddress) => {
    const EverLibClient = await EverLib.getClient(server);
    const runResult = await EverLibClient.runLocalContract(walletAddress, TokenWallet, 'balance', {answerId: 0});
    return runResult.value0;
  };

  const transferTokenType3 = async (accountAddress, server, txData, keyPair) => {
    try {
      const EverLibClient = await EverLib.getClient(server);
      const payloadForToken = await EverLibClient.encodeMessageBody(Transfer,
        "transfer",
        { comment: strToHex(txData.params.message) }
      );

      const walletAddressRecipient = await getTokenType3WalletAddress(server, txData.params.token.address, txData.params.destination);

      const walletAddressOwner = await getTokenType3WalletAddress(server, txData.params.token.address, accountAddress);

      const payloadBody = await EverLibClient.encodeMessageBody(TokenWallet, "transfer", {
        amount: txData.params.amount,
        recipient: walletAddressRecipient,
        deployWalletValue: DEPLOY_WALLET_VALUE,
        remainingGasTo: accountAddress,
        notify: false,
        payload: payloadForToken
      });

      const result = await EverLibClient.sendTransaction(accountAddress,
                                                          "sendTransaction",
                                                          SafeMultisigWallet.abi,
                                                          { dest: walletAddressOwner,
                                                            value: DEPLOY_WALLET_VALUE,
                                                            bounce: true,
                                                            flags: 0,
                                                            payload: payloadBody
                                                          },
                                                          keyPair);
      return { result };
    } catch (exp) {
      return { error: exp.message };
    }
  }

  return {
    getFamousTokens,
    getTokenInfo,
    importToken,
    getTokenListForUser,
    calculateFeeForToken,
    transferToken,
    getCurrentTokenBalance
  };
};
