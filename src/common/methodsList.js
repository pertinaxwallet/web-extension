const methods = {
  "getProviderState": {
    Description: "Web page will be able to know the provider state",
    UsePrivateKeys: false,
    MustBeAllowed: false,
    RequiredParams: [],
  },
  "wallet_getSdkVersion": {
    Description: "Web page will be able to get SDK version",
    UsePrivateKeys: false,
    MustBeAllowed: false,
    RequiredParams: []
  },
  "wallet_requestPermissions": {
    Description: "Method to request needed permissions from user",
    UsePrivateKeys: false,
    MustBeAllowed: false,
    RequiredParams: [{'permissions': 'array'}]
  },
  "wallet_getPermissions": {
    Description: "Method to get permissions granted by user",
    UsePrivateKeys: false,
    MustBeAllowed: false,
    RequiredParams: [],
  },
  "ever_account": {
    Description: "Web page will be able to know the selected account",
    UsePrivateKeys: false,
    MustBeAllowed: true,
    RequiredParams: []
  },
  "ever_endpoint": {
    Description: "Web page will be able to know the selected endpoint",
    UsePrivateKeys: false,
    MustBeAllowed: true,
    RequiredParams: []
  },
  "ever_sendTransaction": {
    Description: "Web page will be able to initialize the transaction dialog",
    UsePrivateKeys: true,
    MustBeAllowed: true,
    RequiredParams: [{'destination': 'string'}, {'amount': 'number'}, {'message': 'string'}]
  },
  "ever_signMessage": {
    Description: "Web page will be able to initialize the signing message dialog",
    UsePrivateKeys: true,
    MustBeAllowed: true,
    RequiredParams: [{'data': 'string'}]
  },
  "ever_getNaclBoxPublicKey": {
    Description: "Web page will be able to obtain the public key for ever_encryptMessage method",
    UsePrivateKeys: true,
    MustBeAllowed: true,
    RequiredParams: []
  },
  "ever_getSignature": {
    Description: "Web page will be able to initialize the dialog for obtaining user signature",
    UsePrivateKeys: true,
    MustBeAllowed: true,
    RequiredParams: [{'data': 'string'}]
  },
  "ever_crypto_generate_random_bytes": {
    Description: "Web page will be able to run generate_random_bytes method from crypto module",
    UsePrivateKeys: false,
    MustBeAllowed: false,
    RequiredParams: [{'length': 'number'}]
  },
  "ever_encryptMessage": {
    Description: "Web page will be able to initialize the encrypting message dialog",
    UsePrivateKeys: true,
    MustBeAllowed: true,
    RequiredParams: [{'decrypted': 'string'}, {'nonce': 'string'}, {'their_public': 'string'}]
  },
  "ever_decryptMessage": {
    Description: "Web page will be able to initialize the decrypting message dialog",
    UsePrivateKeys: true,
    MustBeAllowed: true,
    RequiredParams: [{'encrypted': 'string'}, {'nonce': 'string'}, {'their_public': 'string'}]
  },
  "ever_subscribe": {
    Description: "Web page will be able to subscribe on blockchain events",
    UsePrivateKeys: false,
    MustBeAllowed: true,
    RequiredParams: [{'collection': 'string'}, {'filter': 'object'}, {'result': 'string'}]
  },
  "ever_unsubscribe": {
    Description: "Web page will be able to unsubscribe on blockchain events",
    UsePrivateKeys: false,
    MustBeAllowed: true,
    RequiredParams: [{'handle': 'number'}]
  }
};

export default methods;
