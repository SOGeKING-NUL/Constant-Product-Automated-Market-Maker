"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Menu, X } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAppKit } from '@reown/appkit/react'
import { useAccount, useDisconnect } from 'wagmi'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {DropdownMenu,DropdownMenuContent,DropdownMenuItem,DropdownMenuTrigger,} from '@/components/ui/dropdown-menu'
import { ChevronDown, LogOut } from 'lucide-react'
import { useAMM } from '@/contexts/AMMContext' // Import the AMM context

export default function Navigation() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const pathname = usePathname()

  const { open } = useAppKit()
  const { address, isConnected, chain } = useAccount()
  const { disconnect } = useDisconnect()
  
  // Use AMM context for mode toggle
  const { mode, toggleMode, isMockMode, isLiveMode } = useAMM()

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  const getChainName = () => {
    if (!chain) return 'Unknown'
    return chain.name
  }

  const isCorrectNetwork = chain?.id === 84532

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const navItems = [
    { name: "Home", href: "/" },
    { name: "Liquidity", href: "/liquidity" },
    { name: "Swap", href: "/swap" },
  ]

return (
  <motion.nav
    initial={{ y: -100, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    transition={{ duration: 0.8, delay: 0.2 }}
    className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      isScrolled ? "bg-black/20 backdrop-blur-md border-b border-white/10" : "bg-transparent"
    }`}
  >
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between h-16">
        {/* Logo (Left) */}
        <motion.div whileHover={{ scale: 1.05 }} className="text-2xl font-light tracking-tight">
          <Link href="/">AMM</Link>
        </motion.div>

        {/* Desktop Navigation (Centered) */}
        <div className="hidden md:flex items-center justify-center flex-1">
          <div className="flex items-center space-x-8">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`transition-colors duration-200 font-light tracking-wide ${
                  pathname === item.href ? "text-[#a5f10d]" : "text-white/80 hover:text-[#a5f10d]"
                }`}
              >
                {item.name}
              </Link>
            ))}
          </div>
        </div>

        {/* Desktop Controls (Right) */}
        <div className="hidden md:flex items-center gap-3">
          
          {/* Mock/Live Toggle Button */}
          <div className="flex items-center">
            <Button
              onClick={toggleMode}
              variant="outline"
              size="sm"
              className={`relative bg-transparent border transition-all duration-300 ${
                isLiveMode
                  ? "border-[#a5f10d] text-[#a5f10d] hover:bg-[#a5f10d]/10"
                  : "border-white/30 text-white/80 hover:bg-white/10"
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                    isLiveMode ? "bg-[#a5f10d] animate-pulse" : "bg-white/60"
                  }`}
                />
                <span className="font-light tracking-wide">{isLiveMode ? "LIVE" : "MOCK"}</span>
              </div>
            </Button>
          </div>

          {/* Wallet Section */}
          {!isConnected ? (
            <Button onClick={() => open()} variant="default" size="sm" className="flex items-center gap-2">
              Connect Wallet
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Badge variant={isCorrectNetwork ? "default" : "destructive"} className="hidden sm:flex">
                {getChainName()}
              </Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="flex items-center gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="hidden sm:inline">{formatAddress(address!)}</span>
                    </div>
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem onClick={() => disconnect()} className="flex items-center gap-2 text-destructive cursor-pointer">
                    <LogOut className="h-4 w-4" />
                    Disconnect
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        {/* Toggle Button and Mobile Menu */}
        <div className="flex items-center gap-4">
          {/* Mock/Live Toggle Button - Mobile Hidden */}
          <div className="hidden md:hidden">
            <Button
              onClick={toggleMode}
              variant="outline"
              size="sm"
              className={`relative bg-transparent border transition-all duration-300 ${
                isLiveMode
                  ? "border-[#a5f10d] text-[#a5f10d] hover:bg-[#a5f10d]/10"
                  : "border-white/30 text-white/80 hover:bg-white/10"
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                    isLiveMode ? "bg-[#a5f10d] animate-pulse" : "bg-white/60"
                  }`}
                />
                <span className="font-light tracking-wide">{isLiveMode ? "LIVE" : "MOCK"}</span>
              </div>
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 text-white/80 hover:text-[#a5f10d] transition-colors"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>
    </div>

    {/* Mobile Menu */}
    <AnimatePresence>
      {isMobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="md:hidden bg-black/90 backdrop-blur-md border-t border-white/10"
        >
          <div className="px-4 pt-4 pb-5 space-y-4">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`block w-full text-left py-2 transition-colors duration-200 font-light tracking-wide ${
                  pathname === item.href ? "text-[#a5f10d]" : "text-white/80 hover:text-[#a5f10d]"
                }`}
              >
                {item.name}
              </Link>
            ))}
            
            {/* Mobile Mode Toggle */}
            <div className="pt-4 border-t border-white/10">
              <div className="flex items-center justify-between mb-3">
                <span className="text-white/80 font-light tracking-wide">Trading Mode</span>
                <Badge 
                  variant="outline"
                  className={`transition-all duration-300 ${
                    isLiveMode 
                      ? "border-[#a5f10d] text-[#a5f10d] bg-[#a5f10d]/10" 
                      : "border-white/30 text-white/80 bg-white/5"
                  }`}
                >
                  {isLiveMode ? "LIVE" : "MOCK"}
                </Badge>
              </div>
              
              <Button
                onClick={toggleMode}
                variant="outline"
                size="sm"
                className={`w-full bg-transparent border transition-all duration-300 ${
                  isLiveMode
                    ? "border-[#a5f10d] text-[#a5f10d] hover:bg-[#a5f10d]/10"
                    : "border-white/30 text-white/80 hover:bg-white/10"
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                      isLiveMode ? "bg-[#a5f10d] animate-pulse" : "bg-white/60"
                    }`}
                  />
                  <span className="font-light tracking-wide">
                    Switch to {isLiveMode ? "MOCK" : "LIVE"} Mode
                  </span>
                </div>
              </Button>
            </div>

            {/* Mobile Wallet Button Section */}
            <div className="pt-4 border-t border-white/10 flex justify-center">
              {!isConnected ? (
                <Button onClick={() => open()} variant="default" size="sm" className="flex items-center gap-2">
                  Connect Wallet
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  <Badge variant={isCorrectNetwork ? "default" : "destructive"}>
                    {getChainName()}
                  </Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="flex items-center gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span>{formatAddress(address!)}</span>
                        </div>
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem onClick={() => disconnect()} className="flex items-center gap-2 text-destructive cursor-pointer">
                        <LogOut className="h-4 w-4" />
                        Disconnect
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </motion.nav>
);

}
