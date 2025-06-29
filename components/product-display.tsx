"use client"

import { motion, useInView } from "framer-motion"
import { useRef } from "react"
import Image from "next/image"

export default function ProductDisplay() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 50 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-light tracking-tight mb-6">Experience AMM</h2>
          <p className="text-xl text-white/70 font-light max-w-2xl mx-auto">
            Intuitive interface designed for seamless trading and liquidity management
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 50, filter: "blur(10px)" }}
          animate={isInView ? { opacity: 1, y: 0, filter: "blur(0px)" } : {}}
          transition={{ duration: 1, ease: [0.25, 0.25, 0, 1], delay: 0.3 }}
          className="relative"
        >
          {/* Glassmorphic Container */}
          <div className="relative bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-4 sm:p-8 overflow-hidden">
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#a5f10d]/10 via-transparent to-cyan-500/10 pointer-events-none" />

            {/* Product Demo Image */}
            <div className="relative z-10">
              <Image
                src="/images/product-demo.png"
                alt="AMM Trading Interface Demo"
                width={1200}
                height={600}
                className="w-full h-auto rounded-2xl"
                priority
              />
            </div>
          </div>

          {/* Feature highlights around the image */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="absolute -top-4 -left-4 bg-[#a5f10d]/20 backdrop-blur-sm border border-[#a5f10d]/30 rounded-xl p-3"
          >
            <div className="text-[#a5f10d] text-sm font-medium">Real-time Pricing</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.6, delay: 1 }}
            className="absolute -top-4 -right-4 bg-cyan-500/20 backdrop-blur-sm border border-cyan-500/30 rounded-xl p-3"
          >
            <div className="text-cyan-400 text-sm font-medium">Deep Liquidity</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.6, delay: 1.2 }}
            className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-3"
          >
            <div className="text-white text-sm font-medium">Instant Swaps</div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
