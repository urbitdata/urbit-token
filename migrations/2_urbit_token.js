const UrbitToken = artifacts.require('UrbitToken');

module.exports = function (deployer) { // eslint-disable-line func-names
  // Create UrbitToken, passing in the Urbit Admin address and Sales address
  // TODO: these are Ropsten test addresses, use real addresses
  deployer.deploy(UrbitToken, '0x935d3be8136E04B843530a2359148385Ee87bEEb', '0x55d43e43959b2dd37ec36661d9d0d878414b0908');
};
