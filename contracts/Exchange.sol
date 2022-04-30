// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Exchange is ERC20 {
    address public tokenAddress;

    constructor(address _token) ERC20("Zuniswap-V1", "ZUNI-V1") {
        require(_token != address(0), "invalid token address");

        tokenAddress = _token;
    }

    // 为 ether-token 增加流动性
    function addLiquidity(uint _tokenAmount) public payable returns (uint) {
        if (getReserve() == 0) {
            IERC20 token = IERC20(tokenAddress);
            token.transferFrom(msg.sender, address(this), _tokenAmount);

            uint liquidity = address(this).balance;
            _mint(msg.sender, liquidity);

            return liquidity;
        } else {
            uint ethReserve = address(this).balance - msg.value;
            uint tokenReserve = getReserve();
            uint tokenAmount = (msg.value * tokenReserve) / ethReserve;
            require(_tokenAmount >= tokenAmount, "insufficient token amount");

            IERC20 token = IERC20(tokenAddress);
            token.transferFrom(msg.sender, address(this), _tokenAmount);

            uint liquidity = (totalSupply() * msg.value) / ethReserve;
            _mint(msg.sender, liquidity);
            
            return liquidity;
        }
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
    function getAmount(
        uint inputAmount,
        uint inputReserve,
        uint outputReserve
    ) private pure returns (uint) {
        require(inputReserve > 0 && outputReserve > 0, "invalid reserves");

        return (inputAmount * outputReserve) / (inputReserve + inputAmount);
    }

    // 输入 eth 数量，返回对应的 token 数量
    function getTokenAmount(uint _ethSold) public view returns (uint) {
        require(_ethSold > 0, "ethSold is too small");

        uint tokenReserve = getReserve();

        return getAmount(_ethSold, address(this).balance, tokenReserve);
    }

    // 输入 token 数量，返回对应的 eth 数量
    function getEthAmount(uint _tokenSold) public view returns (uint) {
        require(_tokenSold > 0, "tokenSold is too small");

        uint tokenReserve = getReserve();

        return getAmount(_tokenSold, tokenReserve, address(this).balance);
    }

    // 将 eth 兑换为 token：输入参数为希望获得的最小 token 数量，
    function ethToTokenSwap(uint _minTokens) public payable {
        uint tokenReserve = getReserve();
        uint tokensBought = getAmount(
            msg.value,
            address(this).balance - msg.value,
            tokenReserve
        );

        require(tokensBought > _minTokens, "insufficient output amount");

        IERC20(tokenAddress).transfer(msg.sender, tokensBought);
    }

    // 将 token 兑换为 eth：输入参数为 token 数量，希望获得的最少 eth数量
    function tokenToEthSwap(uint _tokenSold, uint _minEth) public {
        uint tokenReserve = getReserve();
        uint ethBought = getAmount(
            _tokenSold,
            tokenReserve,
            address(this).balance
        );

        require(ethBought > _minEth, "insufficient output amount");

        IERC20(tokenAddress).transferFrom(
            msg.sender,
            address(this),
            _tokenSold
        );
        payable(msg.sender).transfer(ethBought);
    }
}
