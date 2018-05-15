/* eslint-env node, mocha */
const UrbitToken = artifacts.require('../contracts/UrbitToken.sol');
const expectThrow = require('./helpers/expectThrow.js');
const BigNumber = require('bignumber.js');

const should = require('chai') // eslint-disable-line no-unused-vars
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

contract('UrbitToken', (accounts) => {
  const creator = accounts[0];
  const admin = accounts[1];
  const bonus = accounts[2];
  const sale = accounts[3];
  const referral = accounts[4];
  var urbitToken; // eslint-disable-line no-var

  before(async () => {
    urbitToken = await UrbitToken.new(admin, bonus, sale, referral);
  });

  context('bad initialization', () => {
    it('should not be allowed', async () => {
      await expectThrow(UrbitToken.new(0, bonus, sale, referral));
      await expectThrow(UrbitToken.new(admin, 0, sale, referral));
      await expectThrow(UrbitToken.new(admin, bonus, 0, referral));
      await expectThrow(UrbitToken.new(admin, bonus, sale, 0));
    });
  });

  context('before sale closed', () => {
    it('should allow bonus to transfer', async () => {
      const result = await urbitToken.transfer(admin, 10101, { from: bonus });
      result.logs[0].event.should.be.eq('Transfer');
    });

    it('should allow sale transfer', async () => {
      const result = await urbitToken.transfer(admin, 10101, { from: sale });
      result.logs[0].event.should.be.eq('Transfer');
    });

    it('should allow referral to transfer', async () => {
      const result = await urbitToken.transfer(admin, 10101, { from: referral });
      result.logs[0].event.should.be.eq('Transfer');
    });

    it('should not allow transfer to null', async () => {
      await expectThrow(urbitToken.transfer(0, 10101, { from: bonus }));
    });

    it('should not allow transfer by other', async () => {
      const result = await urbitToken.transfer(admin, 10101, { from: creator });
      result.logs.length.should.eq(0);
    });
  });

  context('closing the sale', () => {
    it('should not allow non-admin to close sale', async () => {
      await expectThrow(urbitToken.closeSale({ from: bonus }));
    });

    it('should close sale, create tokens', async () => {
      await urbitToken.closeSale({ from: admin });
    });

    it('should only close sale once', async () => {
      await expectThrow(urbitToken.closeSale({ from: admin }));
    });
  });
});
