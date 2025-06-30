"use client"

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import { Address, formatUnits, parseUnits } from 'viem';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract, useBalance } from 'wagmi';
import { AMM_ABI } from '@/lib/abis';

// Constants
const CONTRACTS = {
    AMM: process.env.NEXT_PUBLIC_AMM_CONTRACT_ADDRESS as Address,
    LP_TOKEN: process.env.NEXT_PUBLIC_LP_TOKEN_ADDRESS as Address,
    WETH: '0x4200000000000000000000000000000000000006' as Address,
    USDC: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as Address,
} as const;

const DECIMALS = {
    WETH: 18,
    USDC: 6,
    LP: 18,
} as const;

const FEE_RATE = 997; // 0.3% fee = 997/1000
const FEE_DENOMINATOR = 1000;
const EPSILON = 1000; 

const INITIAL_MOCK_RESERVES = {
    RESERVE_0: 1000,
    RESERVE_1: 2500000,
} as const;

const INITIAL_MOCK_BALANCES = {
    WETH: 10.5,
    USDC: 25000,
    LP_TOKEN: 100,
} as const;

// Calculate initial LP supply: sqrt(reserve0 * reserve1)
const INITIAL_LP_SUPPLY = Math.sqrt(INITIAL_MOCK_RESERVES.RESERVE_0 * INITIAL_MOCK_RESERVES.RESERVE_1);

type AMMMode = 'mock' | 'live';

interface PoolState {
    token0Address: string;
    token1Address: string;
    reserve0: number;
    reserve1: number;
    ratio: number;
    totalLPSupply: number;
    token0ExchangeRate: number;
    token1ExchangeRate: number;
}

interface UserBalances{
    weth: number;
    usdc: number;
    lpToken: number;
}

interface TransactionStatus {
    hash: string;
    type: 'swap' | 'addLiquidity' | 'removeLiquidity';
    isPending: boolean;
    isConfirmed: boolean;
    result?: any;
}

interface RemovalAmounts {
    amount0: number;
    amount1: number;
}

interface AMMContextType {
    mode: AMMMode;
    toggleMode: () => void;
    isMockMode: boolean;
    isLiveMode: boolean;

    poolState: PoolState;
    userBalances: UserBalances;
    
    k: number;
    currentPrice: number;
    
    getSwapEstimate: (tokenIn: 'WETH' | 'USDC', amountIn: number) => number;
    executeSwap: (tokenIn: 'WETH' | 'USDC', amountIn: number) => Promise<number >;
    addLiquidity: (amount0: number, amount1: number) => Promise<number>;
    removeLiquidity: (shares: number) => Promise<{ reserve0: number; reserve1: number }>;
    calculateRemovalAmounts: (shares: number) => RemovalAmounts;

    resetPool: () => void;
    refreshUserBalances: () => void;    //only for Live Mode
    
    isLoading: boolean;
    error: string | null;
    pendingTransaction: TransactionStatus | null;
}

interface TransactionResult {
    hash: string;
    result?: any;
}

const AMMContext = createContext<AMMContextType | undefined>(undefined);

