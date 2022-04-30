// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Exchange {
    address public tokenAddress;

    constructor(address _token) {
        require(_token != address(0), "invalid token address");

        tokenAddress = _token;
    }

    // 为 ether-token 增加流动性
    function addLiquidity(uint _tokenAmount) public payable {
        IERC20 token = IERC20(tokenAddress);
        token.transferFrom(msg.sender, address(this), _tokenAmount);
    }

    // 合约内 token 余额
    function getReserve() public view returns (uint) {
        return IERC20(tokenAddress).balanceOf(address(this));
    }

    // 获取 token 价格: x + y = k
    function getPrice(uint inputReserve, uint outputReserve)
        public
        pure
        returns (uint)
    {
        require(inputReserve > 0 && outputReserve > 0, "invalid reserves");

        return (inputReserve * 1000) / outputReserve;
    }

    // 计算 eth和 token 数量变化：dy = ydx / y + dx
    function getAmount(uint inputAmount, uint inputReserve, uint outputReserve) private pure returns (uint) {
        require(inputReserve > 0 && outputReserve > 0, "invalid reserves");

        return (inputAmount * outputReserve) / (inputReserve + inputAmount);
    }

    function getTokenAmount(uint _ethSold) public view returns (uint) {
        require(_ethSold > 0, "ethSold is too small");
    
        uint tokenReserve = getReserve();

        return getAmount(_ethSold, address(this).balance, tokenReserve); 
    }

    function getEthAmount(uint _tokenSold) public view returns (uint) {
        require(_tokenSold > 0, "tokenSold is too small");

        uint tokenReserve = getReserve();

        return getAmount(_tokenSold, tokenReserve, address(this).balance);
    }
}
