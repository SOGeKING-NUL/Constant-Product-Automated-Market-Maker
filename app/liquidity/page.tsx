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
      // Calculate USDC amount based on current pool ratio
      const requiredUSDC = (amount * poolState.reserve1) / poolState.reserve0
      // Round to 6 decimal places for USDC precision
      return requiredUSDC.toFixed(6)
    } else {
      // Calculate WETH amount based on current pool ratio
      const requiredWETH = (amount * poolState.reserve0) / poolState.reserve1
      // Round to 18 decimal places for WETH precision
      return requiredWETH.toFixed(18)
    }
  }, [poolState.reserve0, poolState.reserve1])

  // Calculate optimal amounts for MAX button to ensure perfect ratio compliance
  const calculateOptimalAmounts = useCallback((maxToken: 'WETH' | 'USDC'): { weth: string; usdc: string } => {
    if (poolState.reserve0 <= 0 || poolState.reserve1 <= 0) {
      return { weth: '', usdc: '' }
    }

    const maxBalance = maxToken === 'WETH' ? userBalances.weth : userBalances.usdc
    
    if (maxToken === 'WETH') {
      const maxWETH = maxBalance
      const requiredUSDC = (maxWETH * poolState.reserve1) / poolState.reserve0
      
      // Check if user has enough USDC
      if (requiredUSDC <= userBalances.usdc) {
        return {
          weth: maxWETH.toFixed(18),
          usdc: requiredUSDC.toFixed(6)
        }
      } else {
        // Calculate maximum WETH based on available USDC
        const maxWETHFromUSDC = (userBalances.usdc * poolState.reserve0) / poolState.reserve1
        return {
          weth: maxWETHFromUSDC.toFixed(18),
          usdc: userBalances.usdc.toFixed(6)
        }
      }
    } else {
      const maxUSDC = maxBalance
      const requiredWETH = (maxUSDC * poolState.reserve0) / poolState.reserve1
      
      // Check if user has enough WETH
      if (requiredWETH <= userBalances.weth) {
        return {
          weth: requiredWETH.toFixed(18),
          usdc: maxUSDC.toFixed(6)
        }
      } else {
        // Calculate maximum USDC based on available WETH
        const maxUSDCFromWETH = (userBalances.weth * poolState.reserve1) / poolState.reserve0
        return {
          weth: userBalances.weth.toFixed(18),
          usdc: maxUSDCFromWETH.toFixed(6)
        }
      }
    }
  }, [poolState.reserve0, poolState.reserve1, userBalances.weth, userBalances.usdc])

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

  // Handle USDC input change - always auto-calculate
  const handleUSDCChange = useCallback((value: string) => {
    setLiquidityUSDC(value)
    
    if (value && !isNaN(parseFloat(value))) {
      const requiredWETH = calculateRequiredAmount('USDC', value)
      if (requiredWETH) {
        setLiquidityWETH(requiredWETH)
      }
    } else {
      setLiquidityWETH('')
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
      // Match contract's ratio validation logic exactly
      const left = poolState.reserve0 * usdcAmount;
      const right = poolState.reserve1 * wethAmount;
      const diff = Math.abs(left - right);
      
      // Contract uses: require(diff * 10000 <= left * 100, "Invalid ratio");
      // This translates to: diff <= left * 0.01 (1% tolerance)
      if (diff * 10000 > left * 100) {
        const currentRatio = poolState.reserve1 / poolState.reserve0
        const inputRatio = usdcAmount / wethAmount
        return { 
          isValid: false, 
          error: `Ratio mismatch. Current: ${currentRatio.toFixed(2)} USDC/WETH, Your ratio: ${inputRatio.toFixed(2)}. Must be within 1% tolerance.` 
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
              {/* Left Section - Pool Analytics (2/3 width) */}
              <div className="lg:col-span-2">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
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
                    pageType="liquidity"
                    showOptions={{
                      showUserPoolShare: true,
                      showPoolConstant: true,
                      showCurrentPrice: true,
                      showRefreshButton: true,
                      showResetButton: true,
                      showLiquidityDepth: true,
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
                                  onClick={() => {
                                    const optimalAmounts = calculateOptimalAmounts('WETH')
                                    setLiquidityWETH(optimalAmounts.weth)
                                    setLiquidityUSDC(optimalAmounts.usdc)
                                  }}
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
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  value={liquidityUSDC}
                                  onChange={(e) => {
                                    const v = e.target.value
                                    if (v === "" || /^\d*\.?\d*$/.test(v)) handleUSDCChange(v)
                                  }}
                                  className="w-full text-right text-2xl font-light bg-transparent border-none outline-none text-white placeholder-white/40 pr-16"
                                  placeholder="0.0"
                                />
                                <button 
                                  onClick={() => {
                                    const optimalAmounts = calculateOptimalAmounts('USDC')
                                    setLiquidityWETH(optimalAmounts.weth)
                                    setLiquidityUSDC(optimalAmounts.usdc)
                                  }}
                                  className="absolute right-0 text-secondary text-xs font-medium hover:text-secondary/80 bg-black/20 px-2 py-1 rounded"
                                >
                                  MAX
                                </button>
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
                            <div className="space-y-3">
                              {/* Ratio Information */}
                              <div className="bg-black/20 rounded-lg p-3">
                                <div className="text-sm text-white/60 mb-2">Ratio Information</div>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <span className="text-white/60">Current Pool:</span>
                                    <span className="text-white ml-2">{(poolState.reserve1 / poolState.reserve0).toFixed(2)} USDC/WETH</span>
                                  </div>
                                  <div>
                                    <span className="text-white/60">Your Input:</span>
                                    <span className="text-white ml-2">{(parseFloat(liquidityUSDC) / parseFloat(liquidityWETH)).toFixed(2)} USDC/WETH</span>
                                  </div>
                                </div>
                                <div className="text-xs text-white/40 mt-2">
                                  ⓘ Ratio must be within 1% tolerance of the current pool ratio
                                </div>
                              </div>
                              
                              {/* Validation Alert */}
                              {!ratioValidation.isValid ? (
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
                              )}
                            </div>
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
