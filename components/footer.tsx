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
          {/* Brand */}
          <div className="text-2xl font-light tracking-tight">x . y = k</div>

          {/* Core Links */}
          <div className="flex flex-col sm:flex-row items-center gap-8 text-white/60 text-sm font-light">

            <a
              href="https://www.alchemy.com/faucets/base-sepolia"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#a5f10d] transition-colors"
            >
              BASE Sepolia Faucet
            </a>

            <span className="hidden sm:inline text-white/30">•</span>

            <a
              href="https://sepolia.basescan.org/address/0x4200000000000000000000000000000000000006#writeContract"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#a5f10d] transition-colors"
            >
              Swap ETH ↔ WETH (Deposit)
            </a>

            <span className="hidden sm:inline text-white/30">•</span>

            <a
              href="https://faucet.circle.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#a5f10d] transition-colors"
            >
              USDC Faucet
            </a>

            <span className="hidden sm:inline text-white/30">•</span>

            <a
              href="https://sepolia.basescan.org/address/0x52239b18cdd337A974D5724F75A0B8A0Ab9e2310"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#a5f10d] transition-colors"
            >
              AMM Contract
            </a>
          </div>

          {/* Social & Misc */}
          <div className="flex flex-col sm:flex-row items-center gap-6 text-white/40 text-sm font-light tracking-widest">
            <a
              href="https://github.com/SOGeKING-NUL/Constant-Product-Automated-Market-Maker"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#a5f10d] transition-colors font-bold"
            >
              GITHUB
            </a>

            <span className="hidden sm:inline">•</span>

            <a
              href="https://x.com/JanaUtsav"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#a5f10d] transition-colors font-bold"
            >
              X
            </a>

            <span className="hidden sm:inline">•</span>

            <span>Built for BASE</span>
          </div>
        </div>
      </div>
    </motion.footer>
  )
}
