"use client"

import { motion, useInView } from "framer-motion"
import { useRef } from "react"

export default function HowToSection() {
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
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-light tracking-tight mb-6">How It Works</h2>
          <p className="text-xl text-white/70 font-light max-w-2xl mx-auto">
            Learn how to use AMM in just a few simple steps
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Video Embed */}
          <motion.div
            initial={{ opacity: 0, x: -50, filter: "blur(10px)" }}
            animate={isInView ? { opacity: 1, x: 0, filter: "blur(0px)" } : {}}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative group"
          >
            <div className="relative bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden hover:border-[#a5f10d]/30 transition-all duration-300">
              {/* Loom Video Embed */}
              <div className="aspect-video">
                <div style={{ position: "relative", paddingBottom: "56.25%", height: 0 }}>
                  <iframe 
                    src="https://www.loom.com/embed/92e9ea330b2d44b0a131940f2fe0e34f?sid=54d2faa0-b45d-40f4-822b-9fbf54a0ddae" 
                    frameBorder="0" 
                    webkitAllowFullScreen 
                    mozAllowFullScreen 
                    allowFullScreen 
                    style={{ 
                      position: "absolute", 
                      top: 0, 
                      left: 0, 
                      width: "100%", 
                      height: "100%",
                      borderRadius: "1rem 1rem 0 0"
                    }}
                  />
                </div>
              </div>

              {/* Video Info */}
              <div className="p-6">
                <h3 className="text-xl font-light mb-2 text-secondary">Getting Started with AMM</h3>
                <p className="text-white/70 font-light">A comprehensive guide to trading and providing liquidity</p>
                <div className="flex items-center gap-4 mt-4 text-sm text-white/50">
                  <span>Demo</span>
                  <span>•</span>
                  <span>Tutorial</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Steps */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="space-y-8"
          >
            {[
              {
                step: "01",
                title: "Connect Wallet",
                description: "Link your crypto wallet to start trading on the AMM platform",
              },
              {
                step: "02",
                title: "Select Mode",
                description: "Choose between Mock mode to test things first and Live mode to actually interact with the AMM",
              },
              {
                step: "03",
                title: "Interact with AMM",
                description: "Add and Remove Liquidity or Swap tokens to get an understanding of how AMMs work",
              },
            ].map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: 0.6 + index * 0.2 }}
                className="flex items-start gap-4"
              >
                <div className="w-12 h-12 bg-secondary/20 backdrop-blur-sm border border-secondary/30 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-secondary font-medium">{item.step}</span>
                </div>
                <div>
                  <h3 className="text-xl font-light mb-2">{item.title}</h3>
                  <p className="text-white/70 font-light leading-relaxed">{item.description}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  )
}
