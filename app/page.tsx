"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import Navigation from "@/components/navigation"
import HeroSection from "@/components/hero-section"
import ProductDisplay from "@/components/product-display"
import HowToSection from "@/components/how-to-section"
import FeaturesSection from "@/components/features-section"
import Footer from "@/components/footer"
import AnimatedBackground from "@/components/animated-background"

export default function HomePage() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-secondary border-t-transparent rounded-full animate-spin" />
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
          
        <main>
          <HeroSection />
          <ProductDisplay />
          <HowToSection />
          <FeaturesSection />
        </main>

        <Footer />
      </motion.div>
    </div>
  )
}
