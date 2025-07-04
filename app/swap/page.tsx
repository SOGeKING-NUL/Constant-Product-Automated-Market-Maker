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
import { ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Scatter } from "recharts"
import { ChevronRight, Share, Settings, ArrowUpDown, ChevronDown, Loader2, AlertCircle, RefreshCw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAMM } from "@/contexts/AMMContext"
import { useAccount } from 'wagmi'

// Custom dot component for highlighting positions
const CustomPositionDot = (props: any) => {
  const { cx, cy, payload } = props;
  
  if (payload?.isCurrent) {
    return (
      <g>
        <circle cx={cx} cy={cy} r={10} fill="#00bcd4" stroke="#ffffff" strokeWidth={3} className="animate-pulse" />
        <circle cx={cx} cy={cy} r={15} fill="none" stroke="#00bcd4" strokeWidth={2} opacity={0.6} />
      </g>
    );
  } else if (payload?.isProjected) {
    return (
      <g>
        <circle cx={cx} cy={cy} r={8} fill="#ff8c00" stroke="#ffffff" strokeWidth={2} />
        <circle cx={cx} cy={cy} r={12} fill="none" stroke="#ff8c00" strokeWidth={1} opacity={0.7} />
      </g>
    );
  }
  return null;
}

// Custom tooltip component
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="bg-black/95 backdrop-blur-md border border-white/30 rounded-lg p-4 text-sm shadow-xl">
        <p className="text-[#a5f10d] font-semibold text-base mb-2">
          {data.isCurrent ? "🎯 Current Pool Position" : 
           data.isProjected ? "📊 After Swap Position" : "📈 Curve Point"}
        </p>
        <div className="space-y-1">
          <p className="text-white font-medium">WETH: <span className="text-blue-300">{typeof label === 'number' ? label.toFixed(4) : label}</span></p>
          <p className="text-white font-medium">USDC: <span className="text-green-300">{payload[0].value?.toFixed(2)}</span></p>
          <p className="text-cyan-400 font-medium">k = <span className="text-yellow-300">{((typeof label === 'number' ? label : 0) * (payload[0].value || 0)).toFixed(0)}</span></p>
        </div>
      </div>
    )
  }
  return null
}

