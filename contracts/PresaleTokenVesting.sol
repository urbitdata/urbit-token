pragma solidity ^0.4.21;

import "openzeppelin-solidity/contracts/token/ERC20/TokenVesting.sol";
import "./UrbitToken.sol";


/**
 * @title PresaleTokenVesting
 * @dev PresaleTokenVesting allows for vesting periods which begin at
 * the time the token sale ends.
 */
contract PresaleTokenVesting is TokenVesting {

    function PresaleTokenVesting(address _beneficiary, uint256 _duration) TokenVesting(_beneficiary, 0, _duration, _duration, false) public {
    }

    function vestedAmount(ERC20Basic token) public view returns (uint256) {
        UrbitToken urbit = UrbitToken(token); 
        if (!urbit.saleClosed()) {
            return(0);
        } else {
            uint256 currentBalance = token.balanceOf(this);
            uint256 totalBalance = currentBalance.add(released[token]);
            uint256 saleClosedTime = urbit.saleClosedTimestamp();
            if (block.timestamp >= duration.add(saleClosedTime)) { // solium-disable-line security/no-block-members
                return totalBalance;
            } else {
                return totalBalance.mul(block.timestamp.sub(saleClosedTime)).div(duration); // solium-disable-line security/no-block-members

            }
        }
    }
}
