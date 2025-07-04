"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { motion } from "framer-motion"
import Navigation from "@/components/navigation"
import Footer from "@/components/footer"
import AnimatedBackground from "@/components/animated-background"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { ChevronRight, Share, Settings, Loader2, AlertCircle, CheckCircle2, RefreshCw, Calculator } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAMM } from "@/contexts/AMMContext"
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi'
import { parseUnits, formatUnits, Address } from 'viem'
import { ERC20_ABI } from '@/lib/abis'

// Contract addresses
const CONTRACTS = {
  AMM: process.env.NEXT_PUBLIC_AMM_CONTRACT_ADDRESS as Address,
  WETH: '0x4200000000000000000000000000000000000006' as Address,
  USDC: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as Address,
} as const;

const DECIMALS = {
  WETH: 18,
  USDC: 6,
} as const;

// Custom dot component for highlighting current position
const CustomDot = (props: any) => {
  const { cx, cy, payload } = props
  if (payload?.isCurrent) {
    return (
      <g>
        <circle cx={cx} cy={cy} r={10} fill="#00bcd4" stroke="#ffffff" strokeWidth={3} className="animate-pulse" />
        <circle cx={cx} cy={cy} r={15} fill="none" stroke="#00bcd4" strokeWidth={2} opacity={0.6} />
      </g>
    )
  }
  return null
}

// Custom tooltip component
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="bg-black/95 backdrop-blur-md border border-white/30 rounded-lg p-4 text-sm shadow-xl">
        <p className="text-[#a5f10d] font-semibold text-base mb-2">{data.isCurrent ? "🎯 Current Pool Position" : "📊 Curve Point"}</p>
        <div className="space-y-1">
          <p className="text-white font-medium">WETH: <span className="text-blue-300">{label}</span></p>
          <p className="text-white font-medium">USDC: <span className="text-green-300">{payload[0].value.toFixed(2)}</span></p>
          <p className="text-cyan-400 font-medium">k = <span className="text-yellow-300">{(label * payload[0].value).toFixed(0)}</span></p>
        </div>
      </div>
    )
  }
  return null
}

// Helper function to safely format numbers for parseUnits
const safeNumberToString = (num: number, decimals: number = 18): string => {
  // Convert to fixed decimal string to avoid scientific notation
  return num.toFixed(decimals);
};

// Helper function to format LP token balance with full precision
const formatLPTokenBalance = (balance: number): string => {
  // Show full 18 decimal precision for LP tokens
  return balance.toFixed(18);
};

