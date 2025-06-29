"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import Navigation from "@/components/navigation"
import Footer from "@/components/footer"
import AnimatedBackground from "@/components/animated-background"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select"
import { ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { ChevronRight, Share, Settings, ArrowUpDown, ChevronDown } from "lucide-react"

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
        <p className="text-[#a5f10d] font-medium">{data.isCurrent ? "Current Pool Position" : "Curve Point"}</p>
        <p className="text-white">Token A: {label}</p>
        <p className="text-white">Token B: {payload[0].value.toFixed(2)}</p>
        <p className="text-cyan-400">k = {(label * payload[0].value).toFixed(0)}</p>
      </div>
    )
  }
  return null
}

export default function SwapPage() {
  const [mounted, setMounted] = useState(false)

  // State variables for AMM mechanics
  const [tokenAReserves, setTokenAReserves] = useState(1000)
  const [tokenBReserves, setTokenBReserves] = useState(2000)
  const [swapAmount, setSwapAmount] = useState(100)
  const [fromToken, setFromToken] = useState("ETH")
  const [toToken, setToToken] = useState("USDC")
  const [slippage, setSlippage] = useState(0.5)

  // Calculate constant k
  const k = tokenAReserves * tokenBReserves

  // Generate hyperbola curve data
  const generateCurveData = () => {
    const data = []
    for (let x = 200; x <= 2500; x += 25) {
      const y = k / x
      data.push({
        x,
        curveY: y,
        isCurrent: Math.abs(x - tokenAReserves) < 50,
      })
    }
    return data
  }

  const curveData = generateCurveData()

  // Calculate expected output for swap
  const expectedOutput = tokenBReserves - k / (tokenAReserves + swapAmount)
  const priceImpact =
    ((expectedOutput / swapAmount - tokenBReserves / tokenAReserves) / (tokenBReserves / tokenAReserves)) * 100

  // Execute swap function
  const handleSwap = () => {
    const newTokenAReserves = tokenAReserves + swapAmount
    const newTokenBReserves = k / newTokenAReserves
    setTokenAReserves(newTokenAReserves)
    setTokenBReserves(newTokenBReserves)
  }

  // Swap tokens function
  const swapTokens = () => {
    setFromToken(toToken)
    setToToken(fromToken)
  }

  // Reset function
  const resetPool = () => {
    setTokenAReserves(1000)
    setTokenBReserves(2000)
    setSwapAmount(100)
  }

  // Token options
  const tokens = [
    { symbol: "ETH", name: "Ethereum", balance: "1,234.56" },
    { symbol: "USDC", name: "USD Coin", balance: "5,678.90" },
    { symbol: "BTC", name: "Bitcoin", balance: "0.5432" },
    { symbol: "UNI", name: "Uniswap", balance: "890.12" },
  ]

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
                    <span className="bg-white/10 px-2 py-1 rounded text-sm">0.05%</span>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-pink-500 rounded-full"></div>
                      <span className="text-pink-400 text-sm">Best price route</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
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
                    {(tokenBReserves / tokenAReserves).toFixed(4)} {toToken}
                  </div>
                  <div className="text-white/60">per {fromToken}</div>
                </motion.div>

                {/* Hyperbola Visualization */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                >
                  <Card className="bg-white/5 backdrop-blur-md border-white/10">
                    <CardHeader>
                      <CardTitle className="text-[#a5f10d] text-xl font-light">Trading Curve (x × y = k)</CardTitle>
                      <CardDescription className="text-white/60">
                        Visualize how your swap affects the pool reserves
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
                              label={{ value: `${fromToken} Reserves`, position: "insideBottom", offset: -10 }}
                            />
                            <YAxis
                              stroke="rgba(255,255,255,0.6)"
                              label={{ value: `${toToken} Reserves`, angle: -90, position: "insideLeft" }}
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

                {/* Time Controls */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    {["1H", "1D", "1W", "1M", "1Y"].map((period) => (
                      <Button
                        key={period}
                        variant="outline"
                        size="sm"
                        className={`bg-transparent border-white/20 ${
                          period === "1D" ? "bg-white/10 text-[#a5f10d]" : ""
                        }`}
                      >
                        {period}
                      </Button>
                    ))}
                  </div>
                  <Button variant="outline" size="sm" className="bg-transparent border-white/20">
                    Price ↓
                  </Button>
                </motion.div>
              </div>

              {/* Right Sidebar - Swap Interface */}
              <div className="lg:col-span-1 space-y-6">
                {/* Swap Interface */}
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
                      <div className="bg-black/20 rounded-xl p-4 border border-white/10">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-white/60 text-sm">From</span>
                          <span className="text-white/60 text-sm">
                            Balance: {tokens.find((t) => t.symbol === fromToken)?.balance}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Select value={fromToken} onValueChange={setFromToken}>
                            <SelectTrigger className="w-24 bg-transparent border-none p-0">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 bg-[#a5f10d] rounded-full flex items-center justify-center">
                                  <span className="text-black font-bold text-xs">{fromToken[0]}</span>
                                </div>
                                <span className="text-white font-medium">{fromToken}</span>
                                <ChevronDown size={16} />
                              </div>
                            </SelectTrigger>
                            <SelectContent className="bg-black/90 border-white/20">
                              {tokens.map((token) => (
                                <SelectItem key={token.symbol} value={token.symbol} className="text-white">
                                  <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 bg-[#a5f10d] rounded-full flex items-center justify-center">
                                      <span className="text-black font-bold text-xs">{token.symbol[0]}</span>
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
                              onChange={(e) => setSwapAmount(Number(e.target.value))}
                              className="text-right text-2xl font-light bg-transparent border-none p-0 h-auto"
                              placeholder="0.0"
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
                      <div className="bg-black/20 rounded-xl p-4 border border-white/10">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-white/60 text-sm">To</span>
                          <span className="text-white/60 text-sm">
                            Balance: {tokens.find((t) => t.symbol === toToken)?.balance}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Select value={toToken} onValueChange={setToToken}>
                            <SelectTrigger className="w-24 bg-transparent border-none p-0">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                                  <span className="text-white font-bold text-xs">{toToken[0]}</span>
                                </div>
                                <span className="text-white font-medium">{toToken}</span>
                                <ChevronDown size={16} />
                              </div>
                            </SelectTrigger>
                            <SelectContent className="bg-black/90 border-white/20">
                              {tokens.map((token) => (
                                <SelectItem key={token.symbol} value={token.symbol} className="text-white">
                                  <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                                      <span className="text-white font-bold text-xs">{token.symbol[0]}</span>
                                    </div>
                                    {token.symbol}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <div className="ml-auto text-right">
                            <div className="text-2xl font-light text-white/60">
                              {expectedOutput > 0 ? expectedOutput.toFixed(4) : "0.0"}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Swap Details */}
                      <div className="bg-black/20 rounded-lg p-3 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-white/60">Price Impact:</span>
                          <span className={`${Math.abs(priceImpact) > 5 ? "text-red-400" : "text-[#a5f10d]"}`}>
                            {priceImpact.toFixed(2)}%
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-white/60">Slippage Tolerance:</span>
                          <span className="text-white">{slippage}%</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-white/60">Minimum Received:</span>
                          <span className="text-white">
                            {(expectedOutput * (1 - slippage / 100)).toFixed(4)} {toToken}
                          </span>
                        </div>
                      </div>

                      <Button
                        onClick={handleSwap}
                        className="w-full bg-[#a5f10d] text-black hover:bg-[#a5f10d]/90 font-medium py-6"
                      >
                        Swap Tokens
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Pool Stats */}
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
                      <div>
                        <div className="text-white/60 text-sm mb-2">Pool Reserves</div>
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <span className="text-sm">{fromToken}:</span>
                            <span className="text-sm">{tokenAReserves.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm">{toToken}:</span>
                            <span className="text-sm">{tokenBReserves.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <div className="text-white/60 text-sm mb-2">Pool Constant (k)</div>
                        <div className="text-[#a5f10d] font-medium">{k.toFixed(0)}</div>
                      </div>
                      <div>
                        <div className="text-white/60 text-sm mb-2">Exchange Rate</div>
                        <div className="text-sm">
                          1 {fromToken} = {(tokenBReserves / tokenAReserves).toFixed(4)} {toToken}
                        </div>
                      </div>
                      <Button onClick={resetPool} variant="outline" className="w-full bg-transparent">
                        Reset Pool
                      </Button>
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
                  <div>
                    <h3 className="text-xl font-light mb-3 text-white">Price Impact</h3>
                    <p className="text-white/70 leading-relaxed text-sm">
                      Larger swaps move further along the curve, resulting in higher price impact. The AMM automatically
                      adjusts prices based on supply and demand, with larger trades receiving progressively worse rates.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-xl font-light mb-3 text-white">Slippage Protection</h3>
                    <p className="text-white/70 leading-relaxed text-sm">
                      Set slippage tolerance to protect against price changes during transaction execution. Higher
                      slippage allows trades in volatile conditions but may result in worse prices.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-xl font-light mb-3 text-white">Optimal Trading</h3>
                    <p className="text-white/70 leading-relaxed text-sm">
                      For large trades, consider splitting into smaller amounts or using limit orders. The curve
                      visualization helps you understand how your trade size affects the final price.
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
