"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import Navigation from "@/components/navigation"
import ProductMockup from "@/components/product-mockup"
import Footer from "@/components/footer"
import AnimatedBackground from "@/components/animated-background"

export default function SwapPage() {
  const [mounted, setMounted] = useState(false)

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
          {/* Hero Section for Swap */}
          <section className="py-20 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto text-center">
              <motion.div
                initial={{ opacity: 0, y: 30, filter: "blur(10px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ duration: 0.8, delay: 0.2 }}
              >
                <h1 className="text-5xl sm:text-6xl md:text-7xl font-light tracking-tight mb-6">Token Swap</h1>
                <p className="text-xl text-white/70 font-light leading-relaxed mb-8 max-w-2xl mx-auto">
                  Trade tokens instantly with optimal pricing and minimal slippage
                </p>
              </motion.div>
            </div>
          </section>

          <ProductMockup />
        </main>

        <Footer />
      </motion.div>
    </div>
  )
}
