"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { motion } from "framer-motion"
import Navigation from "@/components/navigation"
import Footer from "@/components/footer"
import AnimatedBackground from "@/components/animated-background"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import {
  ArrowUpDown,
  ChevronDown,
  Loader2,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
} from "lucide-react"
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi"
import { parseUnits, formatUnits, Address } from "viem"
import { useAMM } from "@/contexts/AMMContext"
import { ERC20_ABI } from "@/lib/abis"
import PoolStatistics from "@/components/PoolStatistics"
import Image from "next/image"
import React from "react"


/* --------------------------------------------------- */
/*                  CONST & HELPERS                     */
/* --------------------------------------------------- */

const CONTRACTS = {
  AMM: process.env.NEXT_PUBLIC_AMM_CONTRACT_ADDRESS as Address,
  WETH: "0x4200000000000000000000000000000000000006" as Address,
  USDC: "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as Address,
} as const

const DECIMALS = { WETH: 18, USDC: 6 } as const

const CustomDot = (props: any) => {
  const { cx, cy, payload } = props
  return payload?.isCurrent ? (
    <circle cx={cx} cy={cy} r={8} fill="#00bcd4" stroke="#ffffff" strokeWidth={3} className="animate-pulse" />
  ) : null
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  const data = payload[0].payload
  return (
    <div className="bg-black/90 backdrop-blur-md border border-white/20 rounded-lg p-3 text-sm">
      <p className="text-secondary font-medium">
        {data.isCurrent ? "Current Pool Position" : "Curve Point"}
      </p>
      <p className="text-white">WETH&nbsp;: {label}</p>
      <p className="text-white">USDC&nbsp;: {payload[0].value.toFixed(2)}</p>
      <p className="text-cyan-400">k = {(label * payload[0].value).toFixed(0)}</p>
    </div>
  )
}

// Memoized chart component to prevent unnecessary re-renders
const MemoizedChart = React.memo(({ curveData }: { curveData: Array<{ x: number; curveY: number; isCurrent: boolean }> }) => (
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
))

/* --------------------------------------------------- */
/*                      COMPONENT                       */
/* --------------------------------------------------- */

