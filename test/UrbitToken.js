/* eslint-env node, mocha */
const UrbitToken = artifacts.require('../contracts/UrbitToken.sol');
const expectThrow = require('./helpers/expectThrow.js');
const BigNumber = require('bignumber.js');
const latestTime = require('./helpers/latest-time');
const { increaseTimeTo, duration } = require('./helpers/increase-time');

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
  const alice = accounts[5];
  let urbitToken;
  let teamTokensVault;

  before(async () => {
    urbitToken = await UrbitToken.new(admin, bonus, sale, referral);
  });

  beforeEach(async () => {
    teamTokensVault = await urbitToken.urbitTeamTokensVault();
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

    it('should not allow transferFrom', async () => {
      await urbitToken.approve(sale, 10101, { from: bonus });
      const result = await urbitToken.transferFrom(bonus, sale, 10101, { from: sale });
      result.logs.length.should.eq(0);
    });
  });

  context('closing the sale', () => {
    it('should have a total supply below the hard cap', async () => {
      (await urbitToken.HARD_CAP()).should.be.bignumber.gt(await urbitToken.totalSupply());
    });

    it('should not allow non-admin to close sale', async () => {
      await expectThrow(urbitToken.closeSale({ from: bonus }));
    });

    it('should not burn tokens before the sale is closed', async () => {
      await expectThrow(urbitToken.burnUnsoldTokens({ from: admin }));
    });

    it('should close sale, create tokens', async () => {
      await urbitToken.closeSale({ from: admin });
    });

    it('should not have increased the total supply beyond the hard cap', async () => {
      (await urbitToken.HARD_CAP()).should.be.bignumber.eq(await urbitToken.totalSupply());
    });

    it('should only close sale once', async () => {
      await expectThrow(urbitToken.closeSale({ from: admin }));
    });
  });

  context('after the sale is closed', () => {
    it('should allow transferFrom', async () => {
      const result = await urbitToken.transferFrom(bonus, sale, 10101, { from: sale });
      result.logs[0].event.should.be.eq('Transfer');
    });
  });

  context('burn unsold tokens', () => {
    it('should not allow non-admin to burn', async () => {
      await expectThrow(urbitToken.burnUnsoldTokens({ from: creator }));
    });

    it('should burn tokens', async () => {
      const bonusBalance = await urbitToken.balanceOf(bonus);
      const saleBalance = await urbitToken.balanceOf(sale);
      const referralBalance = await urbitToken.balanceOf(referral);
      const totalSupply = await urbitToken.totalSupply();
      const result = await urbitToken.burnUnsoldTokens({ from: admin });
      result.logs[0].event.should.be.eq('Burn');
      result.logs[1].event.should.be.eq('Transfer');
      result.logs[2].event.should.be.eq('Burn');
      result.logs[3].event.should.be.eq('Transfer');
      result.logs[4].event.should.be.eq('Burn');
      result.logs[5].event.should.be.eq('Transfer');
      (await urbitToken.balanceOf(bonus)).toNumber().should.be.eq(0);
      (await urbitToken.balanceOf(sale)).toNumber().should.be.eq(0);
      (await urbitToken.balanceOf(referral)).toNumber().should.be.eq(0);
      totalSupply.should.be.bignumber.eq((await urbitToken.totalSupply()).plus(bonusBalance.plus(saleBalance.plus(referralBalance))));
    });
  });

  context('token locking', () => {
    const start = latestTime() + duration.minutes(2);
    const amount = 1000;

    it('should get the locked balance for an owner', async () => {
      (await urbitToken.lockedBalanceOf(alice)).toNumber().should.be.equal(0);
    });

    it('should fail to get the releasable balance for an owner who has no locks', async () => {
      await expectThrow(urbitToken.releaseableBalanceOf(alice));
    });

    it('should fail to lock token that is not in a vault', async () => {
      await expectThrow(urbitToken.lockTokens(bonus, amount, alice, start, { from: admin }));
    });

    it('should not allow non-admins to lock tokens', async () => {
      await expectThrow(urbitToken.lockTokens(teamTokensVault, amount, alice, start, { from: creator }));
    });

    it('should lock token, not be releasable immediately', async () => {
      await urbitToken.lockTokens(teamTokensVault, amount, alice, start, { from: admin });
      (await urbitToken.balanceOf(alice)).toNumber().should.be.eq(0);
      (await urbitToken.releaseableBalanceOf(alice)).toNumber().should.be.eq(amount);
    });

    it('should become releasable over time', async () => {
      await increaseTimeTo(latestTime() + duration.minutes(5));
      (await urbitToken.balanceOf(alice)).toNumber().should.be.eq(0);
      (await urbitToken.releaseableBalanceOf(alice)).toNumber().should.be.eq(amount);
      await urbitToken.releaseVestedTokens({ from: alice });
//      await urbitToken.releaseVestedTokensFor( alice, { from: creator });
      (await urbitToken.balanceOf(alice)).toNumber().should.be.eq(amount);
      (await urbitToken.releaseableBalanceOf(alice)).toNumber().should.be.eq(amount);
    });
  });
});
