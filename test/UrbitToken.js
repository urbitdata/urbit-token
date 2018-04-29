/* eslint-env node, mocha */
const UrbitToken = artifacts.require('../contracts/UrbitToken.sol');
const BigNumber = require('bignumber.js');

const should = require('chai') // eslint-disable-line no-unused-vars
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

contract('UrbitToken', (accounts) => {
  const admin = accounts[1];
  const bonus = accounts[2];
  const sale = accounts[3];
  const referral = accounts[4];
  var urbitToken; // eslint-disable-line no-var

  before(async () => {
    urbitToken = await UrbitToken.new(admin, bonus, sale, referral);
  });

  beforeEach(async () => {
  });

  context('initial context', () => {
    it('close sale, create tokens', async () => {
      await urbitToken.closeSale({ from: admin });
    });
  });
});
