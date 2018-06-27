const UrbitToken = artifacts.require('UrbitToken');

module.exports = function (deployer) { // eslint-disable-line func-names
  // Create UrbitToken, passing in the Urbit Admin address and Sales address
  // TODO: use real addresses
  deployer.deploy(UrbitToken, '0xf17f52151EbEF6C7334FAD080c5704D77216b732', '0xC5fdf4076b8F3A5357c5E395ab970B5B54098Fef');
};
