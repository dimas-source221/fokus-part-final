'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, Bell, LogOut } from 'lucide-react'

import { supabase } from '@/lib/supabase-browser'
import { api } from '@/lib/api'
import NotificationProvider from '@/components/notification-provider'
import { useClock } from '@/components/fokus/ui'
import TrackerView from '@/components/tracker-view'
import DashboardView from '@/components/views/dashboard-view'
import TasksView from '@/components/views/tasks-view'
import NotesView from '@/components/views/notes-view'
import CalendarView from '@/components/views/calendar-view'
import PomodoroView from '@/components/views/pomodoro-view'
import ProfileView from '@/components/views/profile-view'

type View = 'dashboard' | 'tracker' | 'tasks' | 'notes' | 'calendar' | 'pomodoro' | 'profile'

const NAV_ITEMS: { id: View; label: string; icon: ReactNode }[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: (
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    id: 'tracker',
    label: 'Course Tracker',
    icon: (
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
      </svg>
    ),
  },
  {
    id: 'tasks',
    label: 'Tasks',
    icon: (
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
      </svg>
    ),
  },
  {
    id: 'notes',
    label: 'Notes',
    icon: (
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14,2 14,8 20,8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <line x1="10" y1="9" x2="8" y2="9" />
      </svg>
    ),
  },
  {
    id: 'calendar',
    label: 'Calendar',
    icon: (
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    id: 'pomodoro',
    label: 'Pomodoro',
    icon: (
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <circle cx="12" cy="12" r="10" />
        <polyline points="12,6 12,12 16,14" />
      </svg>
    ),
  },
  {
    id: 'profile',
    label: 'Profile',
    icon: (
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
]

const VIEW_LABELS: Record<View, string> = {
  dashboard: 'Dashboard',
  tracker: 'Course Tracker',
  tasks: 'Tasks',
  notes: 'Notes',
  calendar: 'Calendar',
  pomodoro: 'Pomodoro',
  profile: 'Profile',
}

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' as const } },
  exit: { opacity: 0, y: -6, transition: { duration: 0.15 } },
}

function Sidebar({
  active,
  onNav,
  className,
}: {
  active: View
  onNav: (v: View) => void
  className?: string
}) {
  return (
    <aside
      className={`flex w-[234px] min-w-[234px] flex-col border-r border-white/[0.07] bg-white/[0.018] ${className ?? ''}`}
    >
      <div className="border-b border-white/[0.07] px-5 pb-[18px] pt-[22px]">
        <div className="flex items-center gap-2.5">
          <div className="flex h-[30px] w-[30px] items-center justify-center rounded-[9px] bg-gradient-to-br from-cyan-500 to-blue-500 shadow-[0_0_14px_rgba(6,182,212,0.35)]">
            <span className="text-sm font-black tracking-tight text-white">F</span>
          </div>
          <span className="text-lg font-extrabold tracking-tight text-white">
            Fokus<span className="text-cyan-400">.</span>
          </span>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 p-2.5">
        {NAV_ITEMS.map((item) => {
          const isActive = active === item.id
          return (
            <button
              key={item.id}
              onClick={() => onNav(item.id)}
              className={`flex items-center gap-2.5 rounded-[11px] px-3 py-2.5 text-left text-[13px] font-semibold transition-all duration-150 ${
                isActive
                  ? 'border border-cyan-400/22 bg-cyan-400/10 text-cyan-300 shadow-[0_0_18px_rgba(34,211,238,0.1)]'
                  : 'border border-transparent text-white/42 hover:bg-white/[0.04] hover:text-white/75'
              }`}
            >
              <span className={isActive ? 'opacity-100' : 'opacity-60'}>{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              {isActive && (
                <span className="h-[5px] w-[5px] shrink-0 rounded-full bg-cyan-400 shadow-[0_0_7px_#22d3ee]" />
              )}
            </button>
          )
        })}
      </nav>

      <div className="border-t border-white/[0.07] px-5 py-3.5">
        <div className="flex items-center gap-2">
          <span className="h-[7px] w-[7px] shrink-0 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
          <span className="text-[11px] text-white/22">Online · v2.4.0</span>
        </div>
      </div>
    </aside>
  )
}

function TopBar({
  view,
  userName,
  onLogout,
  onNavigate,
}: {
  view: View
  userName: string
  onLogout: () => void
  onNavigate: (v: View) => void
}) {
  const now = useClock()
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening'
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifs, setNotifs] = useState<{ msg: string; time: string; color: string; view?: View }[]>([])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const items: typeof notifs = []
        const taskData = await api('/tasks').catch(() => null)
        const pending = (taskData?.tasks ?? []).filter((t: { done: boolean; due_at: string | null }) => !t.done && t.due_at)
        for (const t of pending.slice(0, 2)) {
          items.push({
            msg: t.title,
            time: new Date(t.due_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
            color: '#fbbf24',
            view: 'tasks',
          })
        }
        const agendaData = await api('/agendas').catch(() => null)
        for (const a of (agendaData?.agendas ?? []).slice(0, 2)) {
          items.push({
            msg: a.title,
            time: a.agenda_date,
            color: '#22d3ee',
            view: 'calendar',
          })
        }
        if (!cancelled) setNotifs(items.length ? items : [
          { msg: 'Semua tugas sudah selesai!', time: 'Hari ini', color: '#34d399' },
        ])
      } catch {
        // silent
      }
    })()
    return () => { cancelled = true }
  }, [])

  const displayName = userName.split(' ')[0] || 'User'
  const initial = displayName.charAt(0).toUpperCase()

  return (
    <header className="sticky top-0 z-[9] flex items-center justify-between border-b border-white/[0.07] bg-[#0f172a]/85 px-6 py-3 backdrop-blur-xl">
      <div>
        <p className="mb-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white/35">
          {VIEW_LABELS[view]}
        </p>
        <p className="text-[15px] font-bold text-white">
          {greeting},{' '}
          <span className="text-cyan-400">{displayName}!</span>
        </p>
      </div>

      <div className="flex items-center gap-5">
        <div className="hidden text-right sm:block">
          <p className="mono text-[13px] font-semibold tracking-wide text-white/90">{timeStr}</p>
          <p className="text-[11px] text-white/32">{dateStr}</p>
        </div>

        <div className="relative">
          <button
            onClick={() => setNotifOpen((v) => !v)}
            className={`relative flex h-9 w-9 items-center justify-center rounded-[11px] border border-white/10 transition-colors ${
              notifOpen ? 'bg-cyan-400/10' : 'bg-white/[0.04]'
            }`}
          >
            <Bell className="h-[15px] w-[15px] text-white/65" />
            {notifs.length > 0 && (
              <span className="absolute right-[7px] top-[7px] h-[7px] w-[7px] rounded-full border-[1.5px] border-[#0f172a] bg-cyan-400 shadow-[0_0_7px_#22d3ee]" />
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-11 z-50 w-[280px] overflow-hidden rounded-2xl border border-white/10 bg-[#1a2744] shadow-[0_20px_60px_rgba(0,0,0,0.5)] backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3">
                <p className="text-[13px] font-bold text-white">Notifications</p>
                <span className="rounded-full bg-cyan-400/15 px-[7px] py-0.5 text-[10px] font-bold text-cyan-400">
                  {notifs.length} new
                </span>
              </div>
              {notifs.map((n, i) => (
                <button
                  key={i}
                  onClick={() => { if (n.view) onNavigate(n.view); setNotifOpen(false) }}
                  className="flex w-full items-start gap-2.5 border-b border-white/[0.05] px-4 py-[11px] text-left last:border-none hover:bg-white/[0.03]"
                >
                  <div className="mt-1 h-[7px] w-[7px] shrink-0 rounded-full" style={{ background: n.color }} />
                  <div>
                    <p className="text-xs text-white/80">{n.msg}</p>
                    <p className="mt-0.5 text-[11px] text-white/30">{n.time}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={() => onNavigate('profile')}
          className="flex h-9 w-9 items-center justify-center rounded-[11px] border-2 border-cyan-400/35 bg-gradient-to-br from-cyan-500 to-blue-500 text-sm font-extrabold text-white"
        >
          {initial}
        </button>

        <button
          onClick={onLogout}
          title="Keluar"
          className="flex h-9 w-9 items-center justify-center rounded-[11px] border border-white/10 bg-white/[0.04] text-white/50 transition-colors hover:bg-rose-500/10 hover:text-rose-300"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  )
}

export default function AppShell() {
  const [active, setActive] = useState<View>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userName, setUserName] = useState('')

  useEffect(() => {
    api('/profiles')
      .then((d) => { if (d?.profile?.name) setUserName(d.profile.name) })
      .catch(() => {})
  }, [])

  const navigate = (id: View) => {
    setActive(id)
    setSidebarOpen(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  const views: Record<View, ReactNode> = {
    dashboard: <DashboardView onNavigate={(id) => navigate(id as View)} userName={userName} />,
    tracker: <TrackerView />,
    tasks: <TasksView />,
    notes: <NotesView />,
    calendar: <CalendarView />,
    pomodoro: <PomodoroView />,
    profile: <ProfileView />,
  }

  return (
    <div className="flex min-h-screen bg-[#0F172A] font-sans">
      <NotificationProvider />

      {/* Ambient glows */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -right-[5%] -top-[15%] h-[700px] w-[700px] rounded-full bg-[radial-gradient(circle,rgba(6,182,212,0.055)_0%,transparent_70%)]" />
        <div className="absolute -bottom-[10%] left-[15%] h-[600px] w-[600px] rounded-full bg-[radial-gradient(circle,rgba(99,102,241,0.05)_0%,transparent_70%)]" />
        <div className="absolute -left-[8%] top-[40%] h-[400px] w-[400px] rounded-full bg-[radial-gradient(circle,rgba(52,211,153,0.03)_0%,transparent_70%)]" />
      </div>

      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          />
        )}
      </AnimatePresence>

      <Sidebar
        active={active}
        onNav={navigate}
        className={`fixed inset-y-0 left-0 z-40 h-screen transition-transform duration-300 lg:sticky lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      />

      <div className="relative z-[1] flex min-h-screen min-w-0 flex-1 flex-col">
        <div className="flex items-center border-b border-white/[0.07] px-4 py-2 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-[11px] border border-white/10 bg-white/[0.04] text-white/65"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>

        <TopBar view={active} userName={userName} onLogout={handleLogout} onNavigate={navigate} />

        <main className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              {views[active]}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}
