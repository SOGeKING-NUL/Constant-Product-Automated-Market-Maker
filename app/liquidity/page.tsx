"use client"

import { useEffect, useState } from "react"
import { motion, useInView } from "framer-motion"
import { useRef } from "react"
import Navigation from "@/components/navigation"
import Footer from "@/components/footer"
import AnimatedBackground from "@/components/animated-background"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

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
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

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
        isCurrent: Math.abs(x - tokenAReserves) < 12.5, // Close to current position
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

  // Pool data
  const pools = [
    {
      pair: "ETH/USDC",
      tvl: "$12,847,392",
      volume24h: "$2,394,847",
      apy: "24.7%",
      yourLiquidity: "$15,847",
      fees: "$127.43",
    },
    {
      pair: "BTC/ETH",
      tvl: "$8,234,567",
      volume24h: "$1,567,234",
      apy: "18.3%",
      yourLiquidity: "$0",
      fees: "$0",
    },
    {
      pair: "USDC/USDT",
      tvl: "$15,678,901",
      volume24h: "$3,456,789",
      apy: "12.1%",
      yourLiquidity: "$5,234",
      fees: "$23.45",
    },
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

        <main className="pt-20">
          {/* Hero Section */}
          <section className="py-20 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto text-center">
              <motion.div
                initial={{ opacity: 0, y: 30, filter: "blur(10px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ duration: 0.8, delay: 0.2 }}
              >
                <h1 className="text-5xl sm:text-6xl md:text-7xl font-light tracking-tight mb-6">Liquidity Pools</h1>
                <p className="text-xl text-white/70 font-light leading-relaxed mb-8 max-w-2xl mx-auto">
                  Provide liquidity and earn fees from trading activity
                </p>
              </motion.div>
            </div>
          </section>

          {/* Stats Overview */}
          <section className="py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto">
              <motion.div
                ref={ref}
                initial={{ opacity: 0, y: 50 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.8 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16"
              >
                <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 text-center">
                  <div className="text-3xl font-light mb-2 text-[#a5f10d]">$36.7M</div>
                  <div className="text-white/60 font-light">Total Value Locked</div>
                </div>
                <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 text-center">
                  <div className="text-3xl font-light mb-2 text-[#a5f10d]">$7.4M</div>
                  <div className="text-white/60 font-light">24h Volume</div>
                </div>
                <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 text-center">
                  <div className="text-3xl font-light mb-2 text-[#a5f10d]">18.4%</div>
                  <div className="text-white/60 font-light">Average APY</div>
                </div>
              </motion.div>
            </div>
          </section>

          {/* Available Pools */}
          <section className="py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto">
              <motion.h2
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-3xl font-light tracking-tight mb-8"
              >
                Available Pools
              </motion.h2>

              <div className="space-y-6 mb-16">
                {pools.map((pool, index) => (
                  <motion.div
                    key={pool.pair}
                    initial={{ opacity: 0, y: 30, filter: "blur(10px)" }}
                    animate={isInView ? { opacity: 1, y: 0, filter: "blur(0px)" } : {}}
                    transition={{ duration: 0.6, delay: 0.4 + index * 0.1 }}
                    className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all duration-300"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-7 gap-4 items-center">
                      <div className="md:col-span-1">
                        <div className="text-xl font-light text-[#a5f10d]">{pool.pair}</div>
                      </div>

                      <div className="md:col-span-1 text-center">
                        <div className="text-white/60 text-sm mb-1">TVL</div>
                        <div className="font-medium">{pool.tvl}</div>
                      </div>

                      <div className="md:col-span-1 text-center">
                        <div className="text-white/60 text-sm mb-1">24h Volume</div>
                        <div className="font-medium">{pool.volume24h}</div>
                      </div>

                      <div className="md:col-span-1 text-center">
                        <div className="text-white/60 text-sm mb-1">APY</div>
                        <div className="font-medium text-[#a5f10d]">{pool.apy}</div>
                      </div>

                      <div className="md:col-span-1 text-center">
                        <div className="text-white/60 text-sm mb-1">Your Liquidity</div>
                        <div className="font-medium">{pool.yourLiquidity}</div>
                      </div>

                      <div className="md:col-span-1 text-center">
                        <div className="text-white/60 text-sm mb-1">Unclaimed Fees</div>
                        <div className="font-medium text-[#a5f10d]">{pool.fees}</div>
                      </div>

                      <div className="md:col-span-1 text-center">
                        <Button
                          size="sm"
                          className="bg-[#a5f10d] text-black hover:bg-[#a5f10d]/90 font-medium rounded-full"
                        >
                          Add Liquidity
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* AMM Mechanics Section */}
          <section className="py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: 0.6 }}
                className="text-center mb-12"
              >
                <h2 className="text-4xl sm:text-5xl font-light tracking-tight mb-6">Constant Product AMM</h2>
                <p className="text-xl text-white/70 font-light max-w-2xl mx-auto">
                  Explore how automated market makers work with the constant product formula x × y = k
                </p>
              </motion.div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Chart Visualization */}
                <div className="lg:col-span-2">
                  <Card className="bg-white/5 backdrop-blur-md border-white/10">
                    <CardHeader>
                      <CardTitle className="text-[#a5f10d] text-2xl font-light">
                        Hyperbola Curve Visualization
                      </CardTitle>
                      <CardDescription className="text-white/60">
                        The curve represents all possible states where x × y = k
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-96">
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
                </div>

                {/* Pool Metrics */}
                <div className="space-y-6">
                  <Card className="bg-white/5 backdrop-blur-md border-white/10">
                    <CardHeader>
                      <CardTitle className="text-[#a5f10d] text-xl font-light">Pool Metrics</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex justify-between">
                        <span className="text-white/60">Token A Reserves:</span>
                        <span className="font-medium">{tokenAReserves.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/60">Token B Reserves:</span>
                        <span className="font-medium">{tokenBReserves.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/60">Constant k:</span>
                        <span className="font-medium text-[#a5f10d]">{k.toFixed(0)}</span>
                      </div>
                      <div className="border-t border-white/10 pt-4">
                        <div className="flex justify-between mb-2">
                          <span className="text-white/60">Price A in B:</span>
                          <span className="font-medium">{priceAInB.toFixed(4)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/60">Price B in A:</span>
                          <span className="font-medium">{priceBInA.toFixed(4)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Button onClick={resetPool} variant="outline" className="w-full bg-transparent">
                    Reset Pool
                  </Button>
                </div>
              </div>

              {/* Controls */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
                {/* Swap Controls */}
                <Card className="bg-white/5 backdrop-blur-md border-white/10">
                  <CardHeader>
                    <CardTitle className="text-[#a5f10d] text-xl font-light">Swap Simulation</CardTitle>
                    <CardDescription className="text-white/60">
                      Add Token A to see how it affects Token B reserves
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="block text-sm text-white/60 mb-2">Swap Amount (Token A)</label>
                      <Input
                        type="number"
                        value={swapAmount}
                        onChange={(e) => setSwapAmount(Number(e.target.value))}
                        className="bg-black/20 border-white/20 text-white"
                      />
                    </div>
                    <div className="bg-black/20 rounded-lg p-3">
                      <div className="text-sm text-white/60 mb-1">Expected Token B Output:</div>
                      <div className="text-lg font-medium text-[#a5f10d]">{expectedTokenBOutput.toFixed(4)}</div>
                    </div>
                    <Button onClick={handleSwap} className="w-full bg-[#a5f10d] text-black hover:bg-[#a5f10d]/90">
                      Execute Swap
                    </Button>
                  </CardContent>
                </Card>

                {/* Liquidity Controls */}
                <Card className="bg-white/5 backdrop-blur-md border-white/10">
                  <CardHeader>
                    <CardTitle className="text-[#a5f10d] text-xl font-light">Liquidity Management</CardTitle>
                    <CardDescription className="text-white/60">Add or remove liquidity proportionally</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
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
                    <div className="flex gap-2">
                      <Button onClick={() => handleLiquidity(true)} className="flex-1 bg-green-600 hover:bg-green-700">
                        Add Liquidity
                      </Button>
                      <Button
                        onClick={() => handleLiquidity(false)}
                        variant="outline"
                        className="flex-1 border-red-500 text-red-400 hover:bg-red-500/10"
                      >
                        Remove Liquidity
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Educational Content */}
              <div className="mt-12">
                <Card className="bg-white/5 backdrop-blur-md border-white/10">
                  <CardHeader>
                    <CardTitle className="text-[#a5f10d] text-2xl font-light">How It Works</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <h3 className="text-xl font-light mb-3 text-white">Constant Product Formula</h3>
                      <p className="text-white/70 leading-relaxed">
                        The hyperbola represents the constant product formula{" "}
                        <span className="text-[#a5f10d] font-mono">x × y = k</span>, where x and y are the reserves of
                        Token A and Token B, and k is a constant. This ensures that the product of reserves remains
                        constant during trades.
                      </p>
                    </div>
                    <div>
                      <h3 className="text-xl font-light mb-3 text-white">Trading Mechanics</h3>
                      <p className="text-white/70 leading-relaxed">
                        When you trade, you move along the curve. Adding Token A to the pool increases its reserves and
                        decreases Token B reserves proportionally. The curve's shape ensures that larger trades have
                        progressively higher prices (slippage).
                      </p>
                    </div>
                    <div>
                      <h3 className="text-xl font-light mb-3 text-white">Liquidity Effects</h3>
                      <p className="text-white/70 leading-relaxed">
                        Adding liquidity increases both token reserves proportionally, creating a new curve with a
                        higher k value. This provides more liquidity and reduces slippage for traders. Removing
                        liquidity has the opposite effect.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>
        </main>

        <Footer />
      </motion.div>
    </div>
  )
}
