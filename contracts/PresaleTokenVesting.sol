pragma solidity ^0.4.21;

import "openzeppelin-solidity/contracts/token/ERC20/TokenVesting.sol";
import "./UrbitToken.sol";


/**
 * @title PresaleTokenVesting
 * @dev PresaleTokenVesting allows for vesting periods which begin at
 * the time the token sale ends.
 */
contract PresaleTokenVesting is TokenVesting {

    constructor(address _beneficiary, uint256 _duration)
        TokenVesting(_beneficiary, 0, 0, _duration, false) public {
    }

//  function vestedAmount(ERC20Basic token) public view returns (uint256) {
//      UrbitToken urbit = UrbitToken(token); 
//      if(!urbit.saleClosed()) {
//          return(0);
//      }
//      else {
//          if (block.timestamp < cliff) {
//          }
//      }
//  }
}
