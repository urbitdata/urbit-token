/* eslint-env node, mocha */
/* eslint no-var: 0 */
/* eslint no-await-in-loop: 0 */
const UrbitToken = artifacts.require('../contracts/UrbitToken.sol');
// const expectThrow = require('./helpers/expectThrow.js');
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

  context('bonus tokens', () => {
    it('should send bonus tokens to pre-sale buyers', async () => {
    });

    it('should not allow bonus token holders to transfer their tokens', async () => {
    });
  });

  context('referral tokens', () => {
    it('should send referral tokens to referrers of pre-sale buyers', async () => {
    });

    it('should not allow referral token holders to transfer their tokens', async () => {
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

  context('final disposition of token balances', () => {
    it('should leave all of the token vaults and accounts in the following state', async () => {
      // creator: 0
      (await urbitToken.balanceOf(creator)).toNumber().should.be.eq(0);
      (await urbitToken.lockedBalanceOf(creator)).toNumber().should.be.eq(0);
      // Admin: 0
      (await urbitToken.balanceOf(admin)).toNumber().should.be.eq(0);
      (await urbitToken.lockedBalanceOf(admin)).toNumber().should.be.eq(0);
      // Bonus: ???
      // Sale: ???
      // Referral: ???
      // UrbitTeam: ???
      // Bounty: ???
      // Rewards: ???
      // Retained: ???
    });
  });
});
