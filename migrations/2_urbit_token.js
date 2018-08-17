const UrbitToken = artifacts.require('UrbitToken');

module.exports = function (deployer) { // eslint-disable-line func-names
  // Create UrbitToken, passing in the Urbit Admin address and Sales address
  // TODO: these are Ropsten test addresses, use real addresses
  deployer.deploy(UrbitToken, '0x935d3be8136E04B843530a2359148385Ee87bEEb', '0x9f8ac07005E8347271d326ab50418Bfb017506Bc');
};
