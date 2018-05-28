pragma solidity ^0.4.21;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/StandardToken.sol";
import "openzeppelin-solidity/contracts/token/ERC20/BurnableToken.sol";
import "openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/TokenVesting.sol";
import "./PresaleTokenVesting.sol";
import "./TokenVault.sol";


/**
 * @title UrbitToken
 * @dev UrbitToken is a contract for the Urbit token sale, creating the
 * tokens and managing the vaults.
 */
contract UrbitToken is BurnableToken, StandardToken {
    string public constant name = "Urbit Token"; // solium-disable-line uppercase
    string public constant symbol = "URB"; // solium-disable-line uppercase
    uint8 public constant decimals = 18; // solium-disable-line uppercase
    uint256 public constant MAGNITUDE = 10**uint256(decimals);

    /// Maximum tokens to be allocated (600 million)
    uint256 public constant HARD_CAP = 600000000 * MAGNITUDE;

    /// This address is used to manage the admin functions and allocate vested tokens
    address public urbitAdminAddress;

    /// This address is used to keep the tokens for sale
    address public saleTokensAddress;

    /// This vault is used to keep the bonus tokens
    TokenVault public bonusTokensVault;

    /// This vault is used to keep the referral tokens
    TokenVault public referralTokensVault;

    /// This vault is used to keep the team and founders tokens
    TokenVault public urbitTeamTokensVault;

    /// This vault is used to keep the bounty and marketing tokens
    TokenVault public bountyTokensVault;

    /// This vault is used to keep the advisors tokens
    TokenVault public advisorsTokensVault;

    /// This vault is used to keep the rewards tokens
    TokenVault public rewardsTokensVault;

    /// This vault is used to keep the retained tokens
    TokenVault public retainedTokensVault;

    /// Store the vesting contracts addresses
    mapping(address => address) public vestingOf;

    /// when the token sale is closed, the trading is open
    uint256 public saleClosedTimestamp = 0;

    /// Only allowed to execute before the token sale is closed
    modifier beforeSaleClosed {
        require(!saleClosed());
        _;
    }

    /// Limiting functions to the admins of the token only
    modifier onlyAdmin {
        require(msg.sender == urbitAdminAddress || msg.sender == address(this));
        _;
    }

    function UrbitToken(
        address _urbitAdminAddress,
        address _saleTokensAddress) public
    {
        require(_urbitAdminAddress != address(0));
        require(_saleTokensAddress != address(0));

        urbitAdminAddress = _urbitAdminAddress;
        saleTokensAddress = _saleTokensAddress;
    }

    /// @dev creates the tokens needed for sale
    function createSaleTokens() external onlyAdmin beforeSaleClosed {

        /// Maximum tokens to be allocated on the sale
        /// 191,502,887 URB
        createTokens(191502887, saleTokensAddress);

        /// Bonus tokens - 41,346,823 URB
        bonusTokensVault = createTokenVault(41346823);

        /// Referral tokens - 19,150,290 URB
        referralTokensVault = createTokenVault(19150290);
    }

    /// @dev Close the token sale
    function closeSale() external onlyAdmin beforeSaleClosed {
        createAwardTokens();
        saleClosedTimestamp = block.timestamp; // solium-disable-line security/no-block-members
    }

    /// @dev Once the token sale is closed and tokens are distributed,
    /// burn the remaining unsold, undistributed tokens
    function burnUnsoldTokens() external onlyAdmin {
        require(saleClosed());
        _burn(saleTokensAddress, balances[saleTokensAddress]);
        _burn(bonusTokensVault, balances[bonusTokensVault]);
        _burn(referralTokensVault, balances[referralTokensVault]);
    }

    function lockBonusTokens(address _beneficiary, uint256 _tokensAmount, uint256 _duration) external beforeSaleClosed {
        _presaleLock(bonusTokensVault, _beneficiary, _tokensAmount, _duration);
    }

    function lockReferralTokens(address _beneficiary, uint256 _tokensAmount, uint256 _duration) external beforeSaleClosed {
        _presaleLock(referralTokensVault, _beneficiary, _tokensAmount, _duration);
    }

    /// @dev Shorter version of vest tokens (lock for a single whole period)
    function lockTokens(address _fromVault, uint256 _tokensAmount, address _beneficiary, uint256 _unlockTime) external onlyAdmin {
        this.vestTokens(_fromVault, _tokensAmount, _beneficiary, _unlockTime, 0, 0, false); // solium-disable-line arg-overflow
    }

    /// @dev Vest tokens
    function vestTokens(
        address _fromVault,
        uint256 _tokensAmount,
        address _beneficiary,
        uint256 _start,
        uint256 _cliff,
        uint256 _duration,
        bool _revocable)
        external onlyAdmin
    {
        TokenVesting vesting = TokenVesting(vestingOf[_beneficiary]);
        if (vesting == address(0)) {
            vesting = new TokenVesting(_beneficiary, _start, _cliff, _duration, _revocable);
            vestingOf[_beneficiary] = address(vesting);
        }

        require(this.transferFrom(_fromVault, vesting, _tokensAmount));
    }

    /// @dev releases vested tokens for the caller's own address
    function releaseVestedTokens() external {
        this.releaseVestedTokensFor(msg.sender);
    }

    /// @dev releases vested tokens for the specified address.
    /// Can be called by any account for any address.
    function releaseVestedTokensFor(address _owner) external {
        TokenVesting tv = TokenVesting(vestingOf[_owner]);
        tv.release(ERC20Basic(address(this)));
    }

    /// @dev The sale is closed when the saleClosedTimestamp is set.
    function saleClosed() public view returns (bool) {
        return (saleClosedTimestamp > 0);
    }

    /// @dev check the locked balance of an owner
    function lockedBalanceOf(address _owner) public view returns (uint256) {
        return balances[vestingOf[_owner]];
    }

    /// @dev check the locked but releasable balance of an owner
    function releasableBalanceOf(address _owner) public view returns (uint256) {
        return TokenVesting(vestingOf[_owner]).releasableAmount(this);
    }

    /// @dev get the TokenVesting contract address for an owner
    function vestingOf(address _owner) public view returns (address) {
        return vestingOf[_owner];
    }

    /// @dev Trading limited - requires the token sale to have closed
    function transferFrom(address _from, address _to, uint256 _value) public returns (bool) {
        if (saleClosed()) {
            return super.transferFrom(_from, _to, _value);
        }
        return false;
    }

    /// @dev Trading is limited before sale is closed
    function transfer(address _to, uint256 _value) public returns (bool) {
        if (saleClosed() || msg.sender == saleTokensAddress) {
            return super.transfer(_to, _value);
        }
        return false;
    }

    // Allow for vesting of the Bonus and Referral vaults before
    // the sale is closed.
    function _presaleLock(TokenVault _fromVault, address _beneficiary, uint256 _tokensAmount, uint256 _duration) internal {
        require(!saleClosed());
        require(msg.sender == saleTokensAddress || msg.sender == urbitAdminAddress || msg.sender == address(this));
        TokenVesting vesting = TokenVesting(vestingOf[_beneficiary]);
        if (vesting == address(0)) {
            vesting = new PresaleTokenVesting(_beneficiary, _duration);
            vestingOf[_beneficiary] = address(vesting);
        }

        require(this.transferFrom(_fromVault, vesting, _tokensAmount));
    }

    // Can't be `onlyAdmin` because it's called from within the constructor
    // (when `this` is not yet available); `internal` is sufficient.
    function createTokens(uint32 count, address destination) internal {
        uint256 tokens = count * MAGNITUDE;
        totalSupply_ = totalSupply_.add(tokens);
        balances[destination] = tokens;
        emit Transfer(0x0, destination, tokens);
    }

    function createTokenVault(uint32 count) internal onlyAdmin returns (TokenVault) {
        TokenVault tokenVault = new TokenVault(ERC20(this));
        createTokens(count, tokenVault);
        tokenVault.fillUpAllowance();
        return tokenVault;
    }

    function createAwardTokens() internal onlyAdmin {
        /// Team tokens - 30M URB
        urbitTeamTokensVault = createTokenVault(30000000);

        /// Bounty tokens - 24M URB
        bountyTokensVault = createTokenVault(24000000);

        /// Advisors tokens - 24M URB
        advisorsTokensVault = createTokenVault(24000000);

        /// Rewards tokens - 150M URB
        rewardsTokensVault = createTokenVault(150000000);

        /// Retained tokens - 120M URB
        retainedTokensVault = createTokenVault(120000000);
    }
}
