/* eslint-env node, mocha */
/* eslint no-var: 0 */
/* eslint no-await-in-loop: 0 */
const UrbitToken = artifacts.require('../contracts/UrbitToken.sol');
// const expectThrow = require('./helpers/expectThrow.js');
const BigNumber = require('bignumber.js');
const latestTime = require('./helpers/latest-time');
const { increaseTimeTo, duration } = require('./helpers/increase-time');

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
  const alix = accounts[5]; // purchaser, bonus recipient
  const barb = accounts[6]; // purchaser, bonus, referral recipient
  const carl = accounts[7]; // referral recipient
  const doug = accounts[8]; // team bonus recipient
  // const earl = accounts[9];
  var urbitToken; // eslint-disable-line no-var

  const presaleAmount = 1000;
  const teamAmount = 10000;

  before(async () => {
    urbitToken = await UrbitToken.new(admin, bonus, sale, referral);
  });

  context('pre-sale buyers', () => {
    it('should send tokens to pre-sale buyers', async () => {
      // send tokens to alix
      var result = await urbitToken.transfer(alix, presaleAmount, { from: sale });
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
      // alix attempts to transfer her tokens to barb
      var result = await urbitToken.transfer(barb, 100, { from: alix });
      // no event emitted
      result.logs.length.should.eq(0);
      // balances remain the same
      (await urbitToken.balanceOf(alix)).toNumber().should.be.eq(presaleAmount);
      (await urbitToken.balanceOf(barb)).toNumber().should.be.eq(presaleAmount);
      // barb attempts to transfer her tokens to creator
      result = await urbitToken.transfer(creator, 100, { from: barb });
      // no event emitted
      result.logs.length.should.eq(0);
      // balance remains the same
      (await urbitToken.balanceOf(barb)).toNumber().should.be.eq(presaleAmount);
    });
  });

  context('bonus and referral tokens', () => {
    xit('should send bonus tokens to pre-sale buyers', async () => {
      // TokenGet will call lockTokens()
      // lockTokens->vestTokens->UrbitTokenVesting will add the
      // 
      // TODO
//      var result = await urbitToken.lockTokens(bonus, presaleAmount, alix, 'two months');
      // 
//      result = await urbitToken.lockTokens(bonus, presaleAmount, barb, 'two months');
//      result = await urbitToken.lockTokens(referral, presaleAmount, barb, 'two months');
//      result = await urbitToken.lockTokens(referral, presaleAmount, carl, 'two months');
    });

    xit('should show bonus and referral tokens as locked', async () => {
      // Should be locked (will not be unlocked until 2 months after close)
      (await urbitToken.lockedBalanceOf(alix)).toNumber().should.be.eq(presaleAmount);
      (await urbitToken.lockedBalanceOf(barb)).toNumber().should.be.eq(presaleAmount*2);
      (await urbitToken.lockedBalanceOf(carl)).toNumber().should.be.eq(presaleAmount);
    });
  });

  context('close sale', () => {
    it('should close sale, create tokens', async () => {
      await urbitToken.closeSale({ from: admin });
    });

    it('should increase the total supply to equal the hard cap', async () => {
      (await urbitToken.HARD_CAP()).should.be.bignumber.eq(await urbitToken.totalSupply());
    });
  });

  context('burn tokens', () => {
    var burned = BigNumber(0);

    // The Sale, Referral, and Bonus tokens *can* be manually burned from each
    // of those accounts (or any account), even before the sale is closed.
    it('should burn half the tokens manually', async () => {
      const burnAccounts = [sale, referral, bonus];
      for (let burnit of burnAccounts) { // eslint-disable-line prefer-const, no-restricted-syntax
        const balance = await urbitToken.balanceOf(burnit);
        const fuel = balance.div(2);
        const result = await urbitToken.burn(fuel, { from: burnit });
        result.logs[0].event.should.be.eq('Burn');
        result.logs[1].event.should.be.eq('Transfer');
        (await urbitToken.balanceOf(burnit)).should.be.bignumber.eq(balance.minus(fuel));
        burned = burned.plus(fuel);
      }
    });

    it('should have reduced the total supply', async () => {
      (await urbitToken.HARD_CAP()).should.be.bignumber.eq((await urbitToken.totalSupply()).plus(burned));
    });

    it('should burn sale, referral, and bonus tokens from the contract', async () => {
      const bonusBalance = await urbitToken.balanceOf(bonus);
      const saleBalance = await urbitToken.balanceOf(sale);
      const referralBalance = await urbitToken.balanceOf(referral);
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
      burned = burned.plus(bonusBalance.plus(saleBalance.plus(referralBalance)));
    });

    it('should have reduced the total supply', async () => {
      (await urbitToken.HARD_CAP()).should.be.bignumber.eq((await urbitToken.totalSupply()).plus(burned));
    });
  });

  context('after the sale is closed', () => {
    it('should allow transferFrom', async () => {
      // alix sends her presale tokens to barb
      var result = await urbitToken.transfer(barb, presaleAmount, { from: alix });
      result.logs[0].event.should.be.eq('Transfer');
      // barb should have alix's tokens and her own
      (await urbitToken.balanceOf(alix)).toNumber().should.be.eq(0);
      (await urbitToken.balanceOf(barb)).toNumber().should.be.eq(2 * presaleAmount);
      // barb sends the presale tokens back to alix
      result = await urbitToken.transfer(alix, presaleAmount, { from: barb });
    });
  });

  context('should vest bonus and referral tokens 2 months after closeSale', () => {
    xit('should still be locked', async () => {
      (await urbitToken.lockedBalanceOf(alix)).toNumber().should.be.eq(presaleAmount);
      (await urbitToken.lockedBalanceOf(barb)).toNumber().should.be.eq(presaleAmount*2);
      (await urbitToken.lockedBalanceOf(carl)).toNumber().should.be.eq(presaleAmount);
    });

    xit('should still be locked one month later', async () => {
      // TODO: advance time 30 days
      (await urbitToken.lockedBalanceOf(alix)).toNumber().should.be.eq(presaleAmount);
      (await urbitToken.lockedBalanceOf(barb)).toNumber().should.be.eq(presaleAmount*2);
      (await urbitToken.lockedBalanceOf(carl)).toNumber().should.be.eq(presaleAmount);
    });

    xit('should still be locked two weeks later', async () => {
      // TODO: advance time 14 days
      (await urbitToken.lockedBalanceOf(alix)).toNumber().should.be.eq(presaleAmount);
      (await urbitToken.lockedBalanceOf(barb)).toNumber().should.be.eq(presaleAmount*2);
      (await urbitToken.lockedBalanceOf(carl)).toNumber().should.be.eq(presaleAmount);
    });

    xit('should be able to release balance two months after closeSale', async () => {
      // TODO: advance time 14 days
      (await urbitToken.releasableBalanceOf(alix)).toNumber().should.be.eq(presaleAmount);
      (await urbitToken.releasableBalanceOf(barb)).toNumber().should.be.eq(presaleAmount*2);
      (await urbitToken.releasableBalanceOf(carl)).toNumber().should.be.eq(presaleAmount);
    });

    xit('should now be unlockable', async () => {
      (await urbitToken.releaseVestedTokens({ from: alix }));
      (await urbitToken.releaseVestedTokensFor(barb, { from: admin }));
      (await urbitToken.releaseVestedTokensFor(carl, { from: creator }));
      (await urbitToken.releasableBalanceOf(carl)).toNumber().should.be.eq(presaleAmount);
    });

    xit('should be able to transfer those tokens', async () => {
      // use carl because he has only the referral
      (await urbitToken.balanceOf(carl)).toNumber().should.be.eq(presaleAmount);
      var result = await urbitToken.transfer(admin, presaleAmount, { from: carl });
      result.logs[0].event.should.be.eq('Transfer');
      (await urbitToken.balanceOf(carl)).toNumber().should.be.eq(0);
      // admin gives it back
      await urbitToken.transfer(carl, presaleAmount, { from: admin });
    });
  });

  // Now we start to grant tokens for the team, etc
  context('vest tokens', () => {
    it('should vest team tokens', async () => {
      var urbitTeamTokensVault = await urbitToken.urbitTeamTokensVault();
      urbitTeamTokensVault.toString().length.should.be.eq(42);
      // should start at zero
      (await urbitToken.balanceOf(doug)).toNumber().should.be.eq(0);
      (await urbitToken.lockedBalanceOf(doug)).toNumber().should.be.eq(0);
      // TODO vestTokens for doug
      var latest = latestTime();
//      var result = await urbitToken.vestTokens(urbitTeamTokensVault, teamAmount, doug, latest + duration.minutes(1), latest + duration.hours(1), duration.days(365), false, { from: admin });
    });
    xit('should get the locked balance for an owner', async () => {
      //  (await urbitToken.lockedBalanceOf(alice)).toNumber().should.be.eq(0);
    });
    xit('should fail to get the releasable balance for an owner who has no locks', async () => {
      //  await expectThrow(urbitToken.releaseableBalanceOf(alice));
    });
    xit('should not allow non-admins to lock tokens', async () => {
      //  await expectThrow(urbitToken.lockTokens(bonus, 10101, sale, 11, { from: creator }));
    });
    xit('should check to see if a token lock already exists for a given address', async () => {
      //  await expectThrow(urbitToken.lockTokens(bonus, 1, alice, 1, { from: admin }));
    });
  });

  context('releasing vested tokens', () => {
    xit('should release all tokens for the same recipient at the same time', async () => {
    });
  });

  context('final disposition of token balances', () => {
    it('should leave all of the token vaults and accounts in the following state', async () => {
      // creator: 0
      (await urbitToken.balanceOf(creator)).toNumber().should.be.eq(0);
      (await urbitToken.lockedBalanceOf(creator)).toNumber().should.be.eq(0);
      // Admin: 0
      (await urbitToken.balanceOf(admin)).toNumber().should.be.eq(0);
      (await urbitToken.lockedBalanceOf(admin)).toNumber().should.be.eq(0);
      // Bonus: TODO
      // Sale: TODO
      // Referral: TODO
      // UrbitTeam: TODO
      // Bounty: TODO
      // Rewards: TODO
      // Retained: TODO
    });
  });
});
