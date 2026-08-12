'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import type confetti from 'canvas-confetti'
import {
  Play, Pause, RotateCcw, Coffee, Brain, Timer as TimerIcon,
  Flame, CheckCircle2, Plus, Minus, Bell, X,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Card, CardContent,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { api, getCached, setCached, invalidateCache } from '@/lib/api'

type Mode = 'focus' | 'short_break' | 'long_break'
type SessionRecord = {
  id: string
  mode: string
  duration_minutes: number
  completed_at: string
}

const MODE_CONFIG: Record<Mode, {
  label: string
  icon: typeof Brain
  color: string
  ringColor: string
  bgColor: string
  defaultMinutes: number
}> = {
  focus: {
    label: 'Fokus',
    icon: Brain,
    color: 'text-primary',
    ringColor: 'hsl(var(--primary))',
    bgColor: 'bg-primary/10',
    defaultMinutes: 25,
  },
  short_break: {
    label: 'Jeda Pendek',
    icon: Coffee,
    color: 'text-emerald-600 dark:text-emerald-400',
    ringColor: 'hsl(142 71% 45%)',
    bgColor: 'bg-emerald-500/10',
    defaultMinutes: 5,
  },
  long_break: {
    label: 'Jeda Panjang',
    icon: Coffee,
    color: 'text-sky-600 dark:text-sky-400',
    ringColor: 'hsl(199 89% 48%)',
    bgColor: 'bg-sky-500/10',
    defaultMinutes: 15,
  },
}

const STORAGE_KEY = 'pomodoro_settings'

type Settings = {
  focus: number
  short_break: number
  long_break: number
  longBreakInterval: number
}

const DEFAULT_SETTINGS: Settings = {
  focus: 25,
  short_break: 5,
  long_break: 15,
  longBreakInterval: 4,
}

function celebrate(opts: confetti.Options = {}) {
  if (typeof window === 'undefined') return
  import('canvas-confetti').then(({ default: confetti }) => {
    const defaults = {
      spread: 70, startVelocity: 35, ticks: 200, gravity: 0.9,
      decay: 0.9, scalar: 0.9,
      colors: ['#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#14b8a6'],
    }
    const merged = { ...defaults, ...opts }
    confetti({ ...merged, particleCount: 80, origin: { x: 0.5, y: 0.65 } })
    setTimeout(() => {
      confetti({ ...merged, particleCount: 50, angle: 60, origin: { x: 0.1, y: 0.75 } })
      confetti({ ...merged, particleCount: 50, angle: 120, origin: { x: 0.9, y: 0.75 } })
    }, 150)
  })
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

export default function PomodoroView() {
  const [settings, setSettings] = useState<Settings>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        try { return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } } catch {}
      }
    }
    return DEFAULT_SETTINGS
  })
  const [mode, setMode] = useState<Mode>('focus')
  const [secondsLeft, setSecondsLeft] = useState(settings.focus * 60)
  const [running, setRunning] = useState(false)
  const [completedFocus, setCompletedFocus] = useState(0)
  const [sessions, setSessions] = useState<SessionRecord[]>(() => getCached('pomodoro') || [])
  const [loaded, setLoaded] = useState(!!getCached('pomodoro'))
  const [showSettings, setShowSettings] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const endTimeRef = useRef<number | null>(null)

  const totalSeconds = settings[mode] * 60
  const progress = 1 - secondsLeft / totalSeconds

  const loadSessions = useCallback(async () => {
    try {
      const d = await api('/pomodoro')
      setSessions(setCached('pomodoro', d.sessions))
    } catch {
      // silent on first load
    } finally {
      setLoaded(true)
    }
  }, [])

  useEffect(() => {
    loadSessions()
  }, [loadSessions])

  // Timer tick using end-time reference for accuracy
  useEffect(() => {
    if (!running) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }
    endTimeRef.current = Date.now() + secondsLeft * 1000
    intervalRef.current = setInterval(() => {
      const remaining = Math.round((endTimeRef.current! - Date.now()) / 1000)
      if (remaining <= 0) {
        setSecondsLeft(0)
        setRunning(false)
        handleComplete()
      } else {
        setSecondsLeft(remaining)
      }
    }, 250)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [running])

  // Reset timer when mode or settings change (and not running)
  useEffect(() => {
    if (!running) {
      setSecondsLeft(settings[mode] * 60)
    }
  }, [mode, settings, running])

  const handleComplete = async () => {
    const completedMode = mode
    const durationMin = settings[completedMode]
    celebrate()
    if (completedMode === 'focus') {
      const newCount = completedFocus + 1
      setCompletedFocus(newCount)
      const isLongBreak = newCount % settings.longBreakInterval === 0
      const nextMode: Mode = isLongBreak ? 'long_break' : 'short_break'
      toast.success(`Sesi fokus selesai! Waktunya ${MODE_CONFIG[nextMode].label.toLowerCase()}.`)
      setMode(nextMode)
      setSecondsLeft(settings[nextMode] * 60)
    } else {
      toast.success('Jeda selesai! Siap untuk fokus lagi?')
      setMode('focus')
      setSecondsLeft(settings.focus * 60)
    }
    // Save session
    try {
      await api('/pomodoro', {
        method: 'POST',
        body: JSON.stringify({ mode: completedMode, duration_minutes: durationMin }),
      })
      invalidateCache('pomodoro')
      await loadSessions()
    } catch (e: any) {
      // non-critical
    }
    // Browser notification
    if (typeof window !== 'undefined' && Notification?.permission === 'granted') {
      new Notification('Fokus.', {
        body: completedMode === 'focus' ? 'Sesi fokus selesai!' : 'Jeda selesai!',
      })
    }
  }

  const start = () => {
    setRunning(true)
    if (typeof window !== 'undefined' && Notification?.permission === 'default') {
      Notification.requestPermission()
    }
  }
  const pause = () => setRunning(false)
  const reset = () => {
    setRunning(false)
    setSecondsLeft(settings[mode] * 60)
  }

  const switchMode = (m: Mode) => {
    setRunning(false)
    setMode(m)
    setSecondsLeft(settings[m] * 60)
  }

  const saveSettings = (s: Settings) => {
    setSettings(s)
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
    }
    if (!running) {
      setSecondsLeft(s[mode] * 60)
    }
  }

  // Stats
  const todaySessions = sessions.filter((s) =>
    isSameDay(new Date(s.completed_at), new Date())
  )
  const todayFocusMinutes = todaySessions
    .filter((s) => s.mode === 'focus')
    .reduce((sum, s) => sum + s.duration_minutes, 0)
  const todayFocusCount = todaySessions.filter((s) => s.mode === 'focus').length
  const totalFocusMinutes = sessions
    .filter((s) => s.mode === 'focus')
    .reduce((sum, s) => sum + s.duration_minutes, 0)

  // SVG ring geometry
  const radius = 130
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference * (1 - progress)
  const cfg = MODE_CONFIG[mode]
  const ModeIcon = cfg.icon

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-extrabold text-white">Pomodoro Timer</h2>
        <p className="text-muted-foreground mt-1">
          Timer fokus belajar dengan teknik Pomodoro.
        </p>
      </div>

      {/* Mode selector */}
      <div className="flex items-center justify-center">
        <div className="flex items-center gap-1 rounded-xl bg-muted p-1.5">
          {(['focus', 'short_break', 'long_break'] as const).map((m) => {
            const mc = MODE_CONFIG[m]
            const Icon = mc.icon
            const active = mode === m
            return (
              <button
                key={m}
                onClick={() => switchMode(m)}
                className={`relative flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                  active ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {active && (
                  <motion.div
                    layoutId="pomodoro-tab"
                    className="absolute inset-0 rounded-lg bg-primary"
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  />
                )}
                <Icon className="h-4 w-4 relative" />
                <span className="relative">{mc.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Timer circle */}
      <div className="flex flex-col items-center gap-8">
        <div className="relative">
          <svg
            width="300"
            height="300"
            viewBox="0 0 300 300"
            className="-rotate-90"
          >
            {/* Track */}
            <circle
              cx="150" cy="150" r={radius}
              fill="none"
              stroke="hsl(var(--muted))"
              strokeWidth="14"
            />
            {/* Progress */}
            <motion.circle
              cx="150" cy="150" r={radius}
              fill="none"
              stroke={cfg.ringColor}
              strokeWidth="14"
              strokeLinecap="round"
              strokeDasharray={circumference}
              animate={{ strokeDashoffset: dashOffset }}
              transition={{ duration: 0.3, ease: 'linear' }}
            />
          </svg>

          {/* Center content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <div className={`flex items-center gap-2 ${cfg.color}`}>
              <ModeIcon className="h-5 w-5" />
              <span className="text-sm font-medium">{cfg.label}</span>
            </div>
            <motion.div
              key={mode}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-6xl font-bold tabular-nums tracking-tight"
            >
              {formatTime(secondsLeft)}
            </motion.div>
            <div className="text-xs text-muted-foreground">
              dari {settings[mode]} menit
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            className="h-12 w-12 rounded-full"
            onClick={reset}
            aria-label="Reset"
          >
            <RotateCcw className="h-5 w-5" />
          </Button>
          {running ? (
            <Button
              size="lg"
              className="h-16 w-16 rounded-full p-0"
              onClick={pause}
              aria-label="Jeda"
            >
              <Pause className="h-7 w-7" />
            </Button>
          ) : (
            <Button
              size="lg"
              className="h-16 w-16 rounded-full p-0"
              onClick={start}
              aria-label="Mulai"
            >
              <Play className="h-7 w-7 ml-0.5" />
            </Button>
          )}
          <Button
            variant="outline"
            size="icon"
            className="h-12 w-12 rounded-full"
            onClick={() => setShowSettings(true)}
            aria-label="Pengaturan"
          >
            <TimerIcon className="h-5 w-5" />
          </Button>
        </div>

        {/* Session dots */}
        <div className="flex items-center gap-2">
          {Array.from({ length: settings.longBreakInterval }, (_, i) => (
            <motion.div
              key={i}
              animate={{
                scale: i < completedFocus % settings.longBreakInterval || (completedFocus > 0 && completedFocus % settings.longBreakInterval === 0) ? 1 : 0.7,
              }}
              className={`h-2.5 w-2.5 rounded-full transition-colors ${
                i < (completedFocus % settings.longBreakInterval || (completedFocus > 0 ? settings.longBreakInterval : 0))
                  ? 'bg-primary'
                  : 'bg-muted-foreground/30'
              }`}
            />
          ))}
          <span className="ml-2 text-sm text-muted-foreground">
            {completedFocus} sesi fokus selesai
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Flame className="h-5 w-5" />
              </div>
              <div>
                <div className="text-2xl font-bold tabular-nums">{todayFocusMinutes}</div>
                <div className="text-sm text-muted-foreground">Menit fokus hari ini</div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0, transition: { delay: 0.08 } }}
        >
          <Card>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <div className="text-2xl font-bold tabular-nums">{todayFocusCount}</div>
                <div className="text-sm text-muted-foreground">Sesi fokus hari ini</div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0, transition: { delay: 0.16 } }}
        >
          <Card>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Brain className="h-5 w-5" />
              </div>
              <div>
                <div className="text-2xl font-bold tabular-nums">{totalFocusMinutes}</div>
                <div className="text-sm text-muted-foreground">Total menit fokus</div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Session history */}
      {loaded && sessions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0, transition: { delay: 0.2 } }}
        >
          <Card>
            <CardContent className="p-6">
              <h3 className="text-sm font-semibold text-muted-foreground mb-4">
                Riwayat Sesi Terakhir
              </h3>
              <div className="space-y-2">
                {sessions.slice(0, 8).map((s, i) => {
                  const mc = MODE_CONFIG[s.mode as Mode] || MODE_CONFIG.focus
                  const Icon = mc.icon
                  return (
                    <div
                      key={s.id}
                      className="flex items-center gap-3 rounded-lg border p-3"
                    >
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${mc.bgColor} ${mc.color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium">{mc.label}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(s.completed_at).toLocaleString('id-ID', {
                            day: 'numeric', month: 'short',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </div>
                      </div>
                      <Badge variant="secondary" className="shrink-0">
                        {s.duration_minutes} mnt
                      </Badge>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Settings dialog */}
      <SettingsDialog
        open={showSettings}
        onClose={() => setShowSettings(false)}
        settings={settings}
        onSave={saveSettings}
      />
    </div>
  )
}

function SettingsDialog({
  open,
  onClose,
  settings,
  onSave,
}: {
  open: boolean
  onClose: () => void
  settings: Settings
  onSave: (s: Settings) => void
}) {
  const [local, setLocal] = useState(settings)

  useEffect(() => {
    if (open) setLocal(settings)
  }, [open, settings])

  const adjust = (key: keyof Settings, delta: number, min: number, max: number) => {
    setLocal((prev) => ({
      ...prev,
      [key]: Math.max(min, Math.min(max, prev[key] + delta)),
    }))
  }

  const save = () => {
    onSave(local)
    onClose()
    toast.success('Pengaturan disimpan')
  }

  const rows: { key: keyof Settings; label: string; min: number; max: number; unit: string }[] = [
    { key: 'focus', label: 'Durasi Fokus', min: 5, max: 60, unit: 'menit' },
    { key: 'short_break', label: 'Jeda Pendek', min: 1, max: 15, unit: 'menit' },
    { key: 'long_break', label: 'Jeda Panjang', min: 5, max: 30, unit: 'menit' },
    { key: 'longBreakInterval', label: 'Sesi sebelum jeda panjang', min: 2, max: 8, unit: 'sesi' },
  ]

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-xl border bg-card p-6 shadow-lg"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Pengaturan Timer</h3>
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              {rows.map((r) => (
                <div key={r.key} className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">{r.label}</div>
                    <div className="text-xs text-muted-foreground">{r.min}–{r.max} {r.unit}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => adjust(r.key, -1, r.min, r.max)}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-12 text-center font-semibold tabular-nums">
                      {local[r.key]}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => adjust(r.key, 1, r.min, r.max)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <Button className="w-full mt-6" onClick={save}>
              Simpan Pengaturan
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
