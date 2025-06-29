// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract LPToken{

    //events
    event Approval(address indexed owner, address indexed spender, uint256 amount);
    event Transfer(address indexed from, address indexed to, uint256 amount);

    string public name= 'WETH-USDC CPAMM Token';
    string public symbol= 'X-WETH-USDC';
    uint8 public decimals= 18;

    mapping (address=> uint256) public balanceOf;
    mapping (address => mapping (address => uint256)) public allowance; //changes blockchain state

    uint256 private _totalSupply;
    address private immutable amm;

    constructor() {
        amm= msg.sender;
    }
    
    modifier onlyAMM(){
        require(msg.sender == amm, "Only AMM can call this function");
        _;
    }

    function approve(address spender, uint256 amount) public returns(bool){
        allowance[msg.sender][spender]=amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function totalSupply() public view returns(uint256){
        return _totalSupply;
    }

    function transfer(address receiver, uint256 amount) public returns(bool){
        return transferFrom(msg.sender, receiver, amount);
    }

    function transferFrom(address from, address to, uint256 amount) public returns(bool){
        require(balanceOf[from] >= amount, "Insufficient funds");

        //handling allowance
        if(from != msg.sender && allowance[from][msg.sender] != type(uint256).max){// the second condition checks for max spending permission, in which case the allownace should never go down

        require(allowance[from][msg.sender] >= amount);
        allowance[from][msg.sender] -= amount;
        }

        balanceOf[from] -=amount;
        balanceOf[to] +=amount;

        emit Transfer(from, to, amount);
        return true;
    }

    function mint(address to, uint256 amount) external onlyAMM{
        balanceOf[to] += amount;
        _totalSupply += amount;
        emit Transfer(address(0), to, amount);

    }

    function burn(address from, uint256 amount) external onlyAMM{

        require(balanceOf[from] >= amount, "insufficient funds");
        balanceOf[from] -= amount;
        _totalSupply -= amount;
        emit Transfer(from, address(0), amount);
    }
}