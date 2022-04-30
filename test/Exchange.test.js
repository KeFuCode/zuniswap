const { expect } = require("chai");
require("@nomiclabs/hardhat-waffle");

const toWei = (value) => ethers.utils.parseEther(value.toString());

const fromWei = (value) => ethers.utils.formatEther(
    typeof value == "string" ? value : value.toString()
);

describe("Exchange", () => {
    let token;
    let exchange;
    let user;
    
    beforeEach(async () => {
        [owner, user] = await ethers.getSigners();
    
        const Token = await ethers.getContractFactory('Token');
        token = await Token.deploy("Token", "TKN", toWei(1000000));
        await token.deployed();
    
        const Exchange = await ethers.getContractFactory('Exchange');
        exchange = await Exchange.deploy(token.address);
        await exchange.deployed();
    });
    
    it("is deployed", async() => {
        expect(await exchange.deployed()).to.equal(exchange);
    });

    describe("addLiquidity", async() => {
        it("add liquidity", async () => {
            await token.approve(exchange.address, toWei(2000));
            await exchange.addLiquidity(toWei(2000), { value: toWei(1000) });
    
            expect(await ethers.provider.getBalance(exchange.address)).to.equal(toWei(1000));
            expect(await exchange.getReserve()).to.equal(toWei(2000));
        });
    
        it("allow zero amounts", async() => {
            await token.approve(exchange.address, 0);
            await exchange.addLiquidity(0, { value: 0 });
    
            expect(await ethers.provider.getBalance(exchange.address)).to.equal(0);
            expect(await exchange.getReserve()).to.equal(0);
        });
    });
        
    describe("getTokenAmount", async () => {
        it("returns correct token amount", async () => {
        await token.approve(exchange.address, toWei(2000));
        await exchange.addLiquidity(toWei(2000), { value: toWei(1000) });
    
        let tokensOut = await exchange.getTokenAmount(toWei(1));
        expect(fromWei(tokensOut)).to.equal("1.998001998001998001");

        tokensOut = await exchange.getTokenAmount(toWei(100));
        expect(fromWei(tokensOut)).to.equal("181.818181818181818181");

        tokensOut = await exchange.getTokenAmount(toWei(1000));
        expect(fromWei(tokensOut)).to.equal("1000.0");
        });
    });
  
    describe("getEthAmount", async () => {
        it("returns correct eth amount", async () => {
        await token.approve(exchange.address, toWei(2000));
        await exchange.addLiquidity(toWei(2000), { value: toWei(1000) });
    
        let ethOut = await exchange.getEthAmount(toWei(2));
        expect(fromWei(ethOut)).to.equal("0.999000999000999");

        ethOut = await exchange.getEthAmount(toWei(100));
        expect(fromWei(ethOut)).to.equal("47.619047619047619047");

        ethOut = await exchange.getEthAmount(toWei(2000));
        expect(fromWei(ethOut)).to.equal("500.0");
        });
    });

    describe("ethToTokenSwap", async () => {
        // 增加流动性
        beforeEach(async () => {
            await token.approve(exchange.address, toWei(2000));
            await exchange.addLiquidity(toWei(2000), { value: toWei(1000) });
        });

        it("transfers at least min amount of tokens", async () => {
            const userBalanceBefore = await ethers.provider.getBalance(user.address);

            await exchange.connect(user).ethToTokenSwap(toWei(1.99), { value: toWei(1) });

            const userBalanceAfter = await ethers.provider.getBalance(user.address);
            expect(fromWei(userBalanceAfter - userBalanceBefore)).to.equal("-1.0001535161755238");

            const userTokenBalance = await token.balanceOf(user.address);
            expect(fromWei(userTokenBalance)).to.equal("1.998001998001998001");

            const exchangeEthBalance = await getBalance(exchange.address);
            expect(fromWei(exchangeEthBalance)).to.equal("1001.0");
      
            const exchangeTokenBalance = await token.balanceOf(exchange.address);
            expect(fromWei(exchangeTokenBalance)).to.equal("1998.001998001998001999");
        });

        it("fails when output amount is less than min amount", async () => {
            await expect(
                exchange.connect(user).ethToTokenSwap(toWei(2), { value: toWei(1) })
            ).to.be.revertedWith("insufficient output amount");
        });

        it("allows zero swaps", async () => {
            await expect(
                exchange.connect(user).ethToTokenSwap(toWei(0), { value: toWei(0) })
            ).to.be.revertedWith("insufficient output amount");
        
            const userTokenBalance = await token.balanceOf(user.address);
            expect(fromWei(userTokenBalance)).to.equal("0.0");
        
            const exchangeEthBalance = await ethers.provider.getBalance(exchange.address);
            expect(fromWei(exchangeEthBalance)).to.equal("1000.0");
        
            const exchangeTokenBalance = await token.balanceOf(exchange.address);
            expect(fromWei(exchangeTokenBalance)).to.equal("2000.0");
        });
    });

    describe("tokenToEthSwap", async() => {
        beforeEach(async () => {
            await token.transfer(user.address, toWei(2));
            await token.connect(user).approve(exchange.address, toWei(2));
      
            await token.approve(exchange.address, toWei(2000));
            await exchange.addLiquidity(toWei(2000), { value: toWei(1000) });
        });

        it("transfers at least min amount of tokens", async () => {
            const userBalanceBefore = await ethers.provider.getBalance(user.address);

            await exchange.connect(user).tokenToEthSwap(toWei(2), toWei(0.9));
      
            const userBalanceAfter = await ethers.provider.getBalance(user.address);
            expect(fromWei(userBalanceAfter - userBalanceBefore)).to.equal(
              "0.9989467686641336"
            );
      
            const userTokenBalance = await token.balanceOf(user.address);
            expect(fromWei(userTokenBalance)).to.equal("0.0");
      
            const exchangeEthBalance = await ethers.provider.getBalance(exchange.address);
            expect(fromWei(exchangeEthBalance)).to.equal("999.000999000999001");
      
            const exchangeTokenBalance = await token.balanceOf(exchange.address);
            expect(fromWei(exchangeTokenBalance)).to.equal("2002.0");
        });

        it("fails when output amount is less than min amount", async ()=> {
            await expect(
                exchange.connect(user).tokenToEthSwap(toWei(2), toWei(1.0))
            ).to.be.revertedWith("insufficient output amount");
        });

        it("allows zero swaps", async () => {
            await expect(
                exchange.connect(user).tokenToEthSwap(toWei(0), toWei(0))
            ).to.be.revertedWith("insufficient output amount");

            const userBalance = await ethers.provider.getBalance(user.address);
            expect(fromWei(userBalance)).to.equal("9999.99847532859645519");
      
            const userTokenBalance = await token.balanceOf(user.address);
            expect(fromWei(userTokenBalance)).to.equal("2.0");
      
            const exchangeEthBalance = await ethers.provider.getBalance(exchange.address);
            expect(fromWei(exchangeEthBalance)).to.equal("1000.0");
      
            const exchangeTokenBalance = await token.balanceOf(exchange.address);
            expect(fromWei(exchangeTokenBalance)).to.equal("2000.0");
        });
    });
});