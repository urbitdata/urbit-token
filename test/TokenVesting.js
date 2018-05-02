/* eslint-env node, mocha */
const TokenVesting = artifacts.require('../contracts/TokenVesting.sol');
const BigNumber = require('bignumber.js');

const should = require('chai') // eslint-disable-line no-unused-vars
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

contract('TokenVesting', (accounts) => {
  const creator = accounts[0];
  const beneficiary = accounts[1];

  before(async () => {
  });

  beforeEach(async () => {
  });

  context('initial context', () => {
    it('should create TokenVesting', async () => {
      const tv = await TokenVesting.new(beneficiary, 0, 0, 0, true);
      //
    });

    it('should release token', async () => {
      const tv = await TokenVesting.new(beneficiary, 1, 1, 1, true);
    });

    it('should revoke token', async () => {
    });

    it('should calculate the releasable amount', async () => {
    });

    it('should calculate the vested amount', async () => {
    });
  });
});
