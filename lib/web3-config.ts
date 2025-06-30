import { createAppKit } from '@reown/appkit/react'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { cookieStorage, createStorage } from 'wagmi'
import { baseSepolia as wagmiBaseSepolia } from 'wagmi/chains'

export const baseSepolia = {
  ...wagmiBaseSepolia,
  id: 84532,
  rpcUrls: {
    ...wagmiBaseSepolia.rpcUrls,
    default: {
      http: [process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL ||'https://base-sepolia.g.alchemy.com/v2/ucCVjEhtLHG-QjIy8oAHw']
    }
  },
} as const

export const projectId = process.env.NEXT_PUBLIC_PROJECT_ID || 'YOUR_PROJECT_ID'

if (!projectId) {
  throw new Error('Project ID is not defined')
}

export const networks = [baseSepolia]

export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({
    storage: cookieStorage
  }),
  ssr: true,
  projectId,
  networks
})

export const config = wagmiAdapter.wagmiConfig

export const modal = createAppKit({
  adapters: [wagmiAdapter],
  projectId,
  networks: [baseSepolia],
  defaultNetwork: baseSepolia,
  features: {
    analytics: true,
  }
})
