const UrbitToken = artifacts.require('UrbitToken');

module.exports = function (deployer) { // eslint-disable-line func-names
  // Create UrbitToken, passing in the Urbit Admin address and Sales address
  // TODO: these are Ropsten test addresses, use real addresses
  deployer.deploy(UrbitToken, '0xE39F321390c7C1F4b3BC182D88Cf78db4B3A02a1', '0x9f8ac07005E8347271d326ab50418Bfb017506Bc');
};
