"use client"

export default function AnimatedBackground() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden">
      {/* Main gradient background */}
      <div
        className="absolute inset-0 w-full h-full"
        style={{
          background: `
            radial-gradient(ellipse 90% 60% at 50% 40%, rgba(0, 255, 163, 0.12) 0%, transparent 70%),
            radial-gradient(ellipse 60% 40% at 70% 70%, rgba(0, 188, 212, 0.10) 0%, transparent 70%),
            radial-gradient(ellipse 40% 30% at 20% 75%, rgba(165, 241, 13, 0.10) 0%, transparent 80%),
            linear-gradient(135deg, #0a0a0a 0%, #101010 100%)
          `,
        }}
      />

      {/* Futuristic grid overlay */}
      <div
        className="absolute inset-0 w-full h-full opacity-20 pointer-events-none"
        style={{
          background: `
            linear-gradient(0deg, transparent 95%, rgba(0,255,163,0.08) 100%),
            linear-gradient(90deg, transparent 95%, rgba(0,188,212,0.08) 100%)
          `,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Subtle noise overlay */}
      <div
        className="absolute inset-0 w-full h-full opacity-[0.03] pointer-events-none"
        style={{
          background: `
            repeating-linear-gradient(
              0deg,
              transparent,
              transparent 2px,
              rgba(255,255,255,0.07) 2px,
              rgba(255,255,255,0.07) 4px
            ),
            repeating-linear-gradient(
              90deg,
              transparent,
              transparent 2px,
              rgba(255,255,255,0.07) 2px,
              rgba(255,255,255,0.07) 4px
            )
          `,
        }}
      />
    </div>
  )
}
