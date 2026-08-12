'use client'

import { motion } from 'framer-motion'

export default function RobotMascot({ size = 120 }: { size?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      style={{ width: size, height: size }}
      className="relative shrink-0"
    >
      <svg
        viewBox="0 0 120 120"
        width={size}
        height={size}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Antenna */}
        <motion.line
          x1="60" y1="12" x2="60" y2="24"
          stroke="hsl(var(--primary))" strokeWidth="3" strokeLinecap="round"
        />
        <motion.circle
          cx="60" cy="10" r="4"
          fill="hsl(var(--primary))"
          animate={{ scale: [1, 1.3, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Head */}
        <rect
          x="28" y="24" width="64" height="52" rx="16"
          fill="hsl(var(--card))"
          stroke="hsl(var(--primary))" strokeWidth="2.5"
        />

        {/* Eyes */}
        <motion.g
          animate={{ scaleY: [1, 1, 0.1, 1, 1] }}
          transition={{ duration: 4, repeat: Infinity, times: [0, 0.45, 0.5, 0.55, 1] }}
          style={{ transformOrigin: '50px 46px' }}
        >
          <circle cx="50" cy="46" r="7" fill="hsl(var(--primary))" />
        </motion.g>
        <motion.g
          animate={{ scaleY: [1, 1, 0.1, 1, 1] }}
          transition={{ duration: 4, repeat: Infinity, times: [0, 0.45, 0.5, 0.55, 1] }}
          style={{ transformOrigin: '70px 46px' }}
        >
          <circle cx="70" cy="46" r="7" fill="hsl(var(--primary))" />
        </motion.g>
        {/* Eye shine */}
        <circle cx="52" cy="44" r="2.5" fill="hsl(var(--card))" />
        <circle cx="72" cy="44" r="2.5" fill="hsl(var(--card))" />

        {/* Cheeks */}
        <circle cx="38" cy="58" r="4" fill="hsl(var(--primary) / 0.2)" />
        <circle cx="82" cy="58" r="4" fill="hsl(var(--primary) / 0.2)" />

        {/* Smile */}
        <path
          d="M48 62 Q60 70 72 62"
          stroke="hsl(var(--primary))"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />

        {/* Body */}
        <rect
          x="36" y="80" width="48" height="32" rx="12"
          fill="hsl(var(--card))"
          stroke="hsl(var(--primary))" strokeWidth="2.5"
        />

        {/* Body screen */}
        <rect x="48" y="88" width="24" height="16" rx="4" fill="hsl(var(--primary) / 0.15)" />
        <motion.rect
          x="52" y="92" width="4" height="8" rx="1"
          fill="hsl(var(--primary))"
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
        <motion.rect
          x="58" y="92" width="4" height="8" rx="1"
          fill="hsl(var(--primary))"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
        <motion.rect
          x="64" y="92" width="4" height="8" rx="1"
          fill="hsl(var(--primary))"
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
        />

        {/* Arms */}
        <motion.rect
          x="22" y="84" width="8" height="18" rx="4"
          fill="hsl(var(--card))"
          stroke="hsl(var(--primary))" strokeWidth="2"
          animate={{ y: [84, 82, 84] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.rect
          x="90" y="84" width="8" height="18" rx="4"
          fill="hsl(var(--card))"
          stroke="hsl(var(--primary))" strokeWidth="2"
          animate={{ y: [84, 82, 84] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
        />
      </svg>

      {/* Floating sparkles */}
      <motion.div
        className="absolute -top-2 -right-2 text-primary"
        animate={{ opacity: [0, 1, 0], y: [0, -8, -12] }}
        transition={{ duration: 3, repeat: Infinity, delay: 0.5 }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 0L9.5 6.5L16 8L9.5 9.5L8 16L6.5 9.5L0 8L6.5 6.5L8 0Z" />
        </svg>
      </motion.div>
    </motion.div>
  )
}
