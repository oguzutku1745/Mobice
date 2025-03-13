// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";

contract WETH is ERC20 {
    constructor() ERC20("Wrapped Ether", "WETH") {}

    function deposit() external payable {
        _mint(msg.sender, msg.value);
    }

    function withdraw(uint256 amount) external {
        require(balanceOf(msg.sender) >= amount, "Insufficient WETH balance");
        _burn(msg.sender, amount);
        payable(msg.sender).transfer(amount);
    }
}

contract MockUniswapFactory {
    address public mockPair;
    
    function createPair(address tokenA, address tokenB) external returns (address) {
        mockPair = address(uint160(uint(keccak256(abi.encodePacked(tokenA, tokenB, block.timestamp)))));
        return mockPair;
    }
}

contract MockUniswapRouter is IUniswapV2Router02 {
    address private immutable _weth;
    address private immutable _factory;
    
    constructor(address wethAddress) {
        _weth = wethAddress;
        MockUniswapFactory mockFactory = new MockUniswapFactory();
        _factory = address(mockFactory);
    }
    
    function factory() external pure override returns (address) {
        return address(0x1111111111111111111111111111111111111111); // Return a fixed address
    }
    
    function WETH() external pure override returns (address) {
        return address(0x2222222222222222222222222222222222222222); // Return a fixed address
    }
    
    // For testing, we'll override these with actual implementations
    function getFactory() external view returns (address) {
        return _factory;
    }
    
    function getWETH() external view returns (address) {
        return _weth;
    }
    
    function addLiquidity(
        address tokenA,
        address tokenB,
        uint amountADesired,
        uint amountBDesired,
        uint amountAMin,
        uint amountBMin,
        address to,
        uint deadline
    ) external override returns (uint amountA, uint amountB, uint liquidity) {
        // Mock implementation - just return the desired amounts
        return (amountADesired, amountBDesired, amountADesired);
    }
    
    function addLiquidityETH(
        address token,
        uint amountTokenDesired,
        uint amountTokenMin,
        uint amountETHMin,
        address to,
        uint deadline
    ) external payable override returns (uint amountToken, uint amountETH, uint liquidity) {
        return (amountTokenDesired, msg.value, amountTokenDesired);
    }
    
    // Implement the rest of the interface with minimal functionality
    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint liquidity,
        uint amountAMin,
        uint amountBMin,
        address to,
        uint deadline
    ) external override returns (uint amountA, uint amountB) {
        return (0, 0);
    }
    
    function removeLiquidityETH(
        address token,
        uint liquidity,
        uint amountTokenMin,
        uint amountETHMin,
        address to,
        uint deadline
    ) external override returns (uint amountToken, uint amountETH) {
        return (0, 0);
    }
    
    function removeLiquidityWithPermit(
        address tokenA,
        address tokenB,
        uint liquidity,
        uint amountAMin,
        uint amountBMin,
        address to,
        uint deadline,
        bool approveMax, uint8 v, bytes32 r, bytes32 s
    ) external override returns (uint amountA, uint amountB) {
        return (0, 0);
    }
    
    function removeLiquidityETHWithPermit(
        address token,
        uint liquidity,
        uint amountTokenMin,
        uint amountETHMin,
        address to,
        uint deadline,
        bool approveMax, uint8 v, bytes32 r, bytes32 s
    ) external override returns (uint amountToken, uint amountETH) {
        return (0, 0);
    }
    
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external override returns (uint[] memory amounts) {
        uint[] memory result = new uint[](path.length);
        return result;
    }
    
    function swapTokensForExactTokens(
        uint amountOut,
        uint amountInMax,
        address[] calldata path,
        address to,
        uint deadline
    ) external override returns (uint[] memory amounts) {
        uint[] memory result = new uint[](path.length);
        return result;
    }
    
    function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline)
        external
        payable
        override
        returns (uint[] memory amounts) {
        uint[] memory result = new uint[](path.length);
        return result;
    }
    
    function swapTokensForExactETH(uint amountOut, uint amountInMax, address[] calldata path, address to, uint deadline)
        external
        override
        returns (uint[] memory amounts) {
        uint[] memory result = new uint[](path.length);
        return result;
    }
    
    function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline)
        external
        override
        returns (uint[] memory amounts) {
        uint[] memory result = new uint[](path.length);
        return result;
    }
    
    function swapETHForExactTokens(uint amountOut, address[] calldata path, address to, uint deadline)
        external
        payable
        override
        returns (uint[] memory amounts) {
        uint[] memory result = new uint[](path.length);
        return result;
    }
    
    function quote(uint amountA, uint reserveA, uint reserveB) external pure override returns (uint amountB) {
        return 0;
    }
    
    function getAmountOut(uint amountIn, uint reserveIn, uint reserveOut) external pure override returns (uint amountOut) {
        return 0;
    }
    
    function getAmountIn(uint amountOut, uint reserveIn, uint reserveOut) external pure override returns (uint amountIn) {
        return 0;
    }
    
    function getAmountsOut(uint amountIn, address[] calldata path) external view override returns (uint[] memory amounts) {
        uint[] memory result = new uint[](path.length);
        return result;
    }
    
    function getAmountsIn(uint amountOut, address[] calldata path) external view override returns (uint[] memory amounts) {
        uint[] memory result = new uint[](path.length);
        return result;
    }
    
    function removeLiquidityETHSupportingFeeOnTransferTokens(
        address token,
        uint liquidity,
        uint amountTokenMin,
        uint amountETHMin,
        address to,
        uint deadline
    ) external override returns (uint amountETH) {
        return 0;
    }
    
    function removeLiquidityETHWithPermitSupportingFeeOnTransferTokens(
        address token,
        uint liquidity,
        uint amountTokenMin,
        uint amountETHMin,
        address to,
        uint deadline,
        bool approveMax, uint8 v, bytes32 r, bytes32 s
    ) external override returns (uint amountETH) {
        return 0;
    }
    
    function swapExactTokensForTokensSupportingFeeOnTransferTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external override {
        // No implementation needed
    }
    
    function swapExactETHForTokensSupportingFeeOnTransferTokens(
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external payable override {
        // No implementation needed
    }
    
    function swapExactTokensForETHSupportingFeeOnTransferTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external override {
        // No implementation needed
    }
}
