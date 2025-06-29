"use client"

import { motion } from "framer-motion"

export default function Footer() {
  return (
    <motion.footer
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      viewport={{ once: true }}
      className="border-t border-white/10 py-12 px-4 sm:px-6 lg:px-8 mt-20"
    >
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-2xl font-light tracking-tight">AMM</div>

          <div className="flex items-center gap-8 text-white/60 text-sm font-light">
            <span>© 2024 AMM Protocol</span>
            <span className="text-white/30">•</span>
            <span>Built for DeFi</span>
          </div>

          <div className="flex items-center gap-6 text-white/40 text-sm font-light tracking-widest">
            <span>LIQUIDITY</span>
            <span>•</span>
            <span>TRADING</span>
            <span>•</span>
            <span>DEFI</span>
          </div>
        </div>
      </div>
    </motion.footer>
  )
}
