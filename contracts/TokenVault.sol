pragma solidity ^0.4.21;

import "openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";


/**
 * @title TokenVault
 * @dev TokenVault is a token holder contract that will allow a
 * beneficiary to spend the tokens from some function of a specified ERC20 token
 */
contract TokenVault {
    using SafeERC20 for ERC20;

    // ERC20 token contract being held
    ERC20 public token;

    constructor(ERC20 _token) public {
        token = _token;
    }

    /**
     * @notice increase the allowance to the full amount of tokens held
     */
    function fillUpAllowance() public {
        uint256 amount = token.balanceOf(this);
        require(amount > 0);

        token.approve(token, amount);
    }
}
