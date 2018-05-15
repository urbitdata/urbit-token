pragma solidity ^0.4.23;


import "../TokenVault.sol";
import "openzeppelin-solidity/contracts/token/ERC20/StandardToken.sol";


// mock class using BasicToken
contract BasicTokenMock is StandardToken {

    TokenVault tv;

    constructor(address initialAccount, uint256 initialBalance) public {
        balances[initialAccount] = initialBalance;
        totalSupply_ = initialBalance;
    }

    function createTokenVault(uint32 amount) public {
        tv = new TokenVault(ERC20(this));
        balances[tv] = amount;
        totalSupply_ += amount;
    }

    function fillUpAllowance() public {
        tv.fillUpAllowance();
    }
}
