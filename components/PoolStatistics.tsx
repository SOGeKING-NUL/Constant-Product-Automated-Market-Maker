"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"

interface PoolStatisticsProps {
  poolState: {
    reserve0: number
    reserve1: number
    totalLPSupply: number
  }
  userBalances?: {
    lpToken: number
  }
  k: number
  currentPrice: number
  getUserPoolShare?: (address: string) => number
  address?: string
  isLiveMode: boolean
  isConnected: boolean
  isMockMode: boolean
  isLoading: boolean
  onRefresh?: () => void
  onReset?: () => void
  showOptions?: {
    showUserPoolShare?: boolean
    showPoolConstant?: boolean
    showCurrentPrice?: boolean
    showRefreshButton?: boolean
    showResetButton?: boolean
  }
}

export default function PoolStatistics({
  poolState,
  userBalances,
  k,
  currentPrice,
  getUserPoolShare,
  address,
  isLiveMode,
  isConnected,
  isMockMode,
  isLoading,
  onRefresh,
  onReset,
  showOptions = {
    showUserPoolShare: true,
    showPoolConstant: true,
    showCurrentPrice: true,
    showRefreshButton: true,
    showResetButton: true,
  }
}: PoolStatisticsProps) {
  
  const poolRatioPercentages = useMemo(() => {
    if (poolState.reserve0 <= 0 || poolState.reserve1 <= 0) {
      return { wethPercent: 0, usdcPercent: 0 }
    }

    // Original ratio: 1000 USDC per 1 WETH
    const originalRatio = 1000
    const currentRatio = poolState.reserve1 / poolState.reserve0

    // If current ratio equals original ratio, it's 50/50
    // If current ratio > original ratio, there's more USDC relative to WETH
    // If current ratio < original ratio, there's more WETH relative to USDC
    
    // Calculate the deviation from the original ratio
    const ratioDeviation = currentRatio / originalRatio
    
    // Convert to percentages
    // When ratioDeviation = 1, it's 50/50
    // When ratioDeviation > 1, USDC percentage increases
    // When ratioDeviation < 1, WETH percentage increases
    
    let usdcPercent: number
    let wethPercent: number
    
    if (ratioDeviation >= 1) {
      // More USDC relative to original ratio
      usdcPercent = 50 + (ratioDeviation - 1) * 20 // Scale factor of 20 for visual effect
      usdcPercent = Math.min(usdcPercent, 80) // Cap at 80%
      wethPercent = 100 - usdcPercent
    } else {
      // More WETH relative to original ratio
      wethPercent = 50 + (1 - ratioDeviation) * 20 // Scale factor of 20 for visual effect
      wethPercent = Math.min(wethPercent, 80) // Cap at 80%
      usdcPercent = 100 - wethPercent
    }

    return { wethPercent, usdcPercent }
  }, [poolState.reserve0, poolState.reserve1])

  const formatPoolConstant = useMemo(() => {
    if (k === 0) return '0'
    
    if (k >= 1000000000) {
      return `${(k / 1000000000).toFixed(2)}B`
    } else if (k >= 1000000) {
      return `${(k / 1000000).toFixed(2)}M`
    } else if (k >= 1000) {
      return `${(k / 1000).toFixed(2)}K`
    } else {
      return k.toFixed(2)
    }
  }, [k])

  const userPoolSharePercentage = useMemo(() => {
    if (!address || !getUserPoolShare) return 0
    return getUserPoolShare(address)
  }, [address, getUserPoolShare])

  return (
    <Card className="bg-white/5 backdrop-blur-md border-white/10">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-white text-lg font-light">Pool Statistics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Pool Balances with Dynamic Ratio */}
          <div>
            <div className="text-white/60 text-sm mb-3">Pool Balances</div>
            <div className="bg-black/20 rounded-lg p-4">
              <div className="flex justify-between items-center mb-3">
                <div className="text-xl font-medium text-white">
                  {poolState.reserve0.toFixed(4)} WETH
                </div>
                <div className="text-xl font-medium text-white">
                  {poolState.reserve1.toFixed(2)} USDC
                </div>
              </div>
              {/* Dynamic progress bar based on ratio deviation */}
              <div className="relative h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="absolute left-0 top-0 h-full bg-secondary rounded-full transition-all duration-300"
                  style={{
                    width: `${poolRatioPercentages.wethPercent}%`,
                  }}
                />
              </div>
              <div className="flex justify-between text-xs text-white/50 mt-2">
                <span>{poolRatioPercentages.wethPercent.toFixed(1)}% WETH</span>
                <span>{poolRatioPercentages.usdcPercent.toFixed(1)}% USDC</span>
              </div>
              <div className="text-xl text-white mt-1 text-center">
                Current ratio: <span className= "text-secondary"> {(poolState.reserve1 / poolState.reserve0).toFixed(2)}</span> USDC per WETH
              </div>
            </div>
          </div>

          {/* Metrics Grid */}
        <div className={`flex flex-col md:flex-row gap-4 ${
        [showOptions.showUserPoolShare, showOptions.showPoolConstant, showOptions.showCurrentPrice]
            .filter(Boolean).length === 1 ? 'md:justify-center' : ''
        }`}>
        
        {/* User Pool Share */}
        {showOptions.showUserPoolShare && (
            <div className="text-center flex-1 flex flex-col">
            <div className="text-white/60 text-sm mb-3">Your Pool Share</div>
            <div className="bg-black/20 rounded-lg p-4 flex-1 flex flex-col justify-center">
                <div className="text-2xl font-medium text-secondary mb-1">
                {(userPoolSharePercentage / 100).toFixed(2)}%
                </div>
                <div className="text-sm text-white/60">
                {userBalances?.lpToken.toFixed(18) || '0.000000000000000000'} LP Tokens
                </div>
            </div>
            </div>
        )}

        {/* Pool Constant */}
        {showOptions.showPoolConstant && (
            <div className="text-center flex-1 flex flex-col">
            <div className="text-white/60 text-sm mb-3">Pool Constant</div>
            <div className="bg-black/20 rounded-lg p-4 flex-1 flex flex-col justify-center">
                <div className="text-2xl font-medium text-white mb-1">{formatPoolConstant}</div>
                <div className="text-xs text-white/50">k = x × y</div>
            </div>
            </div>
        )}

        {/* Current Price */}
        {showOptions.showCurrentPrice && (
            <div className="text-center flex-1 flex flex-col">
            <div className="text-white/60 text-sm mb-3">WETH Price</div>
            <div className="bg-black/20 rounded-lg p-4 flex-1 flex flex-col justify-center">
                <div className="text-sm text-white/60">{currentPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })} USDC per WETH</div>
                <div className="text-sm text-white/50 mt-1">1 USDC = {(1/currentPrice).toFixed(6)} WETH</div>
            </div>
            </div>
        )}
        </div>

        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex justify-center">
          {showOptions.showResetButton && isMockMode && onReset && (
            <Button
              onClick={onReset}
              variant="outline"
              className="bg-transparent border-white/20 hover:bg-white/10"
            >
              Reset Pool Statistics
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
