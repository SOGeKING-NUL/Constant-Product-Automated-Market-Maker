import type React from "react"
import { Inter } from "next/font/google"
import type { Metadata } from "next"
import "./globals.css"
import Providers from "@/contexts/provider";
import { AMMProvider } from "@/contexts/AMMContext";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})

export const metadata: Metadata = {
  title: "xyk-amm",
  description: "A Constant Product Automated Market Maker for a WETH/USDC pair- provide liquidity and perform swaps",
  icons: {
    icon: "/images/favicon.ico",
    shortcut: "/images/favicon.ico",
    apple: "/images/favicon.ico",
  },
  openGraph: {
    title: "xyk-amm",
    description: "A Constant Product Automated Market Maker for a WETH/USDC pair- provide liquidity and perform swaps",
    url: "https://xyk-amm.vercel.app/", 
    siteName: "xyk-amm",
    images: [
      {
        url: "/images/preview.jpg", 
        width: 1200,
        height: 630,
        alt: "Constant Product Automated Market Maker for a WETH/USDC",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "xyk-amm: Constant Product AMM to understan liquidity pools and perform swaps",
    description: "Constant Product AMM to understan liquidity pools and perform swaps",
    images: ["/images/preview.jpg"], 
    site: "@JanaUtsav", 
  },
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans`}>
        <Providers>
          <AMMProvider>
            {children}
          </AMMProvider>
        </Providers>
      </body>
    </html>
  )
}