export default function SwapPage() {
  const [mounted, setMounted] = useState(false)
  const { address, isConnected } = useAccount()

  // Direct context access from AMM
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
    error
  } = useAMM()

  // Local state for swap interface
  const [swapAmount, setSwapAmount] = useState('')
  const [fromToken, setFromToken] = useState<'WETH' | 'USDC'>('WETH')
  const [toToken, setToToken] = useState<'WETH' | 'USDC'>('USDC')
  const [slippage, setSlippage] = useState(0.5)

  // Token configuration
  const tokens = [
    { 
      symbol: "WETH" as const, 
      name: "Wrapped Ethereum", 
      balance: userBalances.weth,
      icon: "W"
    },
    { 
      symbol: "USDC" as const, 
      name: "USD Coin", 
      balance: userBalances.usdc,
      icon: "U"
    },
  ]

  // Generate combined chart data with curve and positions
  const generateChartData = useCallback(() => {
    const currentK = poolState.reserve0 * poolState.reserve1
    
    if (currentK === 0) return []

    // Generate curve points
    const minX = Math.max(100, poolState.reserve0 * 0.2)
    const maxX = poolState.reserve0 * 3
    const step = (maxX - minX) / 100
    const data = []

    for (let x = minX; x <= maxX; x += step) {
      const y = currentK / x
      if (y > 0) {
        data.push({
          x: parseFloat(x.toFixed(2)),
          curveY: parseFloat(y.toFixed(2)),
          isCurrent: false,
          isProjected: false
        })
      }
    }

    // Add current position
    data.push({
      x: parseFloat(poolState.reserve0.toFixed(2)),
      curveY: parseFloat(poolState.reserve1.toFixed(2)),
      isCurrent: true,
      isProjected: false
    })

    // Add projected position if swap amount is entered
    if (swapAmount && parseFloat(swapAmount) > 0) {
      const inputAmount = parseFloat(swapAmount)
      let newReserve0, newReserve1
      
      if (fromToken === 'WETH') {
        newReserve0 = poolState.reserve0 + inputAmount
        newReserve1 = currentK / newReserve0
      } else {
        newReserve1 = poolState.reserve1 + inputAmount
        newReserve0 = currentK / newReserve1
      }
      
      data.push({
        x: parseFloat(newReserve0.toFixed(2)),
        curveY: parseFloat(newReserve1.toFixed(2)),
        isCurrent: false,
        isProjected: true
      })
    }

    return data.sort((a, b) => a.x - b.x)
  }, [poolState.reserve0, poolState.reserve1, swapAmount, fromToken])

  const chartData = generateChartData()

  // Calculate expected output and price impact
  const expectedOutput = useMemo(() => {
    if (!swapAmount || isNaN(parseFloat(swapAmount)) || parseFloat(swapAmount) <= 0) {
      return 0;
    }
    return getSwapEstimate(fromToken, parseFloat(swapAmount));
  }, [swapAmount, fromToken, getSwapEstimate]);

  const priceImpact = useMemo(() => {
    if (!swapAmount || expectedOutput <= 0) return 0;
    
    const inputAmount = parseFloat(swapAmount);
    const currentRate = fromToken === 'WETH' ? 
      poolState.reserve1 / poolState.reserve0 : 
      poolState.reserve0 / poolState.reserve1;
    
    const effectiveRate = expectedOutput / inputAmount;
    return ((currentRate - effectiveRate) / currentRate) * 100;
  }, [swapAmount, expectedOutput, fromToken, poolState.reserve0, poolState.reserve1]);

  // Execute swap function - NO APPROVAL NEEDED
  const handleSwap = async () => {
    if (!swapAmount || parseFloat(swapAmount) <= 0) return;
    
    const inputAmount = parseFloat(swapAmount);
    const userBalance = fromToken === 'WETH' ? userBalances.weth : userBalances.usdc;
    
    // Check if user has sufficient balance
    if (inputAmount > userBalance) {
      alert(`Insufficient ${fromToken} balance. You have ${userBalance.toFixed(fromToken === 'WETH' ? 4 : 2)} ${fromToken}`);
      return;
    }
    
    try {
      await executeSwap(fromToken, inputAmount);
      setSwapAmount('');
    } catch (error) {
      console.error('Swap failed:', error);
    }
  }

  // Swap tokens function
  const swapTokens = () => {
    const oldFromToken = fromToken;
    setFromToken(toToken);
    setToToken(oldFromToken);
    setSwapAmount(''); // Clear amount when swapping
  }

  // Get user balance for selected token
  const getUserBalance = (tokenSymbol: 'WETH' | 'USDC') => {
    return tokenSymbol === 'WETH' ? userBalances.weth : userBalances.usdc;
  };

  // Set max amount for selected token
  const setMaxAmount = () => {
    const balance = getUserBalance(fromToken);
    setSwapAmount(balance.toString());
  };

  // Listen to mode changes from navigation
  useEffect(() => {
    setSwapAmount('');
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
                    Please connect your wallet to swap tokens in live mode
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
            {isLoading && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6"
              >
                <Alert className="border-blue-500 bg-blue-500/10">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <AlertDescription className="text-blue-300">
                    Processing swap transaction...
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
              <span>Swap</span>
              <ChevronRight size={16} />
              <span className="text-white">
                {fromToken} / {toToken}
              </span>
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
                  <span className="text-white font-bold">S</span>
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-light">
                      {fromToken} / {toToken}
                    </h1>
                    <span className="bg-white/10 px-2 py-1 rounded text-sm">v4</span>
                    <span className="bg-white/10 px-2 py-1 rounded text-sm">0.30%</span>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-pink-500 rounded-full"></div>
                      <span className="text-pink-400 text-sm">Best price route</span>
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
              {/* Left Section - Price and Chart */}
              <div className="lg:col-span-3 space-y-6">
                {/* Price Display */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                >
                  <div className="text-4xl font-light mb-2">
                    {fromToken === 'WETH' ? 
                      (poolState.reserve1 / poolState.reserve0).toFixed(2) : 
                      (poolState.reserve0 / poolState.reserve1).toFixed(6)
                    } {toToken}
                  </div>
                  <div className="text-white/60">per {fromToken}</div>
                </motion.div>

                {/* Fixed Hyperbola Visualization */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                >
                  <Card className="bg-white/5 backdrop-blur-md border-white/10">
                    <CardHeader>
                      <CardTitle className="text-[#a5f10d] text-xl font-light">
                        Trading Curve (x × y = k = {k.toLocaleString()})
                      </CardTitle>
                      <CardDescription className="text-white/60">
                        Static curve showing current pool state - {isMockMode ? 'Simulation' : 'Live Data'}
                        {swapAmount && parseFloat(swapAmount) > 0 && (
                          <span className="block text-yellow-400 mt-1">
                            Orange dot shows position after swap
                          </span>
                        )}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-96">
                        <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart 
                            data={chartData} 
                            margin={{ top: 20, right: 40, left: 80, bottom: 80 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                            <XAxis 
                              type="number"
                              dataKey="x"
                              domain={['dataMin - 100', 'dataMax + 100']}
                              stroke="rgba(255,255,255,0.6)"
                              tick={{ fontSize: 12 }}
                              label={{ 
                                value: "WETH Reserves", 
                                position: "insideBottom", 
                                offset: -20,
                                style: { textAnchor: 'middle', fill: '#ffffff', fontSize: '14px' }
                              }}
                            />
                            <YAxis 
                              type="number"
                              domain={['dataMin - 100000', 'dataMax + 100000']}
                              stroke="rgba(255,255,255,0.6)"
                              tick={{ fontSize: 12 }}
                              width={60}
                              label={{ 
                                value: "USDC Reserves", 
                                angle: -90, 
                                position: "insideLeft",
                                offset: 40,
                                style: { textAnchor: 'middle', fill: '#ffffff', fontSize: '14px' }
                              }}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            
                            {/* Static curve line */}
                            <Line
                              type="monotone"
                              dataKey="curveY"
                              stroke="#a5f10d"
                              strokeWidth={3}
                              dot={false}
                              activeDot={false}
                              connectNulls={false}
                            />
                            
                            {/* Position markers */}
                            <Scatter
                              dataKey="curveY"
                              shape={<CustomPositionDot />}
                            />
                          </ComposedChart>
                        </ResponsiveContainer>
                      </div>
                      
                      {/* Legend */}
                      <div className="flex justify-center mt-4 space-x-6">
                        <div className="flex items-center">
                          <div className="w-4 h-1 bg-[#a5f10d] mr-2"></div>
                          <span className="text-sm text-gray-300">Trading Curve (x × y = k)</span>
                        </div>
                        <div className="flex items-center">
                          <div className="w-3 h-3 bg-[#00bcd4] rounded-full mr-2 border border-white"></div>
                          <span className="text-sm text-gray-300">Current Position</span>
                        </div>
                        {swapAmount && parseFloat(swapAmount) > 0 && (
                          <div className="flex items-center">
                            <div className="w-3 h-3 bg-[#ff8c00] rounded-full mr-2 border border-white"></div>
                            <span className="text-sm text-gray-300">After Swap</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>

              {/* Right Sidebar - Swap Interface */}
              <div className="lg:col-span-1 space-y-6">
                {/* User Balances - Improved Visibility */}
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
                      {isConnected && (
                        <div className="text-xs text-white/60 mt-4 pt-3 border-t border-white/20 text-center">
                          Connected: {address?.slice(0, 6)}...{address?.slice(-4)}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Swap Interface - Improved Visibility */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                >
                  <Card className="bg-white/5 backdrop-blur-md border-white/10">
                    <CardHeader>
                      <CardTitle className="text-white text-lg font-light">Swap Tokens</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* From Token */}
                      <div className="bg-black/30 rounded-xl p-4 border border-white/10">
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-white/80 text-sm font-medium">From</span>
                          <div className="flex items-center gap-2">
                            <span className="text-white/80 text-sm">
                              Balance: {getUserBalance(fromToken).toFixed(fromToken === 'WETH' ? 4 : 2)}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={setMaxAmount}
                              className="text-xs h-6 px-2 border-purple-500 text-purple-400 hover:bg-purple-500/10"
                              disabled={getUserBalance(fromToken) <= 0}
                            >
                              MAX
                            </Button>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Select value={fromToken} onValueChange={(value: 'WETH' | 'USDC') => setFromToken(value)}>
                            <SelectTrigger className="w-32 bg-transparent border-none p-0">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-[#a5f10d] rounded-full flex items-center justify-center">
                                  <span className="text-black font-bold text-sm">{fromToken[0]}</span>
                                </div>
                                <span className="text-white font-medium text-lg">{fromToken}</span>
                                <ChevronDown size={16} />
                              </div>
                            </SelectTrigger>
                            <SelectContent className="bg-black/90 border-white/20">
                              {tokens.map((token) => (
                                <SelectItem key={token.symbol} value={token.symbol} className="text-white">
                                  <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 bg-[#a5f10d] rounded-full flex items-center justify-center">
                                      <span className="text-black font-bold text-xs">{token.icon}</span>
                                    </div>
                                    {token.symbol}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <div className="ml-auto text-right">
                            <Input
                              type="number"
                              value={swapAmount}
                              onChange={(e) => setSwapAmount(e.target.value)}
                              className="text-right text-2xl font-light bg-transparent border-none p-0 h-auto text-white"
                              placeholder="0.0"
                              step="any"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Swap Button */}
                      <div className="flex justify-center">
                        <Button
                          onClick={swapTokens}
                          variant="outline"
                          size="sm"
                          className="w-10 h-10 rounded-full bg-white/10 border-white/20 hover:bg-white/20"
                        >
                          <ArrowUpDown size={16} />
                        </Button>
                      </div>

                      {/* To Token */}
                      <div className="bg-black/30 rounded-xl p-4 border border-white/10">
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-white/80 text-sm font-medium">To</span>
                          <span className="text-white/80 text-sm">
                            Balance: {getUserBalance(toToken).toFixed(toToken === 'WETH' ? 4 : 2)}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Select value={toToken} onValueChange={(value: 'WETH' | 'USDC') => setToToken(value)}>
                            <SelectTrigger className="w-32 bg-transparent border-none p-0">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                                  <span className="text-white font-bold text-sm">{toToken[0]}</span>
                                </div>
                                <span className="text-white font-medium text-lg">{toToken}</span>
                                <ChevronDown size={16} />
                              </div>
                            </SelectTrigger>
                            <SelectContent className="bg-black/90 border-white/20">
                              {tokens.map((token) => (
                                <SelectItem key={token.symbol} value={token.symbol} className="text-white">
                                  <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                                      <span className="text-white font-bold text-xs">{token.icon}</span>
                                    </div>
                                    {token.symbol}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <div className="ml-auto text-right">
                            <div className="text-2xl font-light text-white font-bold">
                              {expectedOutput > 0 ? expectedOutput.toFixed(toToken === 'WETH' ? 6 : 2) : "0.0"}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Swap Details - Improved Visibility */}
                      <div className="bg-black/30 rounded-lg p-4 space-y-3 border border-white/10">
                        <div className="flex justify-between text-sm">
                          <span className="text-white/80 font-medium">Price Impact:</span>
                          <span className={`font-bold ${Math.abs(priceImpact) > 5 ? "text-red-400" : "text-[#a5f10d]"}`}>
                            {priceImpact.toFixed(2)}%
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-white/80 font-medium">Slippage Tolerance:</span>
                          <span className="text-white font-bold">{slippage}%</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-white/80 font-medium">Minimum Received:</span>
                          <span className="text-white font-bold">
                            {(expectedOutput * (1 - slippage / 100)).toFixed(toToken === 'WETH' ? 6 : 2)} {toToken}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-white/80 font-medium">Fee (0.3%):</span>
                          <span className="text-white font-bold">
                            {swapAmount ? (parseFloat(swapAmount) * 0.003).toFixed(fromToken === 'WETH' ? 6 : 2) : '0'} {fromToken}
                          </span>
                        </div>
                      </div>

                      <Button
                        onClick={handleSwap}
                        disabled={
                          !swapAmount || 
                          parseFloat(swapAmount) <= 0 || 
                          isLoading ||
                          (isLiveMode && !isConnected) ||
                          parseFloat(swapAmount) > getUserBalance(fromToken)
                        }
                        className="w-full bg-[#a5f10d] text-black hover:bg-[#a5f10d]/90 font-medium py-6 text-lg"
                      >
                        {isLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : null}
                        {parseFloat(swapAmount) > getUserBalance(fromToken) ? 
                          `Insufficient ${fromToken} Balance` : 
                          'Swap Tokens'
                        }
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Pool Stats - Improved Visibility */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.5 }}
                >
                  <Card className="bg-white/5 backdrop-blur-md border-white/10">
                    <CardHeader>
                      <CardTitle className="text-white text-lg font-light">Pool Info</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="bg-black/30 rounded-lg p-4 border border-white/10">
                        <div className="text-white/80 text-sm mb-3 font-medium">Pool Reserves</div>
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
                        <div className="text-white/80 text-sm mb-2 font-medium">Pool Constant (k)</div>
                        <div className="text-[#a5f10d] font-medium font-mono text-lg">{k.toLocaleString()}</div>
                      </div>
                      
                      <div className="bg-black/30 rounded-lg p-4 border border-white/10">
                        <div className="text-white/80 text-sm mb-3 font-medium">Exchange Rates</div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between items-center">
                            <span className="text-white/70">1 WETH =</span>
                            <span className="font-mono text-white font-bold">{(poolState.reserve1 / poolState.reserve0).toFixed(2)} USDC</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-white/70">1 USDC =</span>
                            <span className="font-mono text-white font-bold">{(poolState.reserve0 / poolState.reserve1).toFixed(6)} WETH</span>
                          </div>
                        </div>
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
                  <CardTitle className="text-[#a5f10d] text-2xl font-light">Understanding Token Swaps</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-black/20 rounded-lg p-6 border border-white/10">
                    <h3 className="text-xl font-light mb-3 text-white">💹 Price Impact</h3>
                    <p className="text-white/70 leading-relaxed text-sm">
                      Larger swaps move further along the curve, resulting in higher price impact. The AMM automatically
                      adjusts prices based on supply and demand, with larger trades receiving progressively worse rates.
                    </p>
                  </div>
                  <div className="bg-black/20 rounded-lg p-6 border border-white/10">
                    <h3 className="text-xl font-light mb-3 text-white">🛡️ Slippage Protection</h3>
                    <p className="text-white/70 leading-relaxed text-sm">
                      Set slippage tolerance to protect against price changes during transaction execution. Higher
                      slippage allows trades in volatile conditions but may result in worse prices.
                    </p>
                  </div>
                  <div className="bg-black/20 rounded-lg p-6 border border-white/10">
                    <h3 className="text-xl font-light mb-3 text-white">⚡ Direct Swaps</h3>
                    <p className="text-white/70 leading-relaxed text-sm">
                      AMM swaps happen directly in one transaction - no token approvals needed! Your tokens are transferred
                      to the pool and you receive the output tokens immediately based on the constant product formula.
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
