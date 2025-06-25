// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";


contract MockERC20 is ERC20{
    
    uint8 private _decimals;

    constructor (
        string memory name,
        string memory symbol,
        uint8 _decimals_,
        uint256 initialSupply) ERC20(name, symbol) {
            _decimals= _decimals_;
            _mint(msg.sender, initialSupply);            
    }

    function decimals() public view virtual override returns(uint8){
        return _decimals;
    }   

    function mint(address to, uint256 amount) external{
        _mint(to, amount);
    }
}