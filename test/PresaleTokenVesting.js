/* eslint-env node, mocha */
const expectThrow = require('./helpers/expectThrow.js');
const latestTime = require('./helpers/latest-time');
const { increaseTimeTo, duration } = require('./helpers/increase-time');

const { BigNumber } = web3;

require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

const UrbitToken = artifacts.require('UrbitToken');
const TokenVesting = artifacts.require('TokenVesting');

contract('PresaleTokenVesting', ([admin, sale, beneficiary]) => {
  let MAGNITUDE;
  let bonusTokensVault;
  let bonusTokensVaultAmount;
  let referralTokensVault;
  let referralTokensVaultAmount;
  const ZERO = new BigNumber(0);
  const vestedAmount = new BigNumber(1000);

  beforeEach(async () => {
    this.token = await UrbitToken.new(admin, sale);
    await this.token.createSaleTokens();

    this.start = latestTime() + duration.minutes(1); // +1 minute so it starts after contract instantiation

    // hardcoded in the contract
    MAGNITUDE = await this.token.MAGNITUDE();
    bonusTokensVault = await this.token.bonusTokensVault();
    bonusTokensVaultAmount = MAGNITUDE.mul(new BigNumber(41346823));
    referralTokensVault = await this.token.referralTokensVault();
    referralTokensVaultAmount = MAGNITUDE.mul(new BigNumber(19150290));
  });

  it('should lock some balance equal to the hardcoded amount', async () => {
    let balanceOfVault = await this.token.balanceOf(bonusTokensVault);
    balanceOfVault.should.bignumber.equal(bonusTokensVaultAmount);
    balanceOfVault = await this.token.balanceOf(referralTokensVault);
    balanceOfVault.should.bignumber.equal(referralTokensVaultAmount);
  });

  it('should keep balance locked before closeSale', async () => {
    await this.token.lockBonusTokens(vestedAmount, beneficiary, duration.days(90));
    (await this.token.lockedBalanceOf(beneficiary)).should.bignumber.equal(vestedAmount);
    (await this.token.releasableBalanceOf(beneficiary)).should.bignumber.equal(ZERO);
    (await this.token.balanceOf(beneficiary)).should.bignumber.equal(ZERO);
  });

  it('should not allow locking bonus tokens or referral tokens after closeSale', async () => {
    await this.token.closeSale();
    await expectThrow(this.token.lockBonusTokens(vestedAmount, beneficiary, duration.days(90)));
    await expectThrow(this.token.lockReferralTokens(vestedAmount, beneficiary, duration.days(90)));
  });


  it('should have released all after end', async () => {
    await this.token.lockBonusTokens(vestedAmount, beneficiary, duration.days(90));
    await this.token.closeSale();
    await increaseTimeTo((await this.token.saleClosedTimestamp()).plus(duration.days(45)));
    (await this.token.balanceOf(beneficiary)).should.bignumber.equal(ZERO);
    (await this.token.releasableBalanceOf(beneficiary)).should.bignumber.equal(vestedAmount.dividedBy(2));
    await increaseTimeTo((await this.token.saleClosedTimestamp()).plus(duration.days(91)));
    (await this.token.balanceOf(beneficiary)).should.bignumber.equal(ZERO);
    (await this.token.releasableBalanceOf(beneficiary)).should.bignumber.equal(vestedAmount);
    await (await new TokenVesting(await this.token.vestingOf(beneficiary))).release(this.token.address);
    (await this.token.balanceOf(beneficiary)).should.bignumber.equal(vestedAmount);
  });

  it('should handle multiple grants to the same beneficiary', async () => {
    await this.token.lockBonusTokens(vestedAmount, beneficiary, this.start);
    await this.token.lockReferralTokens(vestedAmount, beneficiary, this.start);
    // TODO: handle conflicting durations
  });
});
