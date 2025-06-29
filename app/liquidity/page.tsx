"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import Navigation from "@/components/navigation"
import Footer from "@/components/footer"
import AnimatedBackground from "@/components/animated-background"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { ChevronRight, Share, Settings, Plus, ArrowUpDown } from "lucide-react"

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

export default function LiquidityPage() {
  const [mounted, setMounted] = useState(false)

  // State variables for AMM mechanics
  const [tokenAReserves, setTokenAReserves] = useState(1000)
  const [tokenBReserves, setTokenBReserves] = useState(2000)
  const [swapAmount, setSwapAmount] = useState(100)
  const [liquidityAmount, setLiquidityAmount] = useState(500)

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
        isCurrent: Math.abs(x - tokenAReserves) < 12.5,
      })
    }
    return data
  }

  const curveData = generateCurveData()

  // Swap function
  const handleSwap = () => {
    const newTokenAReserves = tokenAReserves + swapAmount
    const newTokenBReserves = k / newTokenAReserves
    setTokenAReserves(newTokenAReserves)
    setTokenBReserves(newTokenBReserves)
  }

  // Calculate expected output for swap preview
  const expectedTokenBOutput = tokenBReserves - k / (tokenAReserves + swapAmount)

  // Liquidity management function
  const handleLiquidity = (isAdding: boolean) => {
    const ratio = tokenBReserves / tokenAReserves
    const requiredTokenB = liquidityAmount * ratio

    if (isAdding) {
      setTokenAReserves(tokenAReserves + liquidityAmount)
      setTokenBReserves(tokenBReserves + requiredTokenB)
    } else {
      const newTokenA = Math.max(200, tokenAReserves - liquidityAmount)
      const newTokenB = Math.max(200, tokenBReserves - requiredTokenB)
      setTokenAReserves(newTokenA)
      setTokenBReserves(newTokenB)
    }
  }

  // Reset function
  const resetPool = () => {
    setTokenAReserves(1000)
    setTokenBReserves(2000)
    setSwapAmount(100)
    setLiquidityAmount(500)
  }

  // Calculate current prices
  const priceAInB = tokenBReserves / tokenAReserves
  const priceBInA = tokenAReserves / tokenBReserves

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
              <span>Pools</span>
              <ChevronRight size={16} />
              <span className="text-white">ETH / USDC</span>
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
                  <span className="text-white font-bold">E</span>
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-light">ETH / USDC</h1>
                    <span className="bg-white/10 px-2 py-1 rounded text-sm">v4</span>
                    <span className="bg-white/10 px-2 py-1 rounded text-sm">0.05%</span>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-pink-500 rounded-full"></div>
                      <span className="text-pink-400 text-sm">17.62% reward APR</span>
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
              {/* Left Section - TVL and Chart */}
              <div className="lg:col-span-3 space-y-6">
                {/* TVL Display */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                >
                  <div className="text-4xl font-light mb-2">$38.1M</div>
                  <div className="text-white/60">Past day</div>
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
                              label={{ value: "Token A Reserves", position: "insideBottom", offset: -10 }}
                            />
                            <YAxis
                              stroke="rgba(255,255,255,0.6)"
                              label={{ value: "Token B Reserves", angle: -90, position: "insideLeft" }}
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
                    Volume ↓
                  </Button>
                </motion.div>
              </div>

              {/* Right Sidebar */}
              <div className="lg:col-span-1 space-y-6">
                {/* APR Section */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                >

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
                          <div>
                            <label className="block text-sm text-white/60 mb-2">Liquidity Amount (Token A)</label>
                            <Input
                              type="number"
                              value={liquidityAmount}
                              onChange={(e) => setLiquidityAmount(Number(e.target.value))}
                              className="bg-black/20 border-white/20 text-white"
                            />
                          </div>
                          <div className="bg-black/20 rounded-lg p-3">
                            <div className="text-sm text-white/60 mb-1">Required Token B:</div>
                            <div className="text-lg font-medium text-cyan-400">
                              {(liquidityAmount * (tokenBReserves / tokenAReserves)).toFixed(4)}
                            </div>
                          </div>
                          <Button
                            onClick={() => handleLiquidity(true)}
                            className="w-full bg-[#a5f10d] text-black hover:bg-[#a5f10d]/90"
                          >
                            Add Liquidity
                          </Button>
                        </TabsContent>

                        <TabsContent value="remove" className="p-6 space-y-4">
                          <div>
                            <label className="block text-sm text-white/60 mb-2">Remove Amount (Token A)</label>
                            <Input
                              type="number"
                              value={liquidityAmount}
                              onChange={(e) => setLiquidityAmount(Number(e.target.value))}
                              className="bg-black/20 border-white/20 text-white"
                            />
                          </div>
                          <div className="bg-black/20 rounded-lg p-3">
                            <div className="text-sm text-white/60 mb-1">Token B to Remove:</div>
                            <div className="text-lg font-medium text-red-400">
                              {(liquidityAmount * (tokenBReserves / tokenAReserves)).toFixed(4)}
                            </div>
                          </div>
                          <Button onClick={() => handleLiquidity(false)} className="w-full bg-red-600 hover:bg-red-700">
                            Remove Liquidity
                          </Button>
                        </TabsContent>
                      </Tabs>
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
                      <CardTitle className="text-white text-lg font-light">Stats</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <div className="text-white/60 text-sm mb-2">Pool balances</div>
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <span className="text-sm">Token A:</span>
                            <span className="text-sm">{tokenAReserves.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm">Token B:</span>
                            <span className="text-sm">{tokenBReserves.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <div className="text-white/60 text-sm mb-2">Constant k</div>
                        <div className="text-[#a5f10d] font-medium">{k.toFixed(0)}</div>
                      </div>
                      <div>
                        <div className="text-white/60 text-sm mb-2">Current Prices</div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span>A in B:</span>
                            <span>{priceAInB.toFixed(4)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>B in A:</span>
                            <span>{priceBInA.toFixed(4)}</span>
                          </div>
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
                  <CardTitle className="text-[#a5f10d] text-2xl font-light">Understanding AMM Mechanics</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <h3 className="text-xl font-light mb-3 text-white">Constant Product Formula</h3>
                    <p className="text-white/70 leading-relaxed text-sm">
                      The hyperbola represents <span className="text-[#a5f10d] font-mono">x × y = k</span>, ensuring the
                      product of reserves remains constant during trades. This mathematical relationship creates
                      automatic price discovery.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-xl font-light mb-3 text-white">Trading Impact</h3>
                    <p className="text-white/70 leading-relaxed text-sm">
                      Each trade moves along the curve, with larger trades experiencing higher slippage. The curve's
                      shape naturally creates resistance to large price movements, providing stability.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-xl font-light mb-3 text-white">Liquidity Effects</h3>
                    <p className="text-white/70 leading-relaxed text-sm">
                      Adding liquidity shifts the entire curve outward (higher k), reducing slippage for all traders.
                      Liquidity providers earn fees from trades while helping maintain market efficiency.
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
