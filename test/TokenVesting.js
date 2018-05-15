/* eslint-env node, mocha */
const latestTime = require('./helpers/latest-time');
const { increaseTimeTo, duration } = require('./helpers/increase-time');

const { BigNumber } = web3;

require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

const UrbitToken = artifacts.require('UrbitToken');
const TokenVesting = artifacts.require('TokenVesting');

contract('TokenVesting', ([admin, bonus, sale, referral, beneficiary]) => {
  let MAGNITUDE;
  let teamTokensVault;
  let teamTokensVaultAmount;
  const ZERO = new BigNumber(0);
  const vestedAmount = new BigNumber(1000);

  beforeEach(async () => {
    this.token = await UrbitToken.new(admin, bonus, sale, referral);

    this.start = latestTime() + duration.minutes(1); // +1 minute so it starts after contract instantiation
    this.duration = duration.years(2);

    await this.token.closeSale({ from: admin });

    // hardcoded in the contract
    MAGNITUDE = await this.token.MAGNITUDE();
    teamTokensVault = await this.token.urbitTeamTokensVault();
    teamTokensVaultAmount = MAGNITUDE.mul(new BigNumber(30000000));
  });

  it('should lock some balance equal to the hardcoded amount', async () => {
    const balanceOfVault = await this.token.balanceOf(teamTokensVault);
    balanceOfVault.should.bignumber.equal(teamTokensVaultAmount);
  });

  it('should lock balance before start', async () => {
    await this.token.lockTokens(teamTokensVault, vestedAmount, beneficiary, this.start);
    (await this.token.lockedBalanceOf(beneficiary)).should.bignumber.equal(vestedAmount);
    (await this.token.releaseableBalanceOf(beneficiary)).should.bignumber.equal(ZERO);
    (await this.token.balanceOf(beneficiary)).should.bignumber.equal(ZERO);
  });

  it('should have released all after end', async () => {
    await this.token.lockTokens(teamTokensVault, vestedAmount, beneficiary, this.start);
    await increaseTimeTo(this.start + duration.minutes(1));
    (await this.token.balanceOf(beneficiary)).should.bignumber.equal(ZERO);
    (await this.token.releaseableBalanceOf(beneficiary)).should.bignumber.equal(vestedAmount);
    await (await new TokenVesting(await this.token.vestingOf(beneficiary))).release(this.token.address);
    (await this.token.balanceOf(beneficiary)).should.bignumber.equal(vestedAmount);
  });
});