export default function SwapPage() {
  const [mounted, setMounted] = useState(false)
  const { address, isConnected } = useAccount()

  /* ------------- AMM CONTEXT ------------- */
  const {
    mode,
    isMockMode,
    isLiveMode,
    poolState,
    userBalances,
    k,
    currentPrice,
    getSwapEstimate,
    executeSwap,
    resetPool,
    refreshUserBalances,
    isLoading,
    error,
    pendingTransaction,
    getUserPoolShare,
  } = useAMM()

  /* ------------- LOCAL STATE ------------- */
  const [swapAmount, setSwapAmount] = useState("")
  const [fromToken, setFromToken] = useState<"WETH" | "USDC">("WETH")
  const [toToken, setToToken] = useState<"WETH" | "USDC">("USDC")
  const [showSlippageSettings, setShowSlippageSettings] = useState(false)

  /* ------------- ALLOWANCE HANDLING ------------- */
  const {
    data: wethAllowance,
    refetch: refetchWethAllowance,
  } = useReadContract({
    address: CONTRACTS.WETH,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address && CONTRACTS.AMM ? [address, CONTRACTS.AMM] : undefined,
    query: { enabled: isLiveMode && isConnected && !!address },
  })

  const {
    data: usdcAllowance,
    refetch: refetchUsdcAllowance,
  } = useReadContract({
    address: CONTRACTS.USDC,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address && CONTRACTS.AMM ? [address, CONTRACTS.AMM] : undefined,
    query: { enabled: isLiveMode && isConnected && !!address },
  })

  const { writeContract: writeApproval, data: approvalHash, isPending: isApprovalPending } =
    useWriteContract()
  const { isSuccess: isApprovalConfirmed } = useWaitForTransactionReceipt({ hash: approvalHash })

  const needsApproval = useMemo(() => {
    if (!isLiveMode || !isConnected || !swapAmount) return false
    const amount = parseUnits(swapAmount || "0", DECIMALS[fromToken])
    const allowance = fromToken === "WETH" ? wethAllowance : usdcAllowance
    return !allowance || (allowance as bigint) < amount
  }, [isLiveMode, isConnected, swapAmount, fromToken, wethAllowance, usdcAllowance])

  const requestApproval = useCallback(async () => {
    if (!swapAmount || !address) return
    const amount = parseUnits(swapAmount, DECIMALS[fromToken])
    const tokenAddress = fromToken === "WETH" ? CONTRACTS.WETH : CONTRACTS.USDC
    writeApproval({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [CONTRACTS.AMM, amount],
    })
  }, [swapAmount, fromToken, writeApproval, address])

  useEffect(() => {
    if (isApprovalConfirmed) {
      refetchWethAllowance()
      refetchUsdcAllowance()
    }
  }, [isApprovalConfirmed, refetchWethAllowance, refetchUsdcAllowance])

  /* ------------- CURVE DATA ------------- */
  const curveData = useMemo(() => {
    const data: { x: number; curveY: number; isCurrent: boolean }[] = []
    if (k === 0) return data
    const start = Math.max(200, poolState.reserve0 * 0.2)
    const end = poolState.reserve0 * 3
    const step = (end - start) / 100
    for (let x = start; x <= end; x += step) {
      const y = k / x
      data.push({
        x: Number(x.toFixed(2)),
        curveY: Number(y.toFixed(2)),
        isCurrent: Math.abs(x - poolState.reserve0) < poolState.reserve0 * 0.05,
      })
    }
    return data
  }, [k, poolState.reserve0])

  /* ------------- EXPECTED OUTPUT & IMPACT ------------- */
  const expectedOutput = useMemo(() => {
    if (!swapAmount || Number(swapAmount) <= 0) return 0
    return getSwapEstimate(fromToken, Number(swapAmount))
  }, [swapAmount, fromToken, getSwapEstimate])

  const priceImpact = useMemo(() => {
    if (!swapAmount || expectedOutput === 0) return 0
    const input = Number(swapAmount)
    const currentRate = fromToken === "WETH" ? currentPrice : 1 / currentPrice
    const expectedRate = expectedOutput / input
    return ((expectedRate - currentRate) / currentRate) * 100
  }, [swapAmount, expectedOutput, fromToken, currentPrice])

  /* ------------- HANDLERS ------------- */
  const handleSwap = async () => {
    if (!swapAmount || Number(swapAmount) <= 0) return
    if (isLiveMode && !isConnected) {
      alert("Connect wallet to swap in live mode")
      return
    }
    if (needsApproval) {
      alert(`Approve ${fromToken} first`)
      return
    }
    try {
      await executeSwap(fromToken, Number(swapAmount))
      setSwapAmount("")
    } catch (err) {
      console.error("Swap failed:", err)
    }
  }

  const switchTokens = () => {
    setFromToken(toToken)
    setToToken(fromToken)
    setSwapAmount("")
  }

  const setMaxAmount = () => {
    const max = fromToken === "WETH" ? userBalances.weth : userBalances.usdc
    setSwapAmount(max.toString())
  }

  useEffect(() => setMounted(true), [])
  if (!mounted)
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-secondary border-t-transparent rounded-full animate-spin" />
      </div>
    )

  /* --------------------------------------------------- */
  /*                     RENDER                          */
  /* --------------------------------------------------- */

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      <AnimatedBackground />

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1 }} className="relative z-10">
        <Navigation />

        {/* MAIN */}
        <main className="pt-20 px-3 sm:px-4 lg:px-6">
          <div className="max-w-[1400px] mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <Image
                  src="/LPToken.jpg"
                  alt="LP Token"
                  width={50}
                  height={50}
                  className="rounded-full border-2 border-black"
                />
                <div>
                  <h1 className="text-3xl font-light">WETH / USDC Token Swap</h1>
                </div>
              </div>
            </div>

            {/* Alerts */}
            {isLiveMode && !isConnected && (
              <Alert className="mb-6 border-yellow-500/20 bg-yellow-500/10">
                <AlertCircle className="h-4 w-4 text-yellow-500" />
                <AlertDescription className="text-yellow-300">
                  Connect your wallet to swap tokens in live mode
                </AlertDescription>
              </Alert>
            )}

            {error && (
              <Alert className="mb-6 border-red-500/20 bg-red-500/10">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <AlertDescription className="text-red-300">{error}</AlertDescription>
              </Alert>
            )}

            {(isLoading || isApprovalPending) && (
              <Alert className="mb-6 border-blue-500/20 bg-blue-500/10">
                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                <AlertDescription className="text-blue-300">
                  {isApprovalPending ? "Awaiting approval confirmation..." : "Processing transaction..."}
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

            {/* GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Chart and Pool Stats */}
              <div className="lg:col-span-2 space-y-5">
                <Card className="bg-white/5 backdrop-blur-md border-white/10">
                  <CardHeader>
                    <CardTitle className="text-secondary text-xl font-light">
                      Trading Curve (x × y = k)
                    </CardTitle>
                    <CardDescription className="text-white/60">
                      Visualize how your swap affects the pool reserves
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <MemoizedChart curveData={curveData} />
                  </CardContent>
                </Card>

                {/* Pool Statistics Component */}
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
              </div>

              {/* Swap Interface */}
              <div className="lg:col-span-1">
                <Card className="bg-white/5 backdrop-blur-md border-white/10 h-full">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-white text-lg font-light">Swap Tokens</CardTitle>
                  </CardHeader>

                  <CardContent className="space-y-6">

                    {/* FROM token */}
                    <div className="bg-black/20 rounded-xl p-4 border border-white/10">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-white/60 text-sm">From</span>
                        <span className="text-white/60 text-sm">
                          Balance:&nbsp;
                          {fromToken === "WETH"
                            ? userBalances.weth.toFixed(6)
                            : userBalances.usdc.toFixed(2)}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">

                          <div className="flex items-center gap-2 rounded-lg px-3 py-2">
                            <Image
                              src={fromToken === "WETH" ? "/weth.svg" : "/usdc.svg"}
                              alt={fromToken}
                              width={20}
                              height={20}
                              className="rounded-full"
                            />
                            <span className="text-white font-medium">{fromToken}</span>
                          </div>

                        {/* Amount input */}
                        <div className="ml-auto text-right flex-1 relative">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={swapAmount}
                            onChange={(e) => {
                              const v = e.target.value
                              if (v === "" || /^\d*\.?\d*$/.test(v)) setSwapAmount(v)
                            }}
                            className="w-full text-right text-2xl font-light bg-transparent border-none outline-none text-white placeholder-white/40 pr-12"
                            placeholder="0.0"
                          />
                          <button
                            onClick={setMaxAmount}
                            className="absolute right-0 top-1/2 -translate-y-1/2 text-secondary text-xs font-medium hover:text-secondary/80 bg-black/20 px-2 py-1 rounded"
                          >
                            MAX
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Flip button */}
                    <div className="flex justify-center">
                      <Button
                        onClick={switchTokens}
                        variant="outline"
                        size="sm"
                        className="w-10 h-10 rounded-full bg-white/10 border-white/20 hover:bg-white/20"
                      >
                        <ArrowUpDown size={16} />
                      </Button>
                    </div>

                    {/* TO token */}
                    <div className="bg-black/20 rounded-xl p-4 border border-white/10">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-white/60 text-sm">To</span>
                        <span className="text-white/60 text-sm">
                          Balance:&nbsp;
                          {toToken === "WETH" ? userBalances.weth.toFixed(6) : userBalances.usdc.toFixed(2)}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2 rounded-lg px-3 py-2">
                            <Image
                              src={toToken === "USDC" ? "/usdc.svg" : "/weth.svg"}
                              alt={toToken}
                              width={20}
                              height={20}
                              className="rounded-full"
                            />
                            <span className="text-white font-medium">{toToken}</span>
                          </div>

                        <div className="ml-auto text-right flex-1 relative">
                          <div className="text-2xl font-light text-white/60 pr-12">
                            {expectedOutput > 0
                              ? expectedOutput.toFixed(toToken === "WETH" ? 6 : 2)
                              : "0.0"}
                          </div>
                          {/* Invisible spacer to match FROM token alignment */}
                          <div className="absolute right-0 w-12 h-6"></div>
                        </div>
                      </div>
                    </div>

                    {/* Swap details */}
                    <div className="bg-black/20 rounded-lg p-4">
                      <h4 className="text-white/60 text-sm mb-3">Transaction Details</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-white/60">Price Impact:</span>
                          <span className={Math.abs(priceImpact) > 5 ? "text-red-400" : "text-secondary"}>
                            {priceImpact.toFixed(2)}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/60">Expected to Receive:</span>
                          <span className="text-secondary font-bold">
                            {expectedOutput.toFixed(toToken === "WETH" ? 6 : 2)} {toToken}
                          </span>
                        </div>
                        {swapAmount && expectedOutput > 0 && (
                          <div className="flex justify-between">
                            <span className="text-white/60">Exchange Rate:</span>
                            <span className="text-white">
                              1 {fromToken} ≈ {(expectedOutput / Number(swapAmount)).toFixed(6)} {toToken}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Approve OR Swap button */}
                    {needsApproval ? (
                      <Button
                        onClick={requestApproval}
                        disabled={isApprovalPending || isLoading || !swapAmount}
                        className="w-full bg-yellow-600 hover:bg-yellow-700 py-6 text-lg font-medium"
                      >
                        {isApprovalPending ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Waiting for approval…
                          </>
                        ) : (
                          `Approve ${fromToken}`
                        )}
                      </Button>
                    ) : (
                      <Button
                        onClick={handleSwap}
                        disabled={
                          !swapAmount ||
                          Number(swapAmount) <= 0 ||
                          isLoading ||
                          (isLiveMode && !isConnected) ||
                          fromToken === toToken
                        }
                        className="w-full bg-secondary text-black hover:bg-secondary/90 font-medium py-6 text-lg"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Swapping…
                          </>
                        ) : (
                          "Swap Tokens"
                        )}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </main>

        <Footer />
      </motion.div>
    </div>
  )
}
