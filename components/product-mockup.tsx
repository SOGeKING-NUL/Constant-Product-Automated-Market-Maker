"use client"

import { motion, useInView } from "framer-motion"
import { useRef } from "react"

export default function ProductMockup() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  return (
    <section id="product" className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 50, filter: "blur(10px)" }}
          animate={isInView ? { opacity: 1, y: 0, filter: "blur(0px)" } : {}}
          transition={{ duration: 1, ease: [0.25, 0.25, 0, 1] }}
          className="relative"
        >
          {/* Glassmorphic Container */}
          <div className="relative bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-8 sm:p-12 overflow-hidden">
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#a5f10d]/10 via-transparent to-cyan-500/10 pointer-events-none" />

            {/* Mock Trading Interface */}
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div className="space-y-6">
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                  <h3 className="text-xl font-light mb-4 text-[#a5f10d]">Swap Tokens</h3>
                  <div className="space-y-4">
                    <div className="bg-black/20 rounded-xl p-4 border border-white/5">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-white/60 text-sm">From</span>
                        <span className="text-white/60 text-sm">Balance: 1,234.56</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-[#a5f10d] rounded-full flex items-center justify-center">
                          <span className="text-black font-bold text-sm">E</span>
                        </div>
                        <span className="text-white font-medium">ETH</span>
                        <div className="ml-auto text-right">
                          <div className="text-2xl font-light">1.0</div>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-center">
                      <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center border border-white/20">
                        <div className="w-4 h-4 border-2 border-white/60 border-t-transparent rounded-full" />
                      </div>
                    </div>

                    <div className="bg-black/20 rounded-xl p-4 border border-white/5">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-white/60 text-sm">To</span>
                        <span className="text-white/60 text-sm">Balance: 0.00</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold text-sm">U</span>
                        </div>
                        <span className="text-white font-medium">USDC</span>
                        <div className="ml-auto text-right">
                          <div className="text-2xl font-light text-white/60">2,847.32</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button className="w-full mt-6 bg-[#a5f10d] text-black font-medium py-4 rounded-xl hover:bg-[#a5f10d]/90 transition-colors">
                    Swap Tokens
                  </button>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                  <h3 className="text-xl font-light mb-4 text-[#a5f10d]">Liquidity Pool</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-white/60">Total Value Locked</span>
                      <span className="text-white font-medium">$12,847,392</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white/60">24h Volume</span>
                      <span className="text-white font-medium">$2,394,847</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white/60">APY</span>
                      <span className="text-[#a5f10d] font-medium">24.7%</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                  <h3 className="text-xl font-light mb-4 text-[#a5f10d]">Your Position</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-white/60">Pool Share</span>
                      <span className="text-white font-medium">0.12%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white/60">Your Liquidity</span>
                      <span className="text-white font-medium">$15,847</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white/60">Unclaimed Fees</span>
                      <span className="text-[#a5f10d] font-medium">$127.43</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
