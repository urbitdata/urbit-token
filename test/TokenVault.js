/* eslint-env node, mocha */
const BasicTokenMock = artifacts.require('../contracts/mocks/BasicTokenMock.sol');
const BigNumber = require('bignumber.js');
const expectThrow = require('./helpers/expectThrow.js');

const should = require('chai') // eslint-disable-line no-unused-vars
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

contract('TokenVault', (accounts) => {
  const account1 = accounts[1];
  const account2 = accounts[2];

  context('vault', () => {
    it('should fail to create an empty vault', async () => {
      const tvMock = await BasicTokenMock.new(account1, 10000);
      await tvMock.createTokenVault(0);
      await expectThrow(tvMock.fillUpAllowance());
      await expectThrow(tvMock.approveSalesTransfer());
    });

    it('should create a regular vault', async () => {
      const tvMock = await BasicTokenMock.new(account2, 10000);
      await tvMock.createTokenVault(1000);
      await tvMock.fillUpAllowance();
    });
  });
});
