# Uniswap v1
## 简介

## 从 0 到 1
question1 - js : 
```js
beforeEach();
describe();
it();
```

question2 - js :
```js 
describe("addLiquidity", async () => {
```

error1 - solidity:
不能直接用除法计算 token 价格
```solidity
    function getPrice(uint inputReserve, int outputReserve)
        public
        pure
        returns (uint)
    {
        require(inputReserve > 0 && outputReserve > 0, "invalid reserves");
        // error: uint 会向下取整, 0.5 = 0
        return inputReserve / outputReserve;
    }
```