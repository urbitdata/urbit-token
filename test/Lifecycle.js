/* eslint-env node, mocha */
/* eslint no-var: 0 */
/* eslint no-await-in-loop: 0 */
const UrbitToken = artifacts.require('../contracts/UrbitToken.sol');
const expectThrow = require('./helpers/expectThrow.js');
const BigNumber = require('bignumber.js');
const latestTime = require('./helpers/latest-time');
const { increaseTimeTo, duration } = require('./helpers/increase-time'); // eslint-disable-line no-unused-vars

const should = require('chai') // eslint-disable-line no-unused-vars
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

contract('Urbit', (accounts) => {
  const creator = accounts[0];
  const admin = accounts[1];
  const sale = accounts[3];
  const alix = accounts[5]; // purchaser, bonus recipient
  const barb = accounts[6]; // purchaser, bonus, referral recipient
  const carl = accounts[7]; // referral recipient
  const doug = accounts[8]; // bounty, referral recipient
  const earl = accounts[9]; // team bonus recipient
  var urbitToken; // eslint-disable-line no-var

  const presaleAmount = 1000;
  const teamAmount = 10000;

  before(async () => {
    urbitToken = await UrbitToken.new(admin, sale);
    await urbitToken.createSaleTokens({ from: admin });
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
    it('should send bonus tokens to pre-sale buyers', async () => {
      // TokenGet will call lock???Tokens() for each token/recipient pair
      const sixty = duration.days(60);
      await urbitToken.lockBonusTokens(presaleAmount, alix, sixty, { from: admin });
      await urbitToken.lockBonusTokens(presaleAmount, barb, sixty, { from: sale });
      await urbitToken.lockReferralTokens(presaleAmount, barb, sixty, { from: sale });
      await urbitToken.lockReferralTokens(presaleAmount, carl, sixty, { from: admin });
      await urbitToken.lockReferralTokens(presaleAmount, doug, sixty, { from: admin });
      await urbitToken.lockBountyTokens(presaleAmount, doug, sixty, { from: sale });

      // should not allow others
      await expectThrow(urbitToken.lockReferralTokens(presaleAmount, carl, sixty, { from: creator }));
    });

    it('should show bonus and referral tokens as locked', async () => {
      // Should be locked (will not be unlocked until 2 months after close)
      (await urbitToken.lockedBalanceOf(alix)).toNumber().should.be.eq(presaleAmount);
      (await urbitToken.lockedBalanceOf(barb)).toNumber().should.be.eq(presaleAmount * 2);
      (await urbitToken.lockedBalanceOf(carl)).toNumber().should.be.eq(presaleAmount);
      (await urbitToken.lockedBalanceOf(doug)).toNumber().should.be.eq(presaleAmount * 2);
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

    // The Sale tokens *can* be manually burned even before the sale is closed.
    it('should burn half the sale tokens manually', async () => {
      const balance = await urbitToken.balanceOf(sale);
      const fuel = balance.div(2);
      const result = await urbitToken.burn(fuel, { from: sale });
      result.logs[0].event.should.be.eq('Burn');
      result.logs[1].event.should.be.eq('Transfer');
      (await urbitToken.balanceOf(sale)).should.be.bignumber.eq(balance.minus(fuel));
      burned = fuel;
    });

    it('should have reduced the total supply', async () => {
      (await urbitToken.HARD_CAP()).should.be.bignumber.eq((await urbitToken.totalSupply()).plus(burned));
    });

    it('should burn sale, referral, and bonus tokens from the contract', async () => {
      const bonus = await urbitToken.bonusTokensVault();
      const bounty = await urbitToken.bountyTokensVault();
      const referral = await urbitToken.referralTokensVault();
      const saleBalance = await urbitToken.balanceOf(sale);
      const bonusBalance = await urbitToken.balanceOf(bonus);
      const bountyBalance = await urbitToken.balanceOf(bounty);
      const referralBalance = await urbitToken.balanceOf(referral);
      const result = await urbitToken.burnUnsoldTokens({ from: admin });
      result.logs[0].event.should.be.eq('Burn');
      result.logs[1].event.should.be.eq('Transfer');
      result.logs[2].event.should.be.eq('Burn');
      result.logs[3].event.should.be.eq('Transfer');
      result.logs[4].event.should.be.eq('Burn');
      result.logs[5].event.should.be.eq('Transfer');
      result.logs[6].event.should.be.eq('Burn');
      result.logs[7].event.should.be.eq('Transfer');
      (await urbitToken.balanceOf(sale)).toNumber().should.be.eq(0);
      (await urbitToken.balanceOf(bonus)).toNumber().should.be.eq(0);
      (await urbitToken.balanceOf(bounty)).toNumber().should.be.eq(0);
      (await urbitToken.balanceOf(referral)).toNumber().should.be.eq(0);
      burned = burned.plus(bonusBalance.plus(bountyBalance.plus(saleBalance.plus(referralBalance))));
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

  context('should vest bonus, bounty and referral tokens sixty days after closeSale', () => {
    it('should still be locked', async () => {
      (await urbitToken.lockedBalanceOf(alix)).toNumber().should.be.eq(presaleAmount);
      (await urbitToken.lockedBalanceOf(barb)).toNumber().should.be.eq(presaleAmount * 2);
      (await urbitToken.lockedBalanceOf(carl)).toNumber().should.be.eq(presaleAmount);
      (await urbitToken.lockedBalanceOf(doug)).toNumber().should.be.eq(presaleAmount * 2);
    });

    it('should still be locked thirty days later', async () => {
      await increaseTimeTo(latestTime() + duration.days(30));
      (await urbitToken.lockedBalanceOf(alix)).toNumber().should.be.eq(presaleAmount);
      (await urbitToken.lockedBalanceOf(barb)).toNumber().should.be.eq(presaleAmount * 2);
      (await urbitToken.lockedBalanceOf(carl)).toNumber().should.be.eq(presaleAmount);
      (await urbitToken.lockedBalanceOf(doug)).toNumber().should.be.eq(presaleAmount * 2);
    });

    it('should still be locked fifteen days later', async () => {
      await increaseTimeTo(latestTime() + duration.days(15));
      (await urbitToken.lockedBalanceOf(alix)).toNumber().should.be.eq(presaleAmount);
      (await urbitToken.lockedBalanceOf(barb)).toNumber().should.be.eq(presaleAmount * 2);
      (await urbitToken.lockedBalanceOf(carl)).toNumber().should.be.eq(presaleAmount);
      (await urbitToken.lockedBalanceOf(doug)).toNumber().should.be.eq(presaleAmount * 2);
    });

    it('should be able to release balance sixty days after closeSale', async () => {
      await increaseTimeTo(latestTime() + duration.days(15));
      (await urbitToken.releasableBalanceOf(alix)).toNumber().should.be.eq(presaleAmount);
      (await urbitToken.releasableBalanceOf(barb)).toNumber().should.be.eq(presaleAmount * 2);
      (await urbitToken.releasableBalanceOf(carl)).toNumber().should.be.eq(presaleAmount);
      (await urbitToken.releasableBalanceOf(doug)).toNumber().should.be.eq(presaleAmount * 2);
    });

    it('should now be unlockable', async () => {
      (await urbitToken.releaseVestedTokens({ from: alix }));
      (await urbitToken.releaseVestedTokensFor(barb, { from: admin }));
      (await urbitToken.releaseVestedTokensFor(carl, { from: creator }));
      (await urbitToken.releasableBalanceOf(carl)).toNumber().should.be.eq(0);
      (await urbitToken.releaseVestedTokensFor(doug, { from: sale }));
    });

    it('should be able to transfer those tokens', async () => {
      // use carl because he has only the referral
      (await urbitToken.balanceOf(carl)).toNumber().should.be.eq(presaleAmount);
      const result = await urbitToken.transfer(admin, presaleAmount, { from: carl });
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
      (await urbitToken.balanceOf(earl)).toNumber().should.be.eq(0);
      (await urbitToken.lockedBalanceOf(earl)).toNumber().should.be.eq(0);
      // vestTokens for earl
      const result = await urbitToken.vestTokens(urbitTeamTokensVault, teamAmount, earl, latestTime() + duration.minutes(1), duration.days(90), duration.days(365), false, { from: admin }); // eslint-disable-line max-len
      result.logs[0].event.should.be.eq('Transfer');
    });

    it('should get the locked balance for an address', async () => {
      (await urbitToken.lockedBalanceOf(alix)).toNumber().should.be.eq(0);
    });

    it('should not allow non-admins to lock tokens', async () => {
      await expectThrow(urbitToken.lockTokens(await urbitToken.urbitTeamTokensVault(), 10101, sale, 11, { from: creator }));
    });

    // TODO: allow multiple vestings for a single address
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
