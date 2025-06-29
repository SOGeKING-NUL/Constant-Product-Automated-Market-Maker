"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"

export default function HeroSection() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.3,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 30, filter: "blur(10px)" },
    visible: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: {
        duration: 0.8,
        ease: [0.25, 0.25, 0, 1],
      },
    },
  }

  const splineVariants = {
    hidden: { opacity: 0, x: 50, filter: "blur(10px)" },
    visible: {
      opacity: 1,
      x: 0,
      filter: "blur(0px)",
      transition: {
        duration: 1,
        ease: [0.25, 0.25, 0, 1],
        delay: 0.2,
      },
    },
  }

  return (
    <section
      id="hero"
      className="min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 relative overflow-hidden"
    >
      <div className="max-w-7xl mx-auto w-full relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-20 xl:gap-24 items-center">
          {/* Left side - Text content */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="text-left lg:text-left relative z-20"
          >
            <motion.div variants={itemVariants} className="mb-8">
              <h1 className="text-7xl sm:text-8xl md:text-9xl lg:text-[10rem] xl:text-[12rem] font-light tracking-tighter mb-6 leading-none">
                AMM
              </h1>
              <p className="text-[#a5f10d] text-xl sm:text-2xl md:text-3xl lg:text-4xl font-light tracking-widest uppercase">
                Automated Market Making
              </p>
            </motion.div>

            <motion.h2
              variants={itemVariants}
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-light tracking-tight leading-tight mb-10"
            >
              STREAMLINE
              <br />
              DECENTRALIZED
              <br />
              TRADING
            </motion.h2>

            <motion.p
              variants={itemVariants}
              className="text-xl sm:text-2xl md:text-3xl lg:text-4xl text-white/70 font-light leading-relaxed mb-12 max-w-2xl"
            >
              Enhance liquidity and facilitate seamless
              <br />
              token swaps with AMM technology
            </motion.p>

            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-6">
              <Button
                size="lg"
                className="bg-[#a5f10d] text-black hover:bg-[#a5f10d]/90 font-medium px-10 py-6 text-xl rounded-full transition-all duration-300 hover:scale-105"
              >
                Get Started
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="border-white/30 text-white hover:bg-white/10 bg-transparent font-medium px-10 py-6 text-xl rounded-full transition-all duration-300 hover:scale-105"
              >
                Learn More
              </Button>
            </motion.div>
          </motion.div>

          {/* Right side - Spline 3D Model (positioned behind text on mobile) */}
          <motion.div
            variants={splineVariants}
            initial="hidden"
            animate="visible"
            className="relative h-[600px] lg:h-[800px] xl:h-[900px] w-full lg:w-[120%] xl:w-[130%] lg:-ml-8 xl:-ml-12"
          >
            <div className="absolute inset-0 w-full h-full lg:w-[110%] lg:h-[110%] lg:-top-[5%] lg:-left-[5%]">
              <iframe
                src="https://my.spline.design/reactiveorb-1fiKj8w0n83pkDxeGZ2jgbTH/"
                frameBorder="0"
                width="100%"
                height="100%"
                className="w-full h-full"
                title="Interactive 3D Orb"
              />
            </div>
          </motion.div>
        </div>
      </div>

      {/* Background Spline for mobile - positioned behind text */}
      <motion.div
        variants={splineVariants}
        initial="hidden"
        animate="visible"
        className="lg:hidden absolute inset-0 w-full h-full opacity-30 z-0"
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%]">
          <iframe
            src="https://my.spline.design/reactiveorb-1fiKj8w0n83pkDxeGZ2jgbTH/"
            frameBorder="0"
            width="100%"
            height="100%"
            className="w-full h-full"
            title="Interactive 3D Orb Background"
          />
        </div>
      </motion.div>
    </section>
  )
}
