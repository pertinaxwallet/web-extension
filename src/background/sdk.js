import EverLib from "../common/everLib.js";
import { base64ToHex } from "../common/utils.js";

export const sdk = () => {
  const cryptoGenerateRandomBytes = async (data) => {
    const EverLibClient = await EverLib.getClient();
    const result = await EverLibClient.cryptoGenerateRandomBytes(data.length);
    return {base64: result, hex: base64ToHex(result)};
  };

  const getSdkVersion = async () => {
    const EverLibClient = await EverLib.getClient();
    const result = await EverLibClient.runSdkMethodDirectly("client", "version");
    return result;
  };

  const checkThatSdkMethodExists = async (module, method) => {
    const prohibited_methods = ['net_subscribe_collection'];
    if (prohibited_methods.includes(`${module}_${method}`)) {
      return false;
    }
    const EverLibClient = await EverLib.getClient();
    return EverLibClient.checkThatSdkMethodExists(module, method);
  };

  const runSdkMethod = async (network, module, method, params) => {
    const EverLibClient = await EverLib.getClient(network);
    return await EverLibClient.runSdkMethodDirectly(module, method, params);
  };

  const getSubscriptionId = async (network, params, callback) => {
    const EverLibClient = await EverLib.getClient(network);
    return await EverLibClient.getSubscriptionId(params, callback);
  };

  const removeSubscriptionId = async (network, params) => {
    const EverLibClient = await EverLib.getClient(network);
    return await EverLibClient.removeSubscriptionId(params);
  };

  return {
    cryptoGenerateRandomBytes,
    getSdkVersion,
    getSubscriptionId,
    removeSubscriptionId,
    checkThatSdkMethodExists,
    runSdkMethod
  };
};