export default function LiquidityPage() {
  const [mounted, setMounted] = useState(false)
  const { address, isConnected } = useAccount()
  
  // Direct context access without unnecessary memoization (Fix 1)
  const {
    mode,
    isMockMode,
    isLiveMode,
    poolState,
    userBalances,
    k,
    currentPrice,
    addLiquidity,
    removeLiquidity,
    resetPool,
    refreshUserBalances,
    isLoading,
    error
  } = useAMM()

  // Local state for inputs
  const [liquidityAmountWETH, setLiquidityAmountWETH] = useState('')
  const [liquidityAmountUSDC, setLiquidityAmountUSDC] = useState('')
  const [removeLiquidityShares, setRemoveLiquidityShares] = useState('')
  
  // Auto-calculation states
  const [autoCalculateRatio, setAutoCalculateRatio] = useState(true)
  const [manualMode, setManualMode] = useState(false)

  // Approval states
  const [wethApprovalPending, setWethApprovalPending] = useState(false)
  const [usdcApprovalPending, setUsdcApprovalPending] = useState(false)

  // Contract interaction hooks
  const { writeContract, data: hash, isPending: isWritePending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash })

  // Read allowances
  const { data: wethAllowance, refetch: refetchWETHAllowance } = useReadContract({
    address: CONTRACTS.WETH,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address ? [address, CONTRACTS.AMM] : undefined,
    query: {
      enabled: isLiveMode && isConnected && !!address,
      refetchInterval: false
    }
  });

  const { data: usdcAllowance, refetch: refetchUSDCAllowance } = useReadContract({
    address: CONTRACTS.USDC,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address ? [address, CONTRACTS.AMM] : undefined,
    query: {
      enabled: isLiveMode && isConnected && !!address,
      refetchInterval: false
    }
  });

  // Get the full precision LP token balance
  const fullLPTokenBalance = userBalances.lpToken;
  const formattedLPBalance = formatLPTokenBalance(fullLPTokenBalance);

  // Calculate required amount based on current pool ratio
  const calculateRequiredAmount = useCallback((inputToken: 'WETH' | 'USDC', inputAmount: string): string => {
    if (!inputAmount || isNaN(parseFloat(inputAmount)) || parseFloat(inputAmount) <= 0) {
      return '';
    }

    if (poolState.reserve0 <= 0 || poolState.reserve1 <= 0) {
      return '';
    }

    const amount = parseFloat(inputAmount);
    
    if (inputToken === 'WETH') {
      const requiredUSDC = (amount * poolState.reserve1) / poolState.reserve0;
      return requiredUSDC.toFixed(6);
    } else {
      const requiredWETH = (amount * poolState.reserve0) / poolState.reserve1;
      return requiredWETH.toFixed(18);
    }
  }, [poolState.reserve0, poolState.reserve1]);

  // Handle WETH input change with auto-calculation
  const handleWETHChange = useCallback((value: string) => {
    setLiquidityAmountWETH(value);
    
    if (autoCalculateRatio && !manualMode && value && !isNaN(parseFloat(value))) {
      const requiredUSDC = calculateRequiredAmount('WETH', value);
      if (requiredUSDC) {
        setLiquidityAmountUSDC(requiredUSDC);
      }
    }
  }, [autoCalculateRatio, manualMode, calculateRequiredAmount]);

  // Handle USDC input change with auto-calculation
  const handleUSDCChange = useCallback((value: string) => {
    setLiquidityAmountUSDC(value);
    
    if (autoCalculateRatio && !manualMode && value && !isNaN(parseFloat(value))) {
      const requiredWETH = calculateRequiredAmount('USDC', value);
      if (requiredWETH) {
        setLiquidityAmountWETH(requiredWETH);
      }
    }
  }, [autoCalculateRatio, manualMode, calculateRequiredAmount]);

  // Check if tokens need approval
  const needsWETHApproval = useMemo(() => {
    if (!liquidityAmountWETH || !isLiveMode || !isConnected) return false;
    try {
      const requiredAmount = parseUnits(safeNumberToString(parseFloat(liquidityAmountWETH), 18), DECIMALS.WETH);
      return !wethAllowance || (wethAllowance as bigint) < requiredAmount;
    } catch {
      return true;
    }
  }, [liquidityAmountWETH, isLiveMode, isConnected, wethAllowance]);

  const needsUSDCApproval = useMemo(() => {
    if (!liquidityAmountUSDC || !isLiveMode || !isConnected) return false;
    try {
      const requiredAmount = parseUnits(safeNumberToString(parseFloat(liquidityAmountUSDC), 6), DECIMALS.USDC);
      return !usdcAllowance || (usdcAllowance as bigint) < requiredAmount;
    } catch {
      return true;
    }
  }, [liquidityAmountUSDC, isLiveMode, isConnected, usdcAllowance]);

  // Approve WETH function
  const approveWETH = async () => {
    if (!liquidityAmountWETH || !address || !isConnected) return;
    
    try {
      setWethApprovalPending(true);
      const amount = parseUnits(safeNumberToString(parseFloat(liquidityAmountWETH), 18), DECIMALS.WETH);

      writeContract({
        address: CONTRACTS.WETH,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [CONTRACTS.AMM, amount],
      });
    } catch (err) {
      console.error('WETH approval failed:', err);
      setWethApprovalPending(false);
    }
  };

  // Approve USDC function
  const approveUSDC = async () => {
    if (!liquidityAmountUSDC || !address || !isConnected) return;
    
    try {
      setUsdcApprovalPending(true);
      const amount = parseUnits(safeNumberToString(parseFloat(liquidityAmountUSDC), 6), DECIMALS.USDC);

      writeContract({
        address: CONTRACTS.USDC,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [CONTRACTS.AMM, amount],
      });
    } catch (err) {
      console.error('USDC approval failed:', err);
      setUsdcApprovalPending(false);
    }
  };

  // Handle transaction confirmation
  useEffect(() => {
    if (isConfirmed && hash) {
      setWethApprovalPending(false);
      setUsdcApprovalPending(false);
      refetchWETHAllowance();
      refetchUSDCAllowance();
    }
  }, [isConfirmed, hash]);

  // Generate hyperbola curve data based on pool state
  const generateCurveData = () => {
    const data = []
    const currentK = poolState.reserve0 * poolState.reserve1
    
    if (currentK === 0) return []

    // Generate curve points around current reserves
    const minX = Math.max(100, poolState.reserve0 * 0.2)
    const maxX = poolState.reserve0 * 3
    const step = (maxX - minX) / 100

    for (let x = minX; x <= maxX; x += step) {
      const y = currentK / x
      if (y > 0) {
        data.push({
          x: parseFloat(x.toFixed(2)),
          curveY: parseFloat(y.toFixed(2)),
          isCurrent: Math.abs(x - poolState.reserve0) < step * 2,
        })
      }
    }

    // Ensure current position is included
    if (!data.some(point => point.isCurrent)) {
      data.push({
        x: parseFloat(poolState.reserve0.toFixed(2)),
        curveY: parseFloat(poolState.reserve1.toFixed(2)),
        isCurrent: true,
      })
    }

    return data.sort((a, b) => a.x - b.x)
  }

  const curveData = generateCurveData()

  // Enhanced add liquidity function
  const handleAddLiquidity = async () => {
    if (!liquidityAmountWETH || !liquidityAmountUSDC) return;
    
    const wethAmount = Number(liquidityAmountWETH);
    const usdcAmount = Number(liquidityAmountUSDC);
    
    try {
      // Execute the actual liquidity addition
      await addLiquidity(wethAmount, usdcAmount);
      setLiquidityAmountWETH('');
      setLiquidityAmountUSDC('');
    } catch (error) {
      console.error('Add liquidity failed:', error);
    }
  };

  // Enhanced remove liquidity function with scientific notation fix
  const handleRemoveLiquidity = async () => {
    if (!removeLiquidityShares || Number(removeLiquidityShares) <= 0) return
    
    try {
      const sharesAmount = Number(removeLiquidityShares);
      
      // Check for minimum threshold to prevent scientific notation issues
      if (sharesAmount < 1e-15) {
        alert('Amount too small. Please enter a larger amount.');
        return;
      }
      
      // Check if amount exceeds available balance
      if (sharesAmount > fullLPTokenBalance) {
        alert(`Amount exceeds your LP token balance of ${formattedLPBalance}`);
        return;
      }
      
      await removeLiquidity(sharesAmount);
      setRemoveLiquidityShares('');
    } catch (error: any) {
      console.error('Remove liquidity failed:', error);
      
      // Handle specific scientific notation error
      if (error.message?.includes('not a valid decimal number') || error.message?.includes('scientific notation')) {
        alert('The amount entered is too small and cannot be processed. Please enter a larger amount (minimum 0.000001).');
      } else {
        alert(`Remove liquidity failed: ${error.message}`);
      }
    }
  }

  // Function to set max LP tokens for removal
  const setMaxLPTokens = () => {
    setRemoveLiquidityShares(formattedLPBalance);
  };

  // Validate ratio
  const validateRatio = useCallback((): { isValid: boolean; error?: string } => {
    if (!liquidityAmountWETH || !liquidityAmountUSDC) {
      return { isValid: false, error: 'Please enter amounts for both tokens' };
    }

    const wethAmount = parseFloat(liquidityAmountWETH);
    const usdcAmount = parseFloat(liquidityAmountUSDC);

    if (wethAmount <= 0 || usdcAmount <= 0) {
      return { isValid: false, error: 'Amounts must be greater than zero' };
    }

    if (poolState.reserve0 > 0 && poolState.reserve1 > 0) {
      const currentRatio = poolState.reserve1 / poolState.reserve0;
      const inputRatio = usdcAmount / wethAmount;
      const ratioDifference = Math.abs(currentRatio - inputRatio) / currentRatio;

      if (ratioDifference > 0.01) {
        return { 
          isValid: false, 
          error: `Ratio mismatch. Current: ${currentRatio.toFixed(2)} USDC/WETH, Your ratio: ${inputRatio.toFixed(2)}` 
        };
      }
    }

    return { isValid: true };
  }, [liquidityAmountWETH, liquidityAmountUSDC, poolState.reserve0, poolState.reserve1]);

  const ratioValidation = useMemo(() => {
    return liquidityAmountWETH && liquidityAmountUSDC ? validateRatio() : { isValid: true };
  }, [liquidityAmountWETH, liquidityAmountUSDC, validateRatio]);

  // Listen to mode changes from navigation
  useEffect(() => {
    setLiquidityAmountWETH('');
    setLiquidityAmountUSDC('');
    setRemoveLiquidityShares('');
  }, [mode]);

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#a5f10d] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      <AnimatedBackground />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
        className="relative z-10"
      >
        <Navigation />

        <main className="pt-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            {/* Connection Alert for Live Mode */}
            {isLiveMode && !isConnected && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6"
              >
                <Alert className="border-yellow-500 bg-yellow-500/10">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-yellow-300">
                    Please connect your wallet to interact with the live AMM contract
                  </AlertDescription>
                </Alert>
              </motion.div>
            )}

            {/* Error Display */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6"
              >
                <Alert className="border-red-500 bg-red-500/10">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-red-300">{error}</AlertDescription>
                </Alert>
              </motion.div>
            )}

            {/* Loading States */}
            {(isLoading || isWritePending || isConfirming) && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6"
              >
                <Alert className="border-blue-500 bg-blue-500/10">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <AlertDescription className="text-blue-300">
                    {isWritePending || isConfirming ? 'Processing transaction...' : 'Loading...'}
                  </AlertDescription>
                </Alert>
              </motion.div>
            )}

            {/* Breadcrumb Navigation */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="flex items-center gap-2 text-white/60 mb-6"
            >
              <span>Explore</span>
              <ChevronRight size={16} />
              <span>Pools</span>
              <ChevronRight size={16} />
              <span className="text-white">WETH / USDC</span>
              <Badge variant={isMockMode ? "secondary" : "default"} className="ml-4">
                {isMockMode ? "🎮 Learning Mode" : "🔴 Live Trading"}
              </Badge>
            </motion.div>

            {/* Header Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8"
            >
              <div className="flex items-center gap-4 mb-4 lg:mb-0">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold">W</span>
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-light">WETH / USDC</h1>
                    <span className="bg-white/10 px-2 py-1 rounded text-sm">v4</span>
                    <span className="bg-white/10 px-2 py-1 rounded text-sm">0.30%</span>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-pink-500 rounded-full"></div>
                      <span className="text-pink-400 text-sm">Fee APR</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {isLiveMode && (
                  <Button
                    onClick={refreshUserBalances}
                    variant="outline"
                    size="sm"
                    disabled={isLoading}
                    className="bg-transparent border-blue-400 text-blue-400 hover:bg-blue-400/10"
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                    Refresh
                  </Button>
                )}
                <Button variant="outline" size="sm" className="bg-transparent border-white/20">
                  <Settings size={16} />
                </Button>
                <Button variant="outline" size="sm" className="bg-transparent border-white/20">
                  <Share size={16} />
                </Button>
              </div>
            </motion.div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              {/* Left Section - TVL and Chart */}
              <div className="lg:col-span-3 space-y-6">
                {/* TVL Display */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                >
                  <div className="text-4xl font-light mb-2">
                    ${((poolState.reserve0 * currentPrice + poolState.reserve1) * 1.5).toLocaleString('en-US', { maximumFractionDigits: 1 })}
                  </div>
                  <div className="text-white/60">Total Value Locked</div>
                </motion.div>

                {/* Hyperbola Visualization */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                >
                  <Card className="bg-white/5 backdrop-blur-md border-white/10">
                    <CardHeader>
                      <CardTitle className="text-[#a5f10d] text-xl font-light">
                        Constant Product Curve (x × y = k = {k.toLocaleString()})
                      </CardTitle>
                      <CardDescription className="text-white/60">
                        Interactive visualization of the AMM liquidity curve - {isMockMode ? 'Simulation' : 'Live Data'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart data={curveData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                            <XAxis
                              dataKey="x"
                              stroke="rgba(255,255,255,0.6)"
                              label={{ value: "WETH Reserves", position: "insideBottom", offset: -10 }}
                            />
                            <YAxis
                              stroke="rgba(255,255,255,0.6)"
                              label={{ value: "USDC Reserves", angle: -90, position: "insideLeft" }}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Line
                              type="monotone"
                              dataKey="curveY"
                              stroke="#a5f10d"
                              strokeWidth={3}
                              dot={<CustomDot />}
                              activeDot={{ r: 6, fill: "#a5f10d" }}
                            />
                          </ComposedChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>

              {/* Right Sidebar */}
              <div className="lg:col-span-1 space-y-6">
                {/* User Balances - Using direct context access with full LP precision */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                >
                  <Card className="bg-white/5 backdrop-blur-md border-white/10">
                    <CardHeader>
                      <CardTitle className="text-blue-400 text-lg font-light">Your Balances</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="bg-black/30 rounded-lg p-4 border border-white/10">
                        <div className="flex justify-between items-center">
                          <span className="text-white/80 font-medium">WETH:</span>
                          <span className="font-mono text-lg text-white font-bold">{userBalances.weth.toFixed(4)}</span>
                        </div>
                      </div>
                      <div className="bg-black/30 rounded-lg p-4 border border-white/10">
                        <div className="flex justify-between items-center">
                          <span className="text-white/80 font-medium">USDC:</span>
                          <span className="font-mono text-lg text-white font-bold">{userBalances.usdc.toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="bg-black/30 rounded-lg p-4 border border-white/10">
                        <div className="flex flex-col space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="text-white/80 font-medium">LP Tokens:</span>
                          </div>
                          <div className="font-mono text-sm text-white font-bold break-all">
                            {formattedLPBalance}
                          </div>
                        </div>
                      </div>
                      {isConnected && (
                        <div className="text-xs text-white/60 mt-4 pt-3 border-t border-white/20 text-center">
                          Connected: {address?.slice(0, 6)}...{address?.slice(-4)}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Liquidity Management Tabs */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                >
                  <Card className="bg-white/5 backdrop-blur-md border-white/10">
                    <CardContent className="p-0">
                      <Tabs defaultValue="add" className="w-full">
                        <TabsList className="grid w-full grid-cols-2 bg-transparent border-b border-white/10">
                          <TabsTrigger
                            value="add"
                            className="data-[state=active]:bg-[#a5f10d]/20 data-[state=active]:text-[#a5f10d] text-white/60"
                          >
                            Add Liquidity
                          </TabsTrigger>
                          <TabsTrigger
                            value="remove"
                            className="data-[state=active]:bg-red-500/20 data-[state=active]:text-red-400 text-white/60"
                          >
                            Remove Liquidity
                          </TabsTrigger>
                        </TabsList>

                        <TabsContent value="add" className="p-6 space-y-4">
                          {/* Auto-calculate controls */}
                          <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg border border-white/10">
                            <div className="flex items-center gap-2">
                              <Calculator className="h-4 w-4 text-blue-400" />
                              <span className="text-sm text-white/80">Auto-calculate</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setAutoCalculateRatio(!autoCalculateRatio)}
                                className={`text-xs h-7 px-3 ${autoCalculateRatio ? 'bg-blue-500/20 border-blue-500 text-blue-300' : 'border-white/30 text-white/60'}`}
                              >
                                {autoCalculateRatio ? 'ON' : 'OFF'}
                              </Button>
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm text-white/80 mb-2 font-medium">WETH Amount</label>
                            <Input
                              type="number"
                              value={liquidityAmountWETH}
                              onChange={(e) => handleWETHChange(e.target.value)}
                              className="bg-black/30 border-white/20 text-white h-12 text-lg"
                              placeholder="0.0000"
                              step="any"
                            />
                            {/* WETH Approval Button */}
                            {isLiveMode && isConnected && liquidityAmountWETH && needsWETHApproval && (
                              <Button
                                onClick={approveWETH}
                                disabled={wethApprovalPending || isWritePending || isConfirming}
                                className="w-full mt-2 bg-yellow-600 hover:bg-yellow-700 text-black font-medium"
                                size="sm"
                              >
                                {(wethApprovalPending || isWritePending || isConfirming) ? (
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : null}
                                Approve WETH
                              </Button>
                            )}
                            {isLiveMode && isConnected && liquidityAmountWETH && !needsWETHApproval && (
                              <div className="mt-2 text-green-400 text-sm flex items-center justify-center bg-green-500/10 rounded-lg py-2">
                                <CheckCircle2 className="h-4 w-4 mr-1" />
                                WETH Approved
                              </div>
                            )}
                          </div>

                          <div>
                            <label className="block text-sm text-white/80 mb-2 font-medium">USDC Amount</label>
                            <Input
                              type="number"
                              value={liquidityAmountUSDC}
                              onChange={(e) => handleUSDCChange(e.target.value)}
                              className="bg-black/30 border-white/20 text-white h-12 text-lg"
                              placeholder="0.00"
                              step="any"
                            />
                            {/* USDC Approval Button */}
                            {isLiveMode && isConnected && liquidityAmountUSDC && needsUSDCApproval && (
                              <Button
                                onClick={approveUSDC}
                                disabled={usdcApprovalPending || isWritePending || isConfirming}
                                className="w-full mt-2 bg-yellow-600 hover:bg-yellow-700 text-black font-medium"
                                size="sm"
                              >
                                {(usdcApprovalPending || isWritePending || isConfirming) ? (
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : null}
                                Approve USDC
                              </Button>
                            )}
                            {isLiveMode && isConnected && liquidityAmountUSDC && !needsUSDCApproval && (
                              <div className="mt-2 text-green-400 text-sm flex items-center justify-center bg-green-500/10 rounded-lg py-2">
                                <CheckCircle2 className="h-4 w-4 mr-1" />
                                USDC Approved
                              </div>
                            )}
                          </div>

                          {/* Ratio validation display */}
                          {liquidityAmountWETH && liquidityAmountUSDC && (
                            !ratioValidation.isValid ? (
                              <Alert className="border-red-500 bg-red-500/10">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription className="text-red-300 text-sm">
                                  {ratioValidation.error}
                                </AlertDescription>
                              </Alert>
                            ) : (
                              <Alert className="border-green-500 bg-green-500/10">
                                <CheckCircle2 className="h-4 w-4" />
                                <AlertDescription className="text-green-300 text-sm">
                                  ✅ Ratio is valid for liquidity addition
                                </AlertDescription>
                              </Alert>
                            )
                          )}

                          <Button
                            onClick={handleAddLiquidity}
                            disabled={
                              isLoading || 
                              !liquidityAmountWETH || 
                              !liquidityAmountUSDC || 
                              isWritePending || 
                              isConfirming ||
                              (isLiveMode && !isConnected) ||
                              (isLiveMode && isConnected && (needsWETHApproval || needsUSDCApproval)) ||
                              !ratioValidation.isValid
                            }
                            className="w-full bg-[#a5f10d] text-black hover:bg-[#a5f10d]/90 font-medium h-12 text-lg"
                          >
                            {isLoading || isWritePending || isConfirming ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : null}
                            Add Liquidity
                          </Button>
                        </TabsContent>

                        <TabsContent value="remove" className="p-6 space-y-4">
                          <div>
                            <div className="flex justify-between items-center mb-2">
                              <label className="block text-sm text-white/80 font-medium">LP Tokens to Remove</label>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={setMaxLPTokens}
                                className="text-xs h-6 px-2 border-purple-500 text-purple-400 hover:bg-purple-500/10"
                                disabled={fullLPTokenBalance <= 0}
                              >
                                MAX
                              </Button>
                            </div>
                            <Input
                              type="number"
                              value={removeLiquidityShares}
                              onChange={(e) => setRemoveLiquidityShares(e.target.value)}
                              className="bg-black/30 border-white/20 text-white h-12 text-lg"
                              placeholder="0.000000000000000000"
                              step="any"
                              min="0.000001"
                              max={formattedLPBalance}
                            />
                            <div className="text-xs text-white/60 mt-1">
                              Available: {formattedLPBalance} LP tokens
                            </div>
                            <div className="text-xs text-white/60">
                              Minimum amount: 0.000001 LP tokens
                            </div>
                          </div>
                          
                          {removeLiquidityShares && Number(removeLiquidityShares) > 0 && (
                            <div className="bg-black/30 rounded-lg p-4 border border-white/10">
                              <div className="text-sm text-white/80 mb-2 font-medium">You will receive approximately:</div>
                              <div className="space-y-1">
                                <div className="text-red-400 font-mono">
                                  WETH: {((Number(removeLiquidityShares) * poolState.reserve0) / poolState.totalLPSupply).toFixed(4)}
                                </div>
                                <div className="text-red-400 font-mono">
                                  USDC: {((Number(removeLiquidityShares) * poolState.reserve1) / poolState.totalLPSupply).toFixed(2)}
                                </div>
                              </div>
                            </div>
                          )}

                          <Button 
                            onClick={handleRemoveLiquidity}
                            disabled={
                              isLoading || 
                              !removeLiquidityShares || 
                              Number(removeLiquidityShares) <= 0 ||
                              Number(removeLiquidityShares) < 1e-6 ||
                              Number(removeLiquidityShares) > fullLPTokenBalance ||
                              (isLiveMode && !isConnected)
                            }
                            className="w-full bg-red-600 hover:bg-red-700 font-medium h-12 text-lg"
                          >
                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Remove Liquidity
                          </Button>
                        </TabsContent>
                      </Tabs>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Pool Stats - Using direct context access */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.5 }}
                >
                  <Card className="bg-white/5 backdrop-blur-md border-white/10">
                    <CardHeader>
                      <CardTitle className="text-white text-lg font-light">Pool Stats</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="bg-black/30 rounded-lg p-4 border border-white/10">
                        <div className="text-white/80 text-sm mb-3 font-medium">Pool Balances</div>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-white/70">WETH:</span>
                            <span className="font-mono text-white font-bold">{poolState.reserve0.toFixed(4)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-white/70">USDC:</span>
                            <span className="font-mono text-white font-bold">{poolState.reserve1.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-black/30 rounded-lg p-4 border border-white/10">
                        <div className="text-white/80 text-sm mb-2 font-medium">Constant k</div>
                        <div className="text-[#a5f10d] font-medium font-mono text-lg">{k.toLocaleString()}</div>
                      </div>

                      <div className="bg-black/30 rounded-lg p-4 border border-white/10">
                        <div className="text-white/80 text-sm mb-3 font-medium">Current Prices</div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-white/70">USDC/WETH:</span>
                            <span className="font-mono text-white font-bold">{currentPrice.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-white/70">WETH/USDC:</span>
                            <span className="font-mono text-white font-bold">{(1/currentPrice).toFixed(6)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-black/30 rounded-lg p-4 border border-white/10">
                        <div className="text-white/80 text-sm mb-2 font-medium">Total LP Supply</div>
                        <div className="text-purple-400 font-medium font-mono text-lg">{poolState.totalLPSupply.toFixed(4)}</div>
                      </div>
                      
                      {isMockMode && (
                        <Button 
                          onClick={resetPool} 
                          variant="outline" 
                          className="w-full bg-transparent border-purple-500 text-purple-400 hover:bg-purple-500/10"
                          disabled={isLoading}
                        >
                          🔄 Reset Pool
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            </div>

            {/* Educational Content */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="mt-12"
            >
              <Card className="bg-white/5 backdrop-blur-md border-white/10">
                <CardHeader>
                  <CardTitle className="text-[#a5f10d] text-2xl font-light">Understanding AMM Mechanics</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-black/20 rounded-lg p-6 border border-white/10">
                    <h3 className="text-xl font-light mb-3 text-white">📊 Constant Product Formula</h3>
                    <p className="text-white/70 leading-relaxed text-sm">
                      The hyperbola represents <span className="text-[#a5f10d] font-mono">x × y = k</span>, ensuring the
                      product of reserves remains constant during trades. This mathematical relationship creates
                      automatic price discovery and the cyan dot shows your current pool position.
                    </p>
                  </div>
                  <div className="bg-black/20 rounded-lg p-6 border border-white/10">
                    <h3 className="text-xl font-light mb-3 text-white">⚡ Trading Impact</h3>
                    <p className="text-white/70 leading-relaxed text-sm">
                      Each trade moves the cyan dot along the curve, with larger trades experiencing higher slippage. The curve's
                      shape naturally creates resistance to large price movements, providing stability to the market.
                    </p>
                  </div>
                  <div className="bg-black/20 rounded-lg p-6 border border-white/10">
                    <h3 className="text-xl font-light mb-3 text-white">💧 Liquidity Effects</h3>
                    <p className="text-white/70 leading-relaxed text-sm">
                      Adding liquidity shifts the entire curve outward (higher k), reducing slippage for all traders.
                      Liquidity providers earn fees from trades while helping maintain market efficiency and depth.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </main>

        <Footer />
      </motion.div>
    </div>
  )
}
