"use client"

import { motion, useInView } from "framer-motion"
import { useRef } from "react"
import { Button } from "@/components/ui/button"
import Link from "next/link"


export default function FeaturesSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  const features = [
    {
      title: "LIQUIDITY",
      description: "A liquidity pools for the WETH/USDC Token Pair ensuring consistent interactions with the contaract.",
      icon: "💧",
    },
    {
      title: "MOCK MODE",
      description: "Toggle between a Mock mode to test interactions and then a Live mode to actual contribute to the liquidity pool or swap tokens",
      icon: "📈",
    },
    {
      title: "TOKEN SWAPS",
      description: "Seamless token exchanges with instant settlement with Price impace analysis.",
      icon: "🔄",
    },
  ]

  return (
    <section id="features" className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 50 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-light tracking-tight mb-6">Core Features</h2>
          <p className="text-xl text-white/70 font-light max-w-2xl mx-auto">
            Learn About AMMs
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 50, filter: "blur(10px)" }}
              animate={isInView ? { opacity: 1, y: 0, filter: "blur(0px)" } : {}}
              transition={{
                duration: 0.8,
                delay: index * 0.2,
                ease: [0.25, 0.25, 0, 1],
              }}
              className="group"
            >
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8 h-full hover:bg-white/10 transition-all duration-300 hover:scale-105 hover:border-secondary/30">
                <div className="text-4xl mb-6 group-hover:scale-110 transition-transform duration-300">
                  {feature.icon}
                </div>
                <h3 className="text-2xl font-light tracking-wide mb-4 text-secondary">{feature.title}</h3>
                <p className="text-white/70 font-light leading-relaxed">{feature.description}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-20 flex justify-center">
          <Button
            size="lg"
            className="bg-secondary text-black hover:bg-secondary/90 font-medium px-10 py-6 text-xl rounded-full transition-all duration-300 hover:scale-105"
          >
            <Link href="/liquidity">
              Get Started
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
