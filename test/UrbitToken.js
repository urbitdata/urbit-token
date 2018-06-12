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
  const sale = accounts[3];
  const alice = accounts[5];
  const amount = 1000;
  let urbitToken;

  before(async () => {
    urbitToken = await UrbitToken.new(admin, sale);
    await urbitToken.createSaleTokens({ from: admin });
  });

  // sets up a token with prep for a two-year lock
  beforeEach(async () => {
    this.token = await UrbitToken.new(admin, sale);
    await this.token.createSaleTokens({ from: admin });
    this.start = latestTime() + duration.minutes(1); // +1 minute so it starts after contract instantiation
    this.duration = duration.years(2);
    await this.token.closeSale({ from: admin });
    this.teamTokensVault = await this.token.urbitTeamTokensVault();
  });

  context('bad initialization', () => {
    it('should not be accept incorrect constructor arguments', async () => {
      await expectThrow(UrbitToken.new(0, sale));
      await expectThrow(UrbitToken.new(admin, 0));
    });

    it('should not allow createSaleTokens to be called twice', async () => {
      await expectThrow(urbitToken.createSaleTokens({ from: admin }));
    });
  });

  context('before sale closed', () => {
    it('should allow valid transfers', async () => {
      // should allow sale transfer
      let result = await urbitToken.transfer(creator, 10101, { from: sale });
      result.logs[0].event.should.be.eq('Transfer');

      // should allow transferFrom
      await urbitToken.transfer(admin, 10000, { from: sale });
      await urbitToken.approve(sale, 1000, { from: admin });
      result = await urbitToken.transferFrom(admin, creator, 100, { from: sale });
      result.logs.length.should.eq(1);
    });

    it('should not allow invalid transfers', async () => {
      // should not allow transfer to null
      await expectThrow(urbitToken.transfer(0, 10101, { from: sale }));

      // should not allow transfer by other
      let result = await urbitToken.transfer(admin, 10101, { from: creator });
      result.logs.length.should.eq(0);

      // should not allow transferFrom by other
      await urbitToken.approve(sale, 10101, { from: creator });
      result = await urbitToken.transferFrom(creator, sale, 10101, { from: creator });
      result.logs.length.should.eq(0);
    });
  });

  context('closing the sale', () => {
    it('should close the sale and create tokens', async () => {
      // should have a total supply below the hard cap
      (await urbitToken.HARD_CAP()).should.be.bignumber.gt(await urbitToken.totalSupply());

      // should not allow non-admin, non-sale account to lock bonus/referral tokens
      await expectThrow(urbitToken.lockBonusTokens(amount, alice, duration.days(12), { from: creator }));
      await expectThrow(urbitToken.lockReferralTokens(amount, alice, duration.days(12), { from: creator }));

      // should allow sale account to lock bonus/referral tokens
      await urbitToken.lockBonusTokens(amount, alice, duration.days(12), { from: sale });
      await urbitToken.lockReferralTokens(amount, alice, duration.days(12), { from: sale });

      // should not allow non-admin to close sale
      await expectThrow(urbitToken.closeSale({ from: creator }));

      // should not burn tokens before the sale is closed
      await expectThrow(urbitToken.burnUnsoldTokens({ from: admin }));

      // should close sale, create tokens
      await urbitToken.closeSale({ from: admin });

      // should not allow bonus/referral tokens after close sale
      await expectThrow(urbitToken.lockBonusTokens(amount, alice, duration.days(12), { from: admin }));
      await expectThrow(urbitToken.lockReferralTokens(amount, alice, duration.days(12), { from: admin }));

      // should not have increased the total supply beyond the hard cap
      (await urbitToken.HARD_CAP()).should.be.bignumber.eq(await urbitToken.totalSupply());

      // should only be able to close sale once
      await expectThrow(urbitToken.closeSale({ from: admin }));
    });
  });

  context('after the sale is closed', () => {
    it('should allow transferFrom', async () => {
      const result = await urbitToken.transferFrom(creator, sale, 10101, { from: sale });
      result.logs[0].event.should.be.eq('Transfer');
    });
  });

  context('burn unsold tokens', () => {
    it('should not allow non-admin to burn', async () => {
      await expectThrow(urbitToken.burnUnsoldTokens({ from: creator }));
    });

    it('should burn tokens', async () => {
      const bonus = await urbitToken.bonusTokensVault();
      const referral = await urbitToken.referralTokensVault();
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
    it('should exercise basic lock mechanisms', async () => {
      // should get the locked balance for an owner
      (await this.token.lockedBalanceOf(alice)).toNumber().should.be.equal(0);

      // should get the releasable balance for an owner who has no locks
      await this.token.releasableBalanceOf(alice);

      // should fail to lock token that is not in a vault
      await expectThrow(this.token.lockTokens(sale, amount, alice, this.start, { from: admin }));

      // should not allow non-admins to lock tokens
      await expectThrow(this.token.lockTokens(this.teamTokensVault, amount, alice, this.start, { from: creator }));

      // should lock token, not be releasable immediately
      await this.token.lockTokens(this.teamTokensVault, amount, alice, this.start, { from: admin });
      (await this.token.balanceOf(alice)).toNumber().should.be.eq(0);
      (await this.token.releasableBalanceOf(alice)).toNumber().should.be.eq(0);
    });

    it('should become releasable over time', async () => {
      // Alice has no balance and no vested tokens
      (await this.token.balanceOf(alice)).toNumber().should.be.eq(0);
      (await this.token.releasableBalanceOf(alice)).toNumber().should.be.eq(0);
      // Alice can't send
      await expectThrow(this.token.transfer(admin, amount, { from: alice }));
      // vest tokens for Alice
      await this.token.lockTokens(this.teamTokensVault, amount, alice, this.start, { from: admin });
      // Alice still can't send
      await expectThrow(this.token.transfer(admin, amount, { from: alice }));
      // Turn time forward
      await increaseTimeTo(latestTime() + duration.minutes(1));
      (await this.token.balanceOf(alice)).toNumber().should.be.eq(0);
      (await this.token.releasableBalanceOf(alice)).toNumber().should.be.eq(amount);
      // alice calls the contract to release her vested tokens
      await this.token.releaseVestedTokens({ from: alice });
      // She should now have a regular token balance, and no releasable tokens
      (await this.token.balanceOf(alice)).toNumber().should.be.eq(amount);
      (await this.token.releasableBalanceOf(alice)).toNumber().should.be.eq(0);
      // Alice can send
      const result = await this.token.transfer(admin, amount, { from: alice });
      result.logs[0].event.should.be.eq('Transfer');
      // Alice doesn't have any tokens left
      (await this.token.balanceOf(alice)).toNumber().should.be.eq(0);
      (await this.token.releasableBalanceOf(alice)).toNumber().should.be.eq(0);
      // Alice can't send
      await expectThrow(this.token.transfer(admin, amount, { from: alice }));
    });

    // Slimmer version of the test above to test releasing on the behalf of others
    it('should allow anyone to release on behalf of anyone else', async () => {
      // vest tokens for Alice
      await this.token.lockTokens(this.teamTokensVault, amount, alice, this.start, { from: admin });
      // Turn time forward
      await increaseTimeTo(latestTime() + duration.minutes(1));
      // creator releases on behalf of alice.
      await this.token.releaseVestedTokensFor(alice, { from: creator });
      (await this.token.balanceOf(alice)).toNumber().should.be.eq(amount);
      (await this.token.releasableBalanceOf(alice)).toNumber().should.be.eq(0);
      // Alice can send
      const result = await this.token.transfer(admin, amount, { from: alice });
      result.logs[0].event.should.be.eq('Transfer');
    });
  });
});
