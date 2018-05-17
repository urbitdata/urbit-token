/* eslint-env node, mocha */
const UrbitToken = artifacts.require('../contracts/UrbitToken.sol');
const expectThrow = require('./helpers/expectThrow.js');
const BigNumber = require('bignumber.js');

const should = require('chai') // eslint-disable-line no-unused-vars
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

contract('Urbit', (accounts) => {
  const creator = accounts[0];
  const admin = accounts[1];
  const bonus = accounts[2];
  const sale = accounts[3];
  const referral = accounts[4];
  const alix = accounts[5];
  const barb = accounts[6];
  // const carl = accounts[7];
  // const doug = accounts[8];
  // const earl = accounts[9];
  var urbitToken; // eslint-disable-line no-var

  const presaleAmount = 1000;

  before(async () => {
    urbitToken = await UrbitToken.new(admin, bonus, sale, referral);
  });

  context('pre-sale', () => {
    it('should send tokens to pre-sale buyers', async () => {
      // send tokens to alix
      let result = await urbitToken.transfer(alix, presaleAmount, { from: sale });
      result.logs[0].event.should.be.eq('Transfer');
      // verify balance
      (await urbitToken.balanceOf(alix)).toNumber().should.be.eq(presaleAmount);
      // send tokens to barb
      result = await urbitToken.transfer(barb, presaleAmount, { from: sale });
      result.logs[0].event.should.be.eq('Transfer');
      // verify balance
      (await urbitToken.balanceOf(barb)).toNumber().should.be.eq(presaleAmount);
    });

    it('should not allow pre-sale buyers to transfer their tokens', async () => {
      result = await urbitToken.transfer(barb, 100, { from: alix });
      // no event emitted
      result.logs.length.should.eq(0);
      // balance remains the same
      (await urbitToken.balanceOf(alix)).toNumber().should.be.eq(presaleAmount);
      result = await urbitToken.transfer(creator, 100, { from: barb });
      result.logs.length.should.eq(0);
      (await urbitToken.balanceOf(barb)).toNumber().should.be.eq(presaleAmount);
    });
  });

  context('close sale', () => {
    it('should close sale, create tokens', async () => {
      await urbitToken.closeSale({ from: admin });
    });

    it('should not have increased the total supply beyond the hard cap', async () => {
      (await urbitToken.HARD_CAP()).should.be.bignumber.eq(await urbitToken.totalSupply());
    });
  });

  context('after the sale is closed', () => {
    it('should allow transferFrom', async () => {
      // alix sends tokens
      //  const result = await urbitToken.transferFrom(bonus, sale, 10101, { from: sale });
      //  result.logs[0].event.should.be.eq('Transfer');
    });
  });

  context('vest tokens', () => {
    it('should lock tokens', async () => {
      //  (await urbitToken.lockedBalanceOf(alice)).toNumber().should.be.equal(0);
    });
    it('should get the locked balance for an owner', async () => {
      //  (await urbitToken.lockedBalanceOf(alice)).toNumber().should.be.equal(0);
    });
    it('should fail to get the releasable balance for an owner who has no locks', async () => {
      //  await expectThrow(urbitToken.releaseableBalanceOf(alice));
    });
    it('should not allow non-admins to lock tokens', async () => {
      //  await expectThrow(urbitToken.lockTokens(bonus, 10101, sale, 11, { from: creator }));
    });
    it('should fail to lock token', async () => {
      //  await expectThrow(urbitToken.lockTokens(bonus, 1, alice, 1, { from: admin }));
    });
  });

  context('releasing vested tokens', () => {
    it('should release all tokens for the same recipient at the same time', async () => {
    });
  });

});
