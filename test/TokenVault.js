/* eslint-env node, mocha */
const TokenVault = artifacts.require('../contracts/TokenVault.sol');
const BigNumber = require('bignumber.js');

const should = require('chai') // eslint-disable-line no-unused-vars
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

contract('TokenVault', (accounts) => {
//  const account0 = accounts[0];
//  const account1 = accounts[1];

  before(async () => {
  });

  beforeEach(async () => {
  });

  context('initial context', () => {
    it('create vault', async () => {
      // create some token...
      //
      //
      // const tv = await TokenVault.new(token);
      // await tv.fillUpAllowance();
    });
  });
});
