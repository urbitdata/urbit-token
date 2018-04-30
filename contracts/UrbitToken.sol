pragma solidity ^0.4.21;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/StandardToken.sol";
import "openzeppelin-solidity/contracts/token/ERC20/BurnableToken.sol";
import "openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";
import "./TokenVault.sol";
import "./TokenVesting.sol";


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

    /// This address is used to manage the admin functions and allocate vested tokens
    address public urbitAdminAddress;

    /// This address is used to keep the tokens for sale
    address public saleTokensAddress;

    /// This address is used to keep the referral tokens
    address public referralTokensAddress;

    /// This address is used to keep the bonus tokens
    address public bonusTokensAddress;

    /// Store the vesting contracts addresses
    mapping(address => address) public vestingOf;

    /// when the token sale is closed, the trading is open
    bool public saleClosed = false;

    /// Only allowed to execute before the token sale is closed
    modifier beforeSaleClosed {
        require(!saleClosed);
        _;
    }

    /// Limiting functions to the admins of the token only
    modifier onlyAdmin {
        require(msg.sender == urbitAdminAddress || msg.sender == address(this));
        _;
    }

    function UrbitToken(address _urbitAdminAddress, address _bonusTokensAddress, address _saleTokensAddress, address _referralTokensAddress) public {
        require(_urbitAdminAddress != address(0));
        require(_bonusTokensAddress != address(0));
        require(_saleTokensAddress != address(0));
        require(_referralTokensAddress != address(0));

        urbitAdminAddress = _urbitAdminAddress;
        bonusTokensAddress = _bonusTokensAddress;
        saleTokensAddress = _saleTokensAddress;
        referralTokensAddress = _referralTokensAddress;

        /// Maximum tokens to be allocated on the sale
        /// 191,502,887 URB
        createTokens(191502887, saleTokensAddress);

        /// Referral tokens - 19,150,290 URB
        createTokens(19150290, referralTokensAddress);

        /// Bonus tokens - 41,346,823 URB
        createTokens(41346823, bonusTokensAddress);
    }

    /// @dev Close the token sale
    function closeSale() external onlyAdmin beforeSaleClosed {
        createVestableTokens();
        saleClosed = true;
    }

    /// @dev Shorter version of vest tokens (lock for a single whole period)
    function lockTokens(address _fromVault, uint256 _tokensAmount, address _beneficiary, uint256 _unlockTime) external onlyAdmin {
        this.vestTokens(_fromVault, _tokensAmount, _beneficiary, _unlockTime, 0, 0, false); // solium-disable-line arg-overflow
    }

    /// @dev Vest tokens
    function vestTokens(address _fromVault, uint256 _tokensAmount, address _beneficiary, uint256 _start, uint256 _cliff, uint256 _duration, bool _revocable) external onlyAdmin { // solium-disable-line arg-overflow
        TokenVesting vesting = TokenVesting(vestingOf[_beneficiary]);
        if (vesting == address(0)) {
            vesting = new TokenVesting(_beneficiary, _start, _cliff, _duration, _revocable);
            vestingOf[_beneficiary] = address(vesting);
        }

        require(this.transferFrom(_fromVault, vesting, _tokensAmount));
    }

    /// @dev check the locked balance of an owner
    function lockedBalanceOf(address _owner) public view returns (uint256) {
        return balances[vestingOf[_owner]];
    }

    /// @dev check the locked but releaseable balance of an owner
    function releaseableBalanceOf(address _owner) public view returns (uint256) {
        return TokenVesting(vestingOf[_owner]).vestedAmount(this);
    }

    /// @dev get the TokenTimelock contract address for an owner
    function vestingOf(address _owner) public view returns (address) {
        return vestingOf[_owner];
    }

    /// @dev Trading limited - requires the token sale to have closed
    function transferFrom(address _from, address _to, uint256 _value) public returns (bool) {
        if (saleClosed) {
            return super.transferFrom(_from, _to, _value);
        }
        return false;
    }

    /// @dev Trading limited - requires the token sale to have closed
    function transfer(address _to, uint256 _value) public returns (bool) {
        if (saleClosed || msg.sender == saleTokensAddress || msg.sender == referralTokensAddress || msg.sender == bonusTokensAddress) {
            return super.transfer(_to, _value);
        }
        return false;
    }

    function calcTokens(uint32 count) internal pure returns (uint256) {
        return count * MAGNITUDE;
    }

    // Can't be `onlyAdmin` because it's called from within the constructor
    // (when `this` is not yet available); `internal` is sufficient.
    function createTokens(uint32 count, address destination) internal {
        uint256 tokens = calcTokens(count);
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

    function createVestableTokens() internal onlyAdmin {
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

        require(totalSupply_ <= HARD_CAP);
    }
}
