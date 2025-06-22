// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.20;

contract weth_usdc_lp_token{

    //events
    event Deposit(address indexed user, uint256 amount);
    event Approval(address indexed owner, address indexed spender, uint256 amount);
    event Withdraw(address indexed user, uint256 amount);
    event Transfer(address indexed from, address indexed to, uint256 amount);

    string public name= 'WETH-USDC CPAMM Token';
    string public symbol= 'WETH-USDC-CPAMM';
    uint256 public decimals= 18;

    mapping (address=> uint256) public balanceOf;
    mapping (address => mapping (address => uint256)) public allowance;

    function deposit() public payable{
        balanceOf[msg.sender] += msg.value;
        emit Deposit(msg.sender, msg.value);
    }

    function approve(address spender, uint256 amount) public returns(bool){
        allowance[msg.sender][spender]=amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function withdraw(uint256 amount) public{
        require(balanceOf[msg.sender] >= amount, "Insufficient Funds");
        balanceOf[msg.sender] -= amount;
        (bool success,)= payable(msg.sender).call{value:amount}("");
        require(success, "Transfer failed");
        emit Withdraw(msg.sender, amount);
    }

    function totalSupply() public view returns(uint256){
        return address(this).balance;
    }

    function transfer(address reciever, uint256 amount) public returns(bool){
        return transferFrom(msg.sender, reciever, amount);
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

    fallback() external payable {
        deposit();
    }
}