"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RefreshCw, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react"

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
  // New props for enhanced functionality
  pageType?: 'swap' | 'liquidity'
  swapAmount?: string
  fromToken?: 'WETH' | 'USDC'
  expectedOutput?: number
  priceImpact?: number
  showOptions?: {
    showUserPoolShare?: boolean
    showPoolConstant?: boolean
    showCurrentPrice?: boolean
    showRefreshButton?: boolean
    showResetButton?: boolean
    showPriceImpact?: boolean
    showLiquidityDepth?: boolean
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
  pageType = 'swap',
  swapAmount,
  fromToken,
  expectedOutput,
  priceImpact,
  showOptions = {
    showUserPoolShare: true,
    showPoolConstant: true,
    showCurrentPrice: true,
    showRefreshButton: true,
    showResetButton: true,
    showPriceImpact: true,
    showLiquidityDepth: true,
  }
}: PoolStatisticsProps) {
  
  const poolRatioPercentages = useMemo(() => {
    if (poolState.reserve0 <= 0 || poolState.reserve1 <= 0) {
      return { wethPercent: 0, usdcPercent: 0 }
    }

    // Original ratio: 1000 USDC per 1 WETH
    const originalRatio = 1000
    const currentRatio = poolState.reserve1 / poolState.reserve0

    // Calculate the deviation from the original ratio
    const ratioDeviation = currentRatio / originalRatio
    
    let usdcPercent: number
    let wethPercent: number
    
    if (ratioDeviation >= 1) {
      // More USDC relative to original ratio
      usdcPercent = 50 + (ratioDeviation - 1) * 20
      usdcPercent = Math.min(usdcPercent, 80)
      wethPercent = 100 - usdcPercent
    } else {
      // More WETH relative to original ratio
      wethPercent = 50 + (1 - ratioDeviation) * 20
      wethPercent = Math.min(wethPercent, 80)
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

  const getPriceImpactColor = (impact: number) => {
    if (impact < 1) return 'text-green-400'
    if (impact < 3) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getPriceImpactIcon = (impact: number) => {
    if (impact < 1) return <TrendingUp className="h-4 w-4 text-green-400" />
    if (impact < 3) return <AlertTriangle className="h-4 w-4 text-yellow-400" />
    return <TrendingDown className="h-4 w-4 text-red-400" />
  }

  return (
    <Card className="bg-white/5 backdrop-blur-md border-white/10">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-white text-lg font-light">
          {pageType === 'swap' ? 'Swap Analytics' : 'Pool Analytics'}
        </CardTitle>
        {showOptions.showRefreshButton && onRefresh && (
          <Button
            onClick={onRefresh}
            variant="ghost"
            size="sm"
            disabled={isLoading}
            className="text-white/60 hover:text-white hover:bg-white/10"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
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
              <div className="text-sm text-white mt-2 text-center">
                Ratio: <span className="text-secondary">{(poolState.reserve1 / poolState.reserve0).toFixed(2)}</span> USDC per WETH
              </div>
            </div>
          </div>

          {/* Page-specific metrics */}
          {pageType === 'swap' && showOptions.showPriceImpact && swapAmount && expectedOutput && priceImpact !== undefined && (
            <div>
              <div className="text-white/60 text-sm mb-3">Swap Impact</div>
              <div className="bg-black/20 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white/60 text-sm">Price Impact</span>
                  <div className="flex items-center gap-1">
                    {getPriceImpactIcon(priceImpact)}
                    <span className={`font-medium ${getPriceImpactColor(priceImpact)}`}>
                      {priceImpact.toFixed(2)}%
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/60">Expected Output</span>
                  <span className="text-white">
                    {expectedOutput.toFixed(6)} {fromToken === 'WETH' ? 'USDC' : 'WETH'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-white/60">Rate</span>
                  <span className="text-white">
                    1 {fromToken} = {(expectedOutput / Number(swapAmount)).toFixed(6)} {fromToken === 'WETH' ? 'USDC' : 'WETH'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Core Metrics Grid - 4 cards in 2x2 grid */}
          <div className="grid grid-cols-2 gap-4">
            
            {/* User Pool Share */}
            {showOptions.showUserPoolShare && (
              <div className="text-center">
                <div className="text-white/60 text-sm mb-2">Your Pool Share</div>
                <div className="bg-black/20 rounded-lg p-4">
                  <div className="text-2xl font-medium text-secondary mb-1">
                    {(userPoolSharePercentage / 100).toFixed(4)}%
                  </div>
                  <div className="text-xs text-white/60">
                    {userBalances?.lpToken.toFixed(6) || '0.000000'} LP Tokens
                  </div>
                </div>
              </div>
            )}

            {/* Pool Constant */}
            {showOptions.showPoolConstant && (
              <div className="text-center">
                <div className="text-white/60 text-sm mb-2">Pool Constant</div>
                <div className="bg-black/20 rounded-lg p-4">
                  <div className="text-xl font-medium text-white mb-1">{formatPoolConstant}</div>
                  <div className="text-xs text-white/50">k = x × y</div>
                </div>
              </div>
            )}

            {/* Current Price */}
            {showOptions.showCurrentPrice && (
              <div className="text-center">
                <div className="text-white/60 text-sm mb-2">WETH Price</div>
                <div className="bg-black/20 rounded-lg p-4">
                  <div className="text-lg font-medium text-white mb-1">
                    {currentPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })} USDC
                  </div>
                  <div className="text-xs text-white/50">
                    1 USDC = {(1/currentPrice).toFixed(6)} WETH
                  </div>
                </div>
              </div>
            )}

            {/* Liquidity Depth (for small pools) */}
            {showOptions.showLiquidityDepth && (
              <div className="text-center">
                <div className="text-white/60 text-sm mb-2">Liquidity Depth</div>
                <div className="bg-black/20 rounded-lg p-4">
                  <div className="text-lg font-medium text-white mb-1">
                    {poolState.reserve0 < 1 ? 'Low' : poolState.reserve0 < 10 ? 'Medium' : 'High'}
                  </div>
                  <div className="text-xs text-white/50">
                    {poolState.reserve0.toFixed(4)} WETH available
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          {showOptions.showResetButton && isMockMode && onReset && (
            <div className="flex justify-center pt-4">
              <Button
                onClick={onReset}
                variant="outline"
                className="bg-transparent border-white/20 hover:bg-white/10"
              >
                Reset Pool Statistics
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