export function AMMProvider({ children }: { children: ReactNode }) {

    const {address, isConnected}= useAccount();

    //Mode State
    const [mode, setMode] =useState<AMMMode>('mock'); //NEED TO CHANGE TO LIVE FOR PRODUCTION

    const [mockPoolState, setMockPoolState] = useState<PoolState>({
        token0Address: CONTRACTS.WETH, 
        token1Address: CONTRACTS.USDC, 
        reserve0: INITIAL_MOCK_RESERVES.RESERVE_0, 
        reserve1: INITIAL_MOCK_RESERVES.RESERVE_1, 
        ratio: INITIAL_MOCK_RESERVES.RESERVE_1 / INITIAL_MOCK_RESERVES.RESERVE_0, 
        totalLPSupply: INITIAL_LP_SUPPLY,
        token0ExchangeRate: INITIAL_MOCK_RESERVES.RESERVE_1 / INITIAL_MOCK_RESERVES.RESERVE_0, // Price of WETH in USDC
        token1ExchangeRate: INITIAL_MOCK_RESERVES.RESERVE_0 / INITIAL_MOCK_RESERVES.RESERVE_1, // Price of USDC in WETH    
    });

    const [mockUserBalances, setMockUserBalances] =useState<UserBalances>({
        weth: INITIAL_MOCK_BALANCES.WETH,
        usdc: INITIAL_MOCK_BALANCES.USDC,
        lpToken: INITIAL_MOCK_BALANCES.LP_TOKEN,
    })

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pendingTransaction, setPendingTransaction] = useState<TransactionStatus | null>(null);

    const { writeContract, data: hash, isPending: isWritePending } = useWriteContract();    // for state changing function interactions
    const { isLoading: isConfirming, isSuccess: isConfirmed, data: receipt } = useWaitForTransactionReceipt({ 
        hash,
        query: {
            enabled: !!hash
        }
    });     //tracks transaction status
    const { data: livePoolStateRaw, isLoading: isPoolLoading, refetch: refetchPoolState } = useReadContract({
        address: CONTRACTS.AMM,
        abi: AMM_ABI,
        functionName: 'getPoolState',   //get all data of the AMM contract
        query: {
            enabled: mode === 'live',
            refetchInterval: mode === 'live' ? 5000 : false, // Auto-refresh every 5 seconds
        }
    });

    // fetching Weth, usdc and lpTokens
    const { data: wethBalance, refetch: refetchWETH } = useBalance({
        address: address,   //user address
        token: CONTRACTS.WETH,
        query: { 
          enabled: mode === 'live' && isConnected,
          refetchInterval: false    //no auto-refresh for user balances
        }
    });

    const { data: usdcBalance, refetch: refetchUSDC } = useBalance({
        address: address,
        token: CONTRACTS.USDC,
        query: { 
          enabled: mode === 'live' && isConnected,
          refetchInterval: false 
        }
    });

    const { data: lpTokenBalance, refetch: refetchLP } = useBalance({
        address: address,
        token: CONTRACTS.LP_TOKEN,
        query: { 
          enabled: mode === 'live' && isConnected,
          refetchInterval: false 
        }
    });

    //This function sets the live pool values
    const livePoolState: PoolState | null = useMemo(() => {

        if (!livePoolStateRaw || mode !== 'live') return null;

        const [token0Address, token1Address, reserve0, reserve1, ratio, totalLPSupply, token0ExchangeRate, token1ExchangeRate] = livePoolStateRaw as any[];
        return {
            token0Address,
            token1Address,
            reserve0: Number(formatUnits(reserve0, DECIMALS.WETH)),
            reserve1: Number(formatUnits(reserve1, DECIMALS.USDC)),
            ratio: Number(formatUnits(ratio, DECIMALS.WETH)),
            totalLPSupply: Number(formatUnits(totalLPSupply, DECIMALS.LP)),
            token0ExchangeRate: Number(formatUnits(token0ExchangeRate, DECIMALS.WETH)),
            token1ExchangeRate: Number(formatUnits(token1ExchangeRate, DECIMALS.WETH)),
        };
    }, [livePoolStateRaw, mode]);

    const liveUserBalances: UserBalances = useMemo(() => {

        if (mode !== 'live' || !isConnected) {
            return { weth: 0, usdc: 0, lpToken: 0 };
        }

        return {
            weth: wethBalance ? Number(formatUnits(wethBalance.value, DECIMALS.WETH)) : 0,
            usdc: usdcBalance ? Number(formatUnits(usdcBalance.value, DECIMALS.USDC)) : 0,
            lpToken: lpTokenBalance ? Number(formatUnits(lpTokenBalance.value, DECIMALS.LP)) : 0,
        };
    }, [wethBalance, usdcBalance, lpTokenBalance, mode, isConnected]);   

    const poolState = useMemo(() => {
        if (mode === 'mock') {
            return mockPoolState;
        }
        
        if (mode === 'live') {
            if (livePoolState) {
                return livePoolState;
            }
            
            // If live mode but no data yet (loading), return empty state
            if (isPoolLoading) {
                return {
                    token0Address: CONTRACTS.WETH,
                    token1Address: CONTRACTS.USDC,
                    reserve0: 0,
                    reserve1: 0,
                    ratio: 0,
                    totalLPSupply: 0,
                    token0ExchangeRate: 0,
                    token1ExchangeRate: 0,
                };
            }
            
            // If live mode failed to load data, show error state
            return {
                token0Address: CONTRACTS.WETH,
                token1Address: CONTRACTS.USDC,
                reserve0: 0,
                reserve1: 0,
                ratio: 0,
                totalLPSupply: 0,
                token0ExchangeRate: 0,
                token1ExchangeRate: 0,
            };
        }        
        // Fallback
        return mockPoolState;
    }, [mode, mockPoolState, livePoolState, isPoolLoading]);

    const userBalances = mode === 'mock' ? mockUserBalances : liveUserBalances;

    const k = poolState.reserve0 * poolState.reserve1;
    const currentPrice = poolState.reserve0 > 0 ? poolState.reserve1 / poolState.reserve0 : 0;

    //Toggle
    const toggleMode = useCallback(() => {
        setMode(prev => prev === 'mock' ? 'live' : 'mock');
        setError(null);
        setPendingTransaction(null);
    }, []);

    const refreshUserBalances = useCallback(() => {
        if (mode === 'live' && isConnected) {
            refetchWETH();
            refetchUSDC();
            refetchLP();
        }
    }, [mode, isConnected, refetchWETH, refetchUSDC, refetchLP]);

    // Helper functions
    const validateBalance = useCallback((tokenType: 'WETH' | 'USDC', amount: number) => {
        const balance = tokenType === 'WETH' ? userBalances.weth : userBalances.usdc;
        if (balance < amount) {
            throw new Error(`Insufficient ${tokenType} balance. Required: ${amount}, Available: ${balance.toFixed(6)}`);
        }
    }, [userBalances]);

    const calculateFeeAdjustedAmount = useCallback((amount: number): number => {
        return (amount * FEE_RATE) / FEE_DENOMINATOR;
    }, []);

    // Handle transaction hash updates
    useEffect(() => {
        if (hash && pendingTransaction && !pendingTransaction.hash) {
            setPendingTransaction(prev => prev ? { ...prev, hash } : null);
        }
    }, [hash, pendingTransaction]);

    // FUNCTION REPLICAS OF THE CONTRACT

    const sqrt = (x: number): number => {
        if (x === 0) return 0;
        if (x === 1) return 1;
        let z = x;
        let y = Math.floor(x / 2) + 1;
        while (y < z) {
        z = y;
        y = Math.floor((Math.floor(x / y) + y) / 2);
        }
        return z;
    };

    const min = (x: number, y: number): number => x < y ? x : y;

    const getSwapEstimate = useCallback((tokenIn: 'WETH' | 'USDC', amountIn: number): number => {

        if (amountIn <= 0) return 0;
    
        const isToken0 = tokenIn === 'WETH';
        const reserveIn = isToken0 ? poolState.reserve0 : poolState.reserve1;
        const reserveOut = isToken0 ? poolState.reserve1 : poolState.reserve0;
        
        // Apply 0.3% fee (997/1000)
        const amountInWithFee = calculateFeeAdjustedAmount(amountIn);
        
        const amountOut = (reserveOut * amountInWithFee) / (reserveIn + amountInWithFee);
        
        return amountOut;
    }, [poolState, calculateFeeAdjustedAmount]);

    const calculateRemovalAmounts = useCallback((shares: number): RemovalAmounts => {
        if (shares <= 0) {
            return { amount0: 0, amount1: 0 };
        }

        if (poolState.totalLPSupply <= 0) {
            return { amount0: 0, amount1: 0 };
        }

        // Calculate proportional amounts based on current reserves
        const amount0 = (shares * poolState.reserve0) / poolState.totalLPSupply;
        const amount1 = (shares * poolState.reserve1) / poolState.totalLPSupply;

        return {
            amount0,
            amount1
        };
    }, [poolState]);

    const executeSwap = useCallback(async (tokenIn: 'WETH' | 'USDC', amountIn: number): Promise<number> => {
        setIsLoading(true);
        setError(null);
    
        try {
            if (amountIn <= 0) {
                throw new Error('AMM: Invalid amount');
            }
    
            if (mode === 'mock') {
                validateBalance(tokenIn, amountIn);
        
                const isToken0 = tokenIn === 'WETH';
                const reserveIn = isToken0 ? mockPoolState.reserve0 : mockPoolState.reserve1;
                const reserveOut = isToken0 ? mockPoolState.reserve1 : mockPoolState.reserve0;
                
                const amountInWithFees = calculateFeeAdjustedAmount(amountIn);   //0.3 percent fees
                const amountOut = (reserveOut * amountInWithFees) / (reserveIn + amountInWithFees);
        
                if (amountOut <= 0) {
                    throw new Error('AMM: Invalid amount out');
                }
                
                await new Promise(resolve => setTimeout(resolve, 1000));
        
                const newReserve0 = isToken0 ? reserveIn + amountIn : reserveOut - amountOut;
                const newReserve1 = isToken0 ? reserveOut - amountOut : reserveIn + amountIn;
        
                setMockPoolState(prev => ({
                ...prev,
                reserve0: newReserve0,
                reserve1: newReserve1,
                ratio: newReserve0 > 0 ? newReserve1 / newReserve0 : 0,
                token0ExchangeRate: newReserve0 > 0 ? newReserve1 / newReserve0 : 0,
                token1ExchangeRate: newReserve1 > 0 ? newReserve0 / newReserve1 : 0,
                }));
        
                setMockUserBalances(prev => ({
                ...prev,
                weth: tokenIn === 'WETH' ? prev.weth - amountIn : prev.weth + amountOut,
                usdc: tokenIn === 'USDC' ? prev.usdc - amountIn : prev.usdc + amountOut,
                }));
        
                return amountOut;

            } else {

                // Live mode implementation
                if (!isConnected) {
                throw new Error('Please connect your wallet');
                }
        
                const tokenInAddress = tokenIn === 'WETH' ? CONTRACTS.WETH : CONTRACTS.USDC;
                const decimals = tokenIn === 'WETH' ? DECIMALS.WETH : DECIMALS.USDC;
                const parsedAmount = parseUnits(amountIn.toString(), decimals);
        
                setPendingTransaction({
                    hash: '',
                    type: 'swap',
                    isPending: true,
                    isConfirmed: false,
                });

                writeContract({
                address: CONTRACTS.AMM,
                abi: AMM_ABI,
                functionName: 'swap',
                args: [tokenInAddress, parsedAmount],
                });
        
                return getSwapEstimate(tokenIn, amountIn);   
            }
            } catch (err: any) {
            setError(err.message);
            throw err;
            } finally {
            setIsLoading(false);
        }
    }, [mode, mockPoolState, mockUserBalances, isConnected, writeContract, validateBalance, calculateFeeAdjustedAmount, getSwapEstimate, setMockPoolState, setMockUserBalances]);

    const addLiquidity = useCallback(async (amount0: number, amount1: number): Promise<number> => {
        setIsLoading(true);
        setError(null);
    
        try {
            if (amount0 <= 0 || amount1 <= 0) {
                throw new Error('AMM: Invalid reserve values');
            }
        
            if (mode === 'mock') {
                validateBalance('WETH', amount0);
                validateBalance('USDC', amount1);
        
                let shares: number;
        
                if (mockPoolState.totalLPSupply === 0) {
                shares = sqrt(amount0 * amount1);
                } 
                else {
                    const left = mockPoolState.reserve0 * amount1;
                    const right = mockPoolState.reserve1 * amount0;
                    const diff = Math.abs(left - right);
                    if (diff > EPSILON) {
                        throw new Error('Invalid ratio');
                    }
                    
                    const shares0 = (amount0 * mockPoolState.totalLPSupply) / mockPoolState.reserve0;
                    const shares1 = (amount1 * mockPoolState.totalLPSupply) / mockPoolState.reserve1;
                    shares = min(shares0, shares1);
                }
        
                if (shares <= 0) {
                throw new Error('AMM: Invalid shares');
                }

                // Simulate transaction delay
                await new Promise(resolve => setTimeout(resolve, 1500));
                
                setMockPoolState(prev => ({
                ...prev,
                reserve0: prev.reserve0 + amount0,
                reserve1: prev.reserve1 + amount1,
                totalLPSupply: prev.totalLPSupply + shares,
                ratio: (prev.reserve1 + amount1) / (prev.reserve0 + amount0),
                token0ExchangeRate: (prev.reserve1 + amount1) / (prev.reserve0 + amount0),
                token1ExchangeRate: (prev.reserve0 + amount0) / (prev.reserve1 + amount1),
                }));
        
                setMockUserBalances(prev => ({
                ...prev,
                weth: prev.weth - amount0,
                usdc: prev.usdc - amount1,
                lpToken: prev.lpToken + shares,
                }));
        
                return shares;
            } else {

                // Live mode implementation
                if (!isConnected) {
                    throw new Error('Please connect your wallet');
                }
        
                const wethAmount = parseUnits(amount0.toString(), DECIMALS.WETH);
                const usdcAmount = parseUnits(amount1.toString(), DECIMALS.USDC);
        
                setPendingTransaction({
                    hash: '',
                    type: 'addLiquidity',
                    isPending: true,
                    isConfirmed: false,
                });

                writeContract({
                    address: CONTRACTS.AMM,
                    abi: AMM_ABI,
                    functionName: 'addLiquidity',
                    args: [wethAmount, usdcAmount],
                });
        
                return poolState.totalLPSupply === 0 ? sqrt(amount0 * amount1) : min(
                        (amount0 * poolState.totalLPSupply) / poolState.reserve0,
                        (amount1 * poolState.totalLPSupply) / poolState.reserve1
                    );
                }
            } catch (err: any) {
                setError(err.message);
                throw err;
            } finally {
                setIsLoading(false);
            }
    }, [mode, mockPoolState, mockUserBalances, poolState, isConnected, writeContract, validateBalance, setMockPoolState, setMockUserBalances]);

    const removeLiquidity = useCallback(async (shares: number): Promise<{ reserve0: number; reserve1: number }> => {
        setIsLoading(true);
        setError(null);
    
        try {

            if (shares <= 0) {
                throw new Error('AMM: Invalid shares');
            }
        
            if (mode === 'mock') {

                if (mockUserBalances.lpToken < shares) {
                    throw new Error('AMM: Insufficient shares');
                }
        
                const reserveRemoved0 = (shares * mockPoolState.reserve0) / mockPoolState.totalLPSupply;
                const reserveRemoved1 = (shares * mockPoolState.reserve1) / mockPoolState.totalLPSupply;
        
                if (reserveRemoved0 <= 0 || reserveRemoved1 <= 0) {
                    throw new Error('AMM: Invalid reserves');
                }
        
                await new Promise(resolve => setTimeout(resolve, 1500));
        
                setMockPoolState(prev => ({
                    ...prev,
                    reserve0: prev.reserve0 - reserveRemoved0,
                    reserve1: prev.reserve1 - reserveRemoved1,
                    totalLPSupply: prev.totalLPSupply - shares,
                    ratio: prev.reserve0 > reserveRemoved0 && prev.reserve1 > reserveRemoved1 
                        ? (prev.reserve1 - reserveRemoved1) / (prev.reserve0 - reserveRemoved0)
                        : 0,
                    token0ExchangeRate: prev.reserve0 > reserveRemoved0 && prev.reserve1 > reserveRemoved1
                        ? (prev.reserve1 - reserveRemoved1) / (prev.reserve0 - reserveRemoved0)
                        : 0,
                    token1ExchangeRate: prev.reserve0 > reserveRemoved0 && prev.reserve1 > reserveRemoved1
                        ? (prev.reserve0 - reserveRemoved0) / (prev.reserve1 - reserveRemoved1)
                        : 0,
                }));
        
                setMockUserBalances(prev => ({
                    ...prev,
                    weth: prev.weth + reserveRemoved0,
                    usdc: prev.usdc + reserveRemoved1,
                    lpToken: prev.lpToken - shares,
                }));
        
                return { reserve0: reserveRemoved0, reserve1: reserveRemoved1 };
            } else {
                // Live mode implementation
                if (!isConnected) {
                    throw new Error('Please connect your wallet');
                }
        
                const parsedShares = parseUnits(shares.toString(), DECIMALS.LP);
        
                setPendingTransaction({
                    hash: '',
                    type: 'removeLiquidity',
                    isPending: true,
                    isConfirmed: false,
                });

                writeContract({
                    address: CONTRACTS.AMM,
                    abi: AMM_ABI,
                    functionName: 'removeLiquidity',
                    args: [parsedShares],
                });
        
                const reserveRemoved0 = (shares * poolState.reserve0) / poolState.totalLPSupply;
                const reserveRemoved1 = (shares * poolState.reserve1) / poolState.totalLPSupply;
                return { reserve0: reserveRemoved0, reserve1: reserveRemoved1 };
            }
        } catch (err: any) {
            setError(err.message);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [mode, mockPoolState, mockUserBalances, poolState, isConnected, writeContract, setMockPoolState, setMockUserBalances]);

    //only for mock mode
    const resetPool = useCallback(() => {
        if (mode === 'mock') {
            setMockPoolState({
                token0Address: CONTRACTS.WETH,
                token1Address: CONTRACTS.USDC,
                reserve0: INITIAL_MOCK_RESERVES.RESERVE_0,
                reserve1: INITIAL_MOCK_RESERVES.RESERVE_1,
                ratio: INITIAL_MOCK_RESERVES.RESERVE_1 / INITIAL_MOCK_RESERVES.RESERVE_0,
                totalLPSupply: INITIAL_LP_SUPPLY,
                token0ExchangeRate: INITIAL_MOCK_RESERVES.RESERVE_1 / INITIAL_MOCK_RESERVES.RESERVE_0,
                token1ExchangeRate: INITIAL_MOCK_RESERVES.RESERVE_0 / INITIAL_MOCK_RESERVES.RESERVE_1,
            });
    
            setMockUserBalances({
                weth: INITIAL_MOCK_BALANCES.WETH,
                usdc: INITIAL_MOCK_BALANCES.USDC,
                lpToken: INITIAL_MOCK_BALANCES.LP_TOKEN,
            });
        }
        setError(null);
        setPendingTransaction(null);
    }, [mode]);

    //only for live mode
    useEffect(() => {
        if (isConfirmed && mode === 'live' && hash && pendingTransaction) {
            // Transaction confirmed, refresh balances and pool state
            refreshUserBalances();
            refetchPoolState();
            
            setPendingTransaction(prev => prev ? {
                ...prev,
                isPending: false,
                isConfirmed: true,
                result: receipt
            } : null);
            
            console.log('Transaction confirmed:', hash);
        }
    }, [isConfirmed, mode, refreshUserBalances, refetchPoolState, hash, pendingTransaction, receipt]);
    
    const combinedLoading = isLoading || isWritePending || isConfirming || isPoolLoading;
    
    const value: AMMContextType = {
        mode,
        toggleMode,
        isMockMode: mode === 'mock',
        isLiveMode: mode === 'live',
        poolState,
        userBalances,
        k,
        currentPrice,
        getSwapEstimate,
        executeSwap,
        addLiquidity,
        removeLiquidity,
        calculateRemovalAmounts,
        resetPool,
        refreshUserBalances,
        isLoading: combinedLoading,
        error,
        pendingTransaction,
    };

    return(
        <AMMContext.Provider value={value}>
            {children}
        </AMMContext.Provider>
    );
}

//custom hook to safely use the context
export const useAMM = () => {
  const context = useContext(AMMContext);
  if (!context) {
    throw new Error('useAMM must be used within AMMProvider');
  }
  return context;
};
