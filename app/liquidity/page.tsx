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
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi'
import { parseUnits, formatUnits, Address } from 'viem'
import { ERC20_ABI } from '@/lib/abis'
import { useAMM } from '@/contexts/AMMContext'
import { Loader2, AlertCircle, CheckCircle2, AlertTriangle } from 'lucide-react'
import PoolStatistics from '@/components/PoolStatistics'
import Image from "next/image"


// Contract addresses
const CONTRACTS = {
  AMM: process.env.NEXT_PUBLIC_AMM_CONTRACT_ADDRESS as Address,
  WETH: '0x4200000000000000000000000000000000000006' as Address,
  USDC: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as Address,
} as const

const DECIMALS = {
  WETH: 18,
  USDC: 6,
} as const

// Custom dot component for highlighting current position
const CustomDot = (props: any) => {
  const { cx, cy, payload } = props
  if (payload?.isCurrent) {
    return <circle cx={cx} cy={cy} r={8} fill="#00bcd4" stroke="#ffffff" strokeWidth={3} className="animate-pulse" />
  }
  return null
}

// Custom tooltip component
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="bg-black/90 backdrop-blur-md border border-white/20 rounded-lg p-3 text-sm">
        <p className="text-secondary font-medium">{data.isCurrent ? "Current Pool Position" : "Curve Point"}</p>
        <p className="text-white">WETH: {label}</p>
        <p className="text-white">USDC: {payload[0].value.toFixed(2)}</p>
        <p className="text-cyan-400">k = {(label * payload[0].value).toFixed(0)}</p>
      </div>
    )
  }
  return null
}

