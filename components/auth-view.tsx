'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Lock, Loader2, ArrowRight, User } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import RobotMascot from '@/components/robot-mascot'
import { supabase } from '@/lib/supabase-browser'

export default function AuthView() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (mode === 'signup' && !name.trim()) {
      setError('Nama wajib diisi saat mendaftar.')
      return
    }
    if (!email.trim() || !password) {
      setError('Email dan kata sandi wajib diisi.')
      return
    }
    if (password.length < 6) {
      setError('Kata sandi minimal 6 karakter.')
      return
    }
    setLoading(true)
    try {
      if (mode === 'signup') {
        const { data: signUpData, error: err } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { name: name.trim() } },
        })
        if (err) throw err
        if (signUpData.user) {
          try {
            const res = await fetch('/api/profiles', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: name.trim() }),
            })
            if (!res.ok) throw new Error('profile insert failed')
          } catch {
            // non-fatal — user can set name later in profile
          }
        }
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })
        if (err) throw err
      }
    } catch (err: any) {
      setError(
        err.message?.includes('Invalid login')
          ? 'Email atau kata sandi salah.'
          : err.message?.includes('already registered')
            ? 'Email sudah terdaftar. Silakan masuk.'
            : err.message || 'Terjadi kesalahan.'
      )
    } finally {
      setLoading(false)
    }
  }

  const switchMode = (m: 'login' | 'signup') => {
    setMode(m)
    setError(null)
    setPassword('')
  }

  return (
    <div className="min-h-screen w-full bg-[#0F172A] lg:grid lg:grid-cols-2">
      {/* Left — branding panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden border-r border-white/[0.07] bg-white/[0.018] p-12 lg:flex">
        <div className="pointer-events-none absolute -left-16 -top-24 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl" />

        <div className="relative flex items-center gap-2.5">
          <div className="flex h-[30px] w-[30px] items-center justify-center rounded-[9px] bg-gradient-to-br from-cyan-500 to-blue-500 shadow-[0_0_14px_rgba(6,182,212,0.35)]">
            <span className="text-sm font-black text-white">F</span>
          </div>
          <span className="text-lg font-extrabold tracking-tight text-white">
            Fokus<span className="text-cyan-400">.</span>
          </span>
        </div>

        <div className="relative flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            <RobotMascot size={160} />
          </motion.div>
          <motion.h1
            className="mt-8 text-3xl font-extrabold tracking-tight text-white"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            Tetap fokus, capai target.
          </motion.h1>
          <motion.p
            className="mt-3 max-w-sm text-white/45"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            Pelacak perkuliahan pribadi — catat mata kuliah, absensi, dan tugas
            dalam satu tempat.
          </motion.p>
        </div>

        <div className="relative text-xs text-white/25">
          &copy; {new Date().getFullYear()} Fokus. Tracker Perkuliahan.
        </div>
      </div>

      {/* Right — form panel */}
      <div className="relative flex min-h-screen items-center justify-center px-6 py-12 lg:min-h-0">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -right-[5%] -top-[15%] h-[500px] w-[500px] rounded-full bg-[radial-gradient(circle,rgba(6,182,212,0.055)_0%,transparent_70%)]" />
        </div>
        <motion.div
          key={mounted ? 'mounted' : 'ssr'}
          className="w-full max-w-sm"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Mobile logo */}
          <div className="mb-8 flex flex-col items-center gap-4 lg:hidden">
            <div className="flex items-center gap-2.5">
              <div className="flex h-[30px] w-[30px] items-center justify-center rounded-[9px] bg-gradient-to-br from-cyan-500 to-blue-500">
                <span className="text-sm font-black text-white">F</span>
              </div>
              <span className="text-lg font-extrabold text-white">
                Fokus<span className="text-cyan-400">.</span>
              </span>
            </div>
            <RobotMascot size={100} />
          </div>

          {/* Mode toggle */}
          <div className="mb-6 grid grid-cols-2 rounded-xl border border-white/[0.08] bg-white/[0.02] p-1 text-sm font-semibold">
            {(['login', 'signup'] as const).map((m) => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                className={`relative rounded-[11px] py-2 text-center transition-colors ${
                  mode === m ? 'text-white' : 'text-white/38 hover:text-white/65'
                }`}
              >
                {mode === m && (
                  <motion.div
                    layoutId="auth-tab"
                    className="absolute inset-0 rounded-[11px] border border-cyan-400/25 bg-cyan-400/12"
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  />
                )}
                <span className="relative">
                  {m === 'login' ? 'Masuk' : 'Daftar'}
                </span>
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, x: mode === 'login' ? -12 : 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: mode === 'login' ? 12 : -12 }}
              transition={{ duration: 0.2 }}
            >
              <h2 className="text-2xl font-extrabold tracking-tight text-white">
                {mode === 'login' ? 'Selamat datang kembali' : 'Buat akun baru'}
              </h2>
              <p className="mt-1 text-sm text-white/45">
                {mode === 'login'
                  ? 'Masuk untuk melanjutkan perkuliahanmu.'
                  : 'Daftar untuk mulai melacak perkuliahanmu.'}
              </p>

              <form onSubmit={submit} className="mt-6 space-y-4">
                {mode === 'signup' && (
                  <div className="space-y-2">
                    <Label htmlFor="name">Nama Lengkap</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="name"
                        type="text"
                        autoComplete="name"
                        className="pl-9"
                        placeholder="Nama kamu"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        disabled={loading}
                      />
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      className="pl-9"
                      placeholder="nama@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Kata Sandi</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                      className="pl-9"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                </div>

                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm text-rose-400"
                  >
                    {error}
                  </motion.p>
                )}

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      {mode === 'login' ? 'Masuk' : 'Daftar Sekarang'}
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>

              <p className="mt-6 text-center text-sm text-white/45">
                {mode === 'login' ? (
                  <>
                    Belum punya akun?{' '}
                    <button
                      onClick={() => switchMode('signup')}
                      className="font-semibold text-cyan-400 hover:underline"
                    >
                      Daftar di sini
                    </button>
                  </>
                ) : (
                  <>
                    Sudah punya akun?{' '}
                    <button
                      onClick={() => switchMode('login')}
                      className="font-semibold text-cyan-400 hover:underline"
                    >
                      Masuk
                    </button>
                  </>
                )}
              </p>
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  )
}