export default function LiquidityPage() {
  const [mounted, setMounted] = useState(false)
  const { address, isConnected } = useAccount()

  // AMM Context integration
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
    calculateRemovalAmounts,
    getUserPoolShare,
    resetPool,
    refreshUserBalances,
    isLoading,
    error,
    pendingTransaction
  } = useAMM()

  // Form states
  const [liquidityWETH, setLiquidityWETH] = useState('')
  const [liquidityUSDC, setLiquidityUSDC] = useState('')
  const [removeShares, setRemoveShares] = useState('')

  const poolShare = address ? getUserPoolShare(address) : 0; // value from 0-100

  // Approval states
  const [approvingWETH, setApprovingWETH] = useState(false)
  const [approvingUSDC, setApprovingUSDC] = useState(false)

  // Wagmi hooks for approvals
  const { writeContract: writeApproval, data: approvalHash, isPending: isApprovalPending } = useWriteContract()
  const { isLoading: isApprovalConfirming, isSuccess: isApprovalConfirmed } = useWaitForTransactionReceipt({
    hash: approvalHash,
  })

  // Read current allowances
  const { data: wethAllowance, refetch: refetchWethAllowance } = useReadContract({
    address: CONTRACTS.WETH,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address && CONTRACTS.AMM ? [address, CONTRACTS.AMM] : undefined,
    query: {
      enabled: isLiveMode && isConnected && !!address,
    }
  })

  const { data: usdcAllowance, refetch: refetchUsdcAllowance } = useReadContract({
    address: CONTRACTS.USDC,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address && CONTRACTS.AMM ? [address, CONTRACTS.AMM] : undefined,
    query: {
      enabled: isLiveMode && isConnected && !!address,
    }
  })

  // Generate hyperbola curve data using real pool state
  const generateCurveData = useCallback(() => {
    const data: Array<{
      x: number;
      curveY: number;
      isCurrent: boolean;
    }> = []
    if (k === 0) return data

    for (let x = Math.max(200, poolState.reserve0 * 0.2); x <= poolState.reserve0 * 3; x += (poolState.reserve0 * 3 - poolState.reserve0 * 0.2) / 100) {
      const y = k / x
      if (y > 0) {
        data.push({
          x: parseFloat(x.toFixed(2)),
          curveY: parseFloat(y.toFixed(2)),
          isCurrent: Math.abs(x - poolState.reserve0) < (poolState.reserve0 * 0.05),
        })
      }
    }
    return data
  }, [k, poolState.reserve0])

  const curveData = generateCurveData()

  // Calculate required amount based on pool ratio
  const calculateRequiredAmount = useCallback((inputToken: 'WETH' | 'USDC', inputAmount: string): string => {
    if (!inputAmount || isNaN(parseFloat(inputAmount)) || parseFloat(inputAmount) <= 0) {
      return ''
    }

    if (poolState.reserve0 <= 0 || poolState.reserve1 <= 0) {
      return ''
    }

    const amount = parseFloat(inputAmount)
    
    if (inputToken === 'WETH') {
      const requiredUSDC = (amount * poolState.reserve1) / poolState.reserve0
      return requiredUSDC.toFixed(6)
    } else {
      const requiredWETH = (amount * poolState.reserve0) / poolState.reserve1
      return requiredWETH.toFixed(18)
    }
  }, [poolState.reserve0, poolState.reserve1])

  // Handle WETH input change - always auto-calculate
  const handleWETHChange = useCallback((value: string) => {
    setLiquidityWETH(value)
    
    if (value && !isNaN(parseFloat(value))) {
      const requiredUSDC = calculateRequiredAmount('WETH', value)
      if (requiredUSDC) {
        setLiquidityUSDC(requiredUSDC)
      }
    } else {
      setLiquidityUSDC('')
    }
  }, [calculateRequiredAmount])

  // Validate ratio
  const validateRatio = useCallback((): { isValid: boolean; error?: string } => {
    if (!liquidityWETH || !liquidityUSDC) {
      return { isValid: false, error: 'Please enter amounts for both tokens' }
    }

    const wethAmount = parseFloat(liquidityWETH)
    const usdcAmount = parseFloat(liquidityUSDC)

    if (wethAmount <= 0 || usdcAmount <= 0) {
      return { isValid: false, error: 'Amounts must be greater than zero' }
    }

    if (poolState.reserve0 > 0 && poolState.reserve1 > 0) {
      const currentRatio = poolState.reserve1 / poolState.reserve0
      const inputRatio = usdcAmount / wethAmount
      const ratioDifference = Math.abs(currentRatio - inputRatio) / currentRatio

      if (ratioDifference > 0.01) {
        return { 
          isValid: false, 
          error: `Ratio mismatch. Current: ${currentRatio.toFixed(2)} USDC/WETH, Your ratio: ${inputRatio.toFixed(2)}` 
        }
      }
    }

    return { isValid: true }
  }, [liquidityWETH, liquidityUSDC, poolState.reserve0, poolState.reserve1])

  // Validate LP token removal amount (minimum 6 decimal places)
  const validateLPRemovalAmount = useCallback((amount: string): { isValid: boolean; warning?: string } => {
    if (!amount || isNaN(parseFloat(amount))) {
      return { isValid: true }
    }

    const numAmount = parseFloat(amount)
    if (numAmount <= 0) {
      return { isValid: true }
    }

    // Check if the amount has less than 6 decimal places of precision
    const decimalPart = amount.split('.')[1]
    if (!decimalPart || decimalPart.length < 6) {
      return { 
        isValid: false, 
        warning: 'LP token amount should have at least 6 decimal places for proper precision. Values with fewer decimals may cause transaction errors.' 
      }
    }

    // Check if amount is too small (less than 0.000001)
    if (numAmount < 0.000001) {
      return { 
        isValid: false, 
        warning: 'LP token amount is too small. Minimum recommended amount is 0.000001 LP tokens.' 
      }
    }

    return { isValid: true }
  }, [])

  // Check approvals
  const checkApprovals = useMemo(() => {
    if (!liquidityWETH || !liquidityUSDC || !isLiveMode || !isConnected) {
      return { wethNeedsApproval: false, usdcNeedsApproval: false }
    }

    try {
      const wethAmount = parseUnits(liquidityWETH, DECIMALS.WETH)
      const usdcAmount = parseUnits(liquidityUSDC, DECIMALS.USDC)

      const wethNeedsApproval = !wethAllowance || (wethAllowance as bigint) < wethAmount
      const usdcNeedsApproval = !usdcAllowance || (usdcAllowance as bigint) < usdcAmount

      return { wethNeedsApproval, usdcNeedsApproval }
    } catch (error) {
      return { wethNeedsApproval: true, usdcNeedsApproval: true }
    }
  }, [liquidityWETH, liquidityUSDC, isLiveMode, isConnected, wethAllowance, usdcAllowance])

  const { wethNeedsApproval, usdcNeedsApproval } = checkApprovals

  // Handle approvals
  const handleApproveWETH = useCallback(async () => {
    if (!liquidityWETH || !address || !isConnected) return

    try {
      setApprovingWETH(true)
      const amount = parseUnits(liquidityWETH, DECIMALS.WETH)

      writeApproval({
        address: CONTRACTS.WETH,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [CONTRACTS.AMM, amount],
      })
    } catch (err) {
      console.error('WETH approval failed:', err)
      setApprovingWETH(false)
    }
  }, [liquidityWETH, address, isConnected, writeApproval])

  const handleApproveUSDC = useCallback(async () => {
    if (!liquidityUSDC || !address || !isConnected) return

    try {
      setApprovingUSDC(true)
      const amount = parseUnits(liquidityUSDC, DECIMALS.USDC)

      writeApproval({
        address: CONTRACTS.USDC,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [CONTRACTS.AMM, amount],
      })
    } catch (err) {
      console.error('USDC approval failed:', err)
      setApprovingUSDC(false)
    }
  }, [liquidityUSDC, address, isConnected, writeApproval])

  // Handle approval confirmation
  useEffect(() => {
    if (isApprovalConfirmed && approvalHash) {
      setApprovingWETH(false)
      setApprovingUSDC(false)
      refetchWethAllowance()
      refetchUsdcAllowance()
    }
  }, [isApprovalConfirmed, approvalHash, refetchWethAllowance, refetchUsdcAllowance])

  // Handle add liquidity
  const handleAddLiquidity = useCallback(async () => {
    const validation = validateRatio()
    if (!validation.isValid) {
      alert(validation.error)
      return
    }

    if (isLiveMode && !isConnected) {
      alert('Please connect your wallet to add liquidity in live mode')
      return
    }

    if (isLiveMode) {
      if (wethNeedsApproval) {
        alert('Please approve WETH first')
        return
      }
      if (usdcNeedsApproval) {
        alert('Please approve USDC first')
        return
      }
    }

    try {
      await addLiquidity(parseFloat(liquidityWETH), parseFloat(liquidityUSDC))
      setLiquidityWETH('')
      setLiquidityUSDC('')
    } catch (err) {
      console.error('Add liquidity failed:', err)
    }
  }, [validateRatio, isLiveMode, isConnected, wethNeedsApproval, usdcNeedsApproval, addLiquidity, liquidityWETH, liquidityUSDC])

  // Handle remove liquidity
  const handleRemoveLiquidity = useCallback(async () => {
    if (!removeShares || isNaN(parseFloat(removeShares))) {
      alert('Please enter a valid amount of LP tokens to remove')
      return
    }

    const validation = validateLPRemovalAmount(removeShares)
    if (!validation.isValid && validation.warning) {
      alert(validation.warning)
      return
    }

    if (isLiveMode && !isConnected) {
      alert('Please connect your wallet to remove liquidity in live mode')
      return
    }

    try {
      await removeLiquidity(parseFloat(removeShares))
      setRemoveShares('')
    } catch (err) {
      console.error('Remove liquidity failed:', err)
    }
  }, [removeShares, isLiveMode, isConnected, removeLiquidity, validateLPRemovalAmount])

  // Calculate removal estimates
  const removalEstimate = useMemo(() => {
    if (!removeShares || isNaN(parseFloat(removeShares))) {
      return { amount0: 0, amount1: 0 }
    }
    return calculateRemovalAmounts(parseFloat(removeShares))
  }, [removeShares, calculateRemovalAmounts])

  // Ratio validation result
  const ratioValidation = useMemo(() => {
    return liquidityWETH && liquidityUSDC ? validateRatio() : { isValid: true }
  }, [liquidityWETH, liquidityUSDC, validateRatio])

  // LP removal validation result
  const lpRemovalValidation = useMemo(() => {
    return validateLPRemovalAmount(removeShares)
  }, [removeShares, validateLPRemovalAmount])

  // Clear form on mode change
  useEffect(() => {
    setLiquidityWETH('')
    setLiquidityUSDC('')
    setRemoveShares('')
  }, [mode])

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-secondary border-t-transparent rounded-full animate-spin" />
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

        <main className="pt-20 px-3 sm:px-4 lg:px-6">
          <div className="max-w-[1400px] mx-auto">
            {/* Header with Mode Indicator */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="mb-8"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Image
                    src="/LPToken.jpg"
                    alt="LP Token"
                    width={50}
                    height={50}
                    className="rounded-full border-2 border-black"
                  />

                  <div>
                    <h1 className="text-3xl font-light">WETH / USDC Liquidity Pool</h1>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Status Alerts */}
            {isLiveMode && !isConnected && (
              <Alert className="mb-6 border-yellow-500/20 bg-yellow-500/10">
                <AlertCircle className="h-4 w-4 text-yellow-500" />
                <AlertDescription className="text-yellow-300">
                  Please connect your wallet to interact with the live AMM contract
                </AlertDescription>
              </Alert>
            )}

            {error && (
              <Alert className="mb-6 border-red-500/20 bg-red-500/10">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <AlertDescription className="text-red-300">{error}</AlertDescription>
              </Alert>
            )}

            {(isLoading || isApprovalPending || isApprovalConfirming) && (
              <Alert className="mb-6 border-blue-500/20 bg-blue-500/10">
                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                <AlertDescription className="text-blue-300">
                  {isApprovalPending || isApprovalConfirming ? 'Processing approval...' : 
                   pendingTransaction ? `${pendingTransaction.type} in progress...` : 'Loading...'}
                </AlertDescription>
              </Alert>
            )}

            {pendingTransaction?.isConfirmed && (
              <Alert className="mb-6 border-green-500/20 bg-green-500/10">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <AlertDescription className="text-green-300">
                  Transaction confirmed! Hash: {pendingTransaction.hash?.slice(0, 10)}...
                </AlertDescription>
              </Alert>
            )}

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Section - Chart (2/3 width) */}
              <div className="lg:col-span-2 space-y-5">
                {/* Hyperbola Visualization */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                >
                  <Card className="bg-white/5 backdrop-blur-md border-white/10">
                    <CardHeader>
                      <CardTitle className="text-secondary text-xl font-light">
                        Constant Product Curve (x × y = k)
                      </CardTitle>
                      <CardDescription className="text-white/60">
                        Interactive visualization of the AMM liquidity curve
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

                {/* Pool Stats - Using the new component */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                >
                  <PoolStatistics
                    poolState={poolState}
                    userBalances={userBalances}
                    k={k}
                    currentPrice={currentPrice}
                    getUserPoolShare={getUserPoolShare}
                    address={address}
                    isLiveMode={isLiveMode}
                    isConnected={isConnected}
                    isMockMode={isMockMode}
                    isLoading={isLoading}
                    onRefresh={refreshUserBalances}
                    onReset={resetPool}
                    showOptions={{
                      showUserPoolShare: true,
                      showPoolConstant: true,
                      showCurrentPrice: true,
                      showRefreshButton: true,
                      showResetButton: true,
                    }}
                  />
                </motion.div>
              </div>

              {/* Right Section - Liquidity Management */}
              <div className="lg:col-span-1">
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                  className="h-full"
                >
                  <Card className="bg-white/5 backdrop-blur-md border-white/10 h-full">
                    <CardContent className="p-0 h-full">
                      <Tabs defaultValue="add" className="w-full h-full flex flex-col">
                        <TabsList className="grid w-full grid-cols-2 bg-transparent border-b border-white/10 rounded-none">
                          <TabsTrigger
                            value="add"
                            className="data-[state=active]:bg-secondary/20 data-[state=active]:text-secondary text-white/60 rounded-none"
                          >
                            Add Liquidity
                          </TabsTrigger>
                          <TabsTrigger
                            value="remove"
                            className="data-[state=active]:bg-red-500/20 data-[state=active]:text-red-400 text-white/60 rounded-none"
                          >
                            Remove Liquidity
                          </TabsTrigger>
                        </TabsList>

                        <TabsContent value="add" className="p-6 space-y-6 flex-1">
                          {/* WETH Input */}
                          <div className="bg-black/20 rounded-xl p-4 border border-white/10">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-white/60 text-sm">WETH Amount</span>
                              <span className="text-white/60 text-sm">
                                Balance: {userBalances.weth.toFixed(6)}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2 rounded-lg px-3 py-2">
                                <Image
                                  src="/weth.svg"
                                  alt="WETH"
                                  width={20}
                                  height={20}
                                  className="rounded-full"
                                />
                                <span className="text-white font-medium">WETH</span>
                              </div>
                              
                              <div className="flex-1 flex items-center justify-end relative">
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  value={liquidityWETH}
                                  onChange={(e) => {
                                    const v = e.target.value
                                    if (v === "" || /^\d*\.?\d*$/.test(v)) handleWETHChange(v)
                                  }}
                                  className="w-full text-right text-2xl font-light bg-transparent border-none outline-none text-white placeholder-white/40 pr-16"
                                  placeholder="0.0"
                                />
                                <button 
                                  onClick={() => handleWETHChange(userBalances.weth.toString())}
                                  className="absolute right-0 text-secondary text-xs font-medium hover:text-secondary/80 bg-black/20 px-2 py-1 rounded"
                                >
                                  MAX
                                </button>
                              </div>
                            </div>
                            
                            {isLiveMode && isConnected && wethNeedsApproval && liquidityWETH && (
                              <Button
                                onClick={handleApproveWETH}
                                disabled={approvingWETH || isApprovalPending}
                                className="w-full mt-3 bg-yellow-600 hover:bg-yellow-700"
                                size="sm"
                              >
                                {(approvingWETH || isApprovalPending) ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                Approve WETH
                              </Button>
                            )}
                            {isLiveMode && isConnected && !wethNeedsApproval && liquidityWETH && (
                              <div className="mt-3 text-green-400 text-sm flex items-center justify-center bg-green-500/10 rounded-lg py-2">
                                <CheckCircle2 className="h-4 w-4 mr-1" />
                                WETH Approved
                              </div>
                            )}
                          </div>

                          {/* USDC Input */}
                          <div className="bg-black/20 rounded-xl p-4 border border-white/10">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-white/60 text-sm">USDC Amount</span>
                              <span className="text-white/60 text-sm">
                                Balance: {userBalances.usdc.toFixed(2)}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2 rounded-lg px-3 py-2">
                                <Image
                                  src="/usdc.svg"
                                  alt="USDC"
                                  width={20}
                                  height={20}
                                  className="rounded-full"
                                />
                                <span className="text-white font-medium">USDC</span>
                              </div>
                              
                              <div className="flex-1 flex items-center justify-end relative">
                                <div className="w-full text-right text-2xl font-light text-white/60 pr-16">
                                  {liquidityUSDC || "0.0"}
                                </div>
                                {/* Invisible spacer to match WETH alignment */}
                                <div className="absolute right-0 w-12 h-6"></div>
                              </div>
                            </div>
                            
                            {isLiveMode && isConnected && usdcNeedsApproval && liquidityUSDC && (
                              <Button
                                onClick={handleApproveUSDC}
                                disabled={approvingUSDC || isApprovalPending}
                                className="w-full mt-3 bg-yellow-600 hover:bg-yellow-700"
                                size="sm"
                              >
                                {(approvingUSDC || isApprovalPending) ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                Approve USDC
                              </Button>
                            )}
                            {isLiveMode && isConnected && !usdcNeedsApproval && liquidityUSDC && (
                              <div className="mt-3 text-green-400 text-sm flex items-center justify-center bg-green-500/10 rounded-lg py-2">
                                <CheckCircle2 className="h-4 w-4 mr-1" />
                                USDC Approved
                              </div>
                            )}
                          </div>

                          {/* Ratio validation */}
                          {liquidityWETH && liquidityUSDC && (
                            !ratioValidation.isValid ? (
                              <Alert className="border-red-500/20 bg-red-500/10">
                                <AlertCircle className="h-4 w-4 text-red-500" />
                                <AlertDescription className="text-red-300">
                                  {ratioValidation.error}
                                </AlertDescription>
                              </Alert>
                            ) : (
                              <Alert className="border-green-500/20 bg-green-500/10">
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                                <AlertDescription className="text-green-300">
                                  Ratio is valid for liquidity addition
                                </AlertDescription>
                              </Alert>
                            )
                          )}

                          {/* Pool Share Preview */}
                          {liquidityWETH && liquidityUSDC && (
                            <div className="bg-black/20 rounded-lg p-4">
                              <h4 className="text-white/60 text-sm mb-2">You will receive</h4>
                              <div className="text-lg font-medium text-secondary">
                                {poolState.totalLPSupply === 0 
                                  ? Math.sqrt(parseFloat(liquidityWETH) * parseFloat(liquidityUSDC)).toFixed(18)
                                  : Math.min(
                                      (parseFloat(liquidityWETH) * poolState.totalLPSupply) / poolState.reserve0,
                                      (parseFloat(liquidityUSDC) * poolState.totalLPSupply) / poolState.reserve1
                                    ).toFixed(18)
                                } LP Tokens
                              </div>
                              <div className="text-sm text-white/60 mt-1">
                                Pool share: ~{((parseFloat(liquidityWETH) / (poolState.reserve0 + parseFloat(liquidityWETH))) * 100).toFixed(2)}%
                              </div>
                            </div>
                          )}

                          <Button
                            onClick={handleAddLiquidity}
                            disabled={
                              !liquidityWETH || 
                              !liquidityUSDC || 
                              isLoading || 
                              (isLiveMode && !isConnected) ||
                              (isLiveMode && isConnected && (wethNeedsApproval || usdcNeedsApproval)) ||
                              !ratioValidation.isValid
                            }
                            className="w-full bg-secondary text-black hover:bg-secondary/90 py-6 text-lg font-medium"
                          >
                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Add Liquidity
                          </Button>
                        </TabsContent>

                        <TabsContent value="remove" className="p-6 space-y-6 flex-1">
                          {/* LP Token Balance */}
                          <div className="bg-black/20 rounded-xl p-4 border border-white/10">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-white/60 text-sm">Your LP Position</span>
                              <span className="text-white/60 text-sm">
                                Pool share: {(poolShare / 100).toFixed(2)}%
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2 rounded-lg px-3 py-2">
                                <Image
                                  src="/LPToken.jpg"
                                  alt="LP Token"
                                  width={20}
                                  height={20}
                                  className="rounded-full"
                                />
                                <span className="text-white font-medium">LP Tokens</span>
                              </div>
                              
                              <div className="flex-1 text-right">
                                <div className="text-lg font-light text-white font-mono break-all">
                                  {userBalances.lpToken.toFixed(18)}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Remove Liquidity Input */}
                          <div className="bg-black/20 rounded-xl p-4 border border-white/10">
                            <div className="flex justify-between items-center mb-2">
                            </div>
                            
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2 rounded-lg px-3 py-2">
                                <Image
                                  src="/LPToken.jpg"
                                  alt="LP Token"
                                  width={20}
                                  height={20}
                                  className="rounded-full"
                                />
                                <span className="text-white font-medium">To Remove:</span>
                              </div>
                              
                              <div className="flex-1 flex items-center justify-end relative">
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  value={removeShares}
                                  onChange={(e) => {
                                    const v = e.target.value
                                    if (v === "" || /^\d*\.?\d*$/.test(v)) setRemoveShares(v)
                                  }}
                                  className="w-full text-right text-lg font-light bg-transparent border-none outline-none text-white placeholder-white/40 pr-16 font-mono break-all"
                                  placeholder="0.000000000000000000"
                                />
                                <button 
                                  onClick={() => setRemoveShares(userBalances.lpToken.toString())}
                                  className="absolute right-0 text-red-400 text-xs font-medium hover:text-red-400/80 bg-black/20 px-2 py-1 rounded"
                                >
                                  MAX
                                </button>
                              </div>
                            </div>

                            {/* Percentage Buttons */}
                            <div className="grid grid-cols-4 gap-2 mt-3">
                              {[25, 50, 75, 100].map((percentage) => (
                                <Button
                                  key={percentage}
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setRemoveShares((userBalances.lpToken * percentage / 100).toFixed(18))}
                                  className="bg-transparent border-white/20 text-white/80 hover:bg-white/10"
                                >
                                  {percentage}%
                                </Button>
                              ))}
                            </div>
                          </div>

                          {/* LP Amount Validation Warning */}
                          {removeShares && !lpRemovalValidation.isValid && lpRemovalValidation.warning && (
                            <Alert className="border-yellow-500/20 bg-yellow-500/10">
                              <AlertTriangle className="h-4 w-4 text-yellow-500" />
                              <AlertDescription className="text-yellow-300 text-sm">
                                {lpRemovalValidation.warning}
                              </AlertDescription>
                            </Alert>
                          )}

                          {/* Withdrawal Preview */}
                          {removeShares && !isNaN(parseFloat(removeShares)) && (
                            <div className="bg-black/20 rounded-lg p-4">
                              <h4 className="text-white/60 text-sm mb-3">You will receive</h4>
                              <div className="space-y-2">
                                <div className="flex justify-between">
                                  <span className="text-white/80">WETH:</span>
                                  <span className="text-secondary font-medium font-mono">
                                    {removalEstimate.amount0.toFixed(18)}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-white/80">USDC:</span>
                                  <span className="text-secondary font-medium font-mono">{removalEstimate.amount1.toFixed(6)}</span>
                                </div>
                              </div>
                            </div>
                          )}

                          <Button
                            onClick={handleRemoveLiquidity}
                            disabled={
                              !removeShares || 
                              isLoading || 
                              (isLiveMode && !isConnected) ||
                              !lpRemovalValidation.isValid
                            }
                            className="w-full bg-red-600 hover:bg-red-700 py-6 text-lg font-medium"
                          >
                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Remove Liquidity
                          </Button>
                        </TabsContent>
                      </Tabs>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            </div>

            {/* Educational Content */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="mt-12"
            >
              <Card className="bg-white/5 backdrop-blur-md border-white/10">
                <CardHeader>
                  <CardTitle className="text-secondary text-2xl font-light">Understanding AMM Mechanics</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <h3 className="text-xl font-light mb-3 text-white">Constant Product Formula</h3>
                    <p className="text-white/70 leading-relaxed text-sm">
                      The hyperbola represents <span className="text-secondary font-mono">x × y = k</span>, ensuring the
                      product of reserves remains constant during trades. This mathematical relationship creates
                      automatic price discovery.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-xl font-light mb-3 text-white">Dynamic Pool Balance</h3>
                    <p className="text-white/70 leading-relaxed text-sm">
                      The progress bar shows how the current pool ratio compares to the original 1000 USDC per 1 WETH ratio.
                      When traders swap more USDC for WETH, the bar shifts to show higher USDC concentration.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-xl font-light mb-3 text-white">LP Token Precision</h3>
                    <p className="text-white/70 leading-relaxed text-sm">
                      LP tokens use 18 decimal places and can have very small values. When removing liquidity, ensure
                      your input has at least 6 decimal places for proper transaction processing and to avoid errors.
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
