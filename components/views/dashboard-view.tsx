'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

import { GlassCard, FokusBadge, type FokusBadgeColor, COURSE_COLORS } from '@/components/fokus/ui'
import { api } from '@/lib/api'

type Course = {
  id: string
  course_name: string
  code_sks: string | null
  semester: number
  progress: number
  session_count?: number
}

type Task = {
  id: string
  title: string
  done: boolean
  due_at: string | null
}

const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
const DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']

function taskStatusLabel(done: boolean, dueAt: string | null): { label: string; color: FokusBadgeColor } {
  if (done) return { label: 'Completed', color: 'green' }
  if (dueAt) {
    const diff = new Date(dueAt).getTime() - Date.now()
    if (diff < 0) return { label: 'Overdue', color: 'rose' }
    if (diff < 3 * 86400000) return { label: 'In Progress', color: 'cyan' }
  }
  return { label: 'Not Started', color: 'amber' }
}

export default function DashboardView({
  onNavigate,
  userName,
}: {
  onNavigate?: (id: string) => void
  userName?: string
}) {
  const [courses, setCourses] = useState<Course[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [loaded, setLoaded] = useState(false)
  const [pomodoroCount, setPomodoroCount] = useState(0)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const all: Course[] = []
        for (let s = 1; s <= 9; s++) {
          const d = await api(`/courses?semester=${s}`)
          if (d.courses?.length) all.push(...d.courses)
        }
        if (!cancelled) setCourses(all)
      } catch {
        // silent
      }

      try {
        const d = await api('/tasks')
        if (!cancelled) setTasks(d.tasks ?? [])
      } catch {
        // silent
      }

      try {
        const d = await api('/pomodoro')
        if (!cancelled) setPomodoroCount((d.sessions ?? []).length)
      } catch {
        // silent
      } finally {
        if (!cancelled) setLoaded(true)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const now = new Date()
  const displayName = userName?.split(' ')[0] || 'User'
  const currentSemCourses = courses.filter((c) => c.semester === Math.max(...courses.map((x) => x.semester), 1))
  const displayCourses = (currentSemCourses.length ? currentSemCourses : courses).slice(0, 5)

  const totalCourses = courses.length
  const totalSessions = courses.reduce((s, c) => s + (c.session_count || 0), 0)
  const avgProgress =
    totalCourses > 0
      ? Math.round(courses.reduce((sum, c) => sum + (c.progress || 0), 0) / totalCourses)
      : 0
  const doneTasks = tasks.filter((t) => t.done).length
  const pendingTasks = tasks.filter((t) => !t.done)
  const dueThisWeek = pendingTasks.filter((t) => {
    if (!t.due_at) return false
    const diff = new Date(t.due_at).getTime() - Date.now()
    return diff >= 0 && diff <= 7 * 86400000
  }).length

  const todoCount = tasks.filter((t) => !t.done).length
  const inProgressCount = pendingTasks.filter((t) => t.due_at && new Date(t.due_at).getTime() - Date.now() < 3 * 86400000).length

  const metrics = [
    { label: 'Active Courses', value: String(totalCourses || 0), sub: totalCourses ? `Semester ${Math.max(...courses.map((c) => c.semester), 1)}` : 'Belum ada', icon: '📚', color: '#22d3ee', nav: 'tracker' },
    { label: 'Study Sessions', value: String(totalSessions || pomodoroCount), sub: 'All time', icon: '⏱', color: '#818cf8', nav: 'tracker' },
    { label: 'Avg. Progress', value: `${avgProgress}%`, sub: 'Across courses', icon: '📈', color: '#34d399', nav: null },
    { label: 'Tasks Done', value: tasks.length ? `${doneTasks}/${tasks.length}` : '0/0', sub: `${pendingTasks.length} remaining`, icon: '✅', color: '#f59e0b', nav: 'tasks' },
  ]

  const recentTasks = tasks.slice(0, 4).map((t) => ({
    title: t.title,
    status: taskStatusLabel(t.done, t.due_at),
  }))

  return (
    <div className="flex flex-col gap-5">
      {/* Greeting banner */}
      <GlassCard glow className="relative overflow-hidden p-6">
        <div className="pointer-events-none absolute right-0 top-0 h-full w-1/2 bg-[radial-gradient(ellipse_at_right_center,rgba(6,182,212,0.18)_0%,transparent_65%)]" />
        <div className="pointer-events-none absolute bottom-0 left-[30%] h-[60%] w-[40%] bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.12)_0%,transparent_70%)]" />
        <div className="relative flex items-center justify-between">
          <div>
            <p className="mb-1 text-xs text-white/40">
              {DAYS[now.getDay()]}, {now.getDate()} {MONTHS[now.getMonth()]} {now.getFullYear()}
            </p>
            <h1 className="mb-1.5 text-[22px] font-extrabold text-white">
              Welcome back, <span className="text-cyan-400">{displayName}!</span> 👋
            </h1>
            <p className="text-[13px] text-white/45">
              {loaded ? (
                <>
                  You have{' '}
                  <span className="font-semibold text-amber-300">
                    {dueThisWeek} task{dueThisWeek !== 1 ? 's' : ''} due this week
                  </span>
                  {totalCourses > 0 && ` across ${totalCourses} courses.`}
                </>
              ) : (
                'Loading your academic overview...'
              )}
            </p>
            <div className="mt-3 flex gap-4">
              <div className="flex items-center gap-1.5 text-xs text-white/55">
                <span>🔥</span>
                <span className="font-semibold text-white/85">{pomodoroCount > 0 ? `${pomodoroCount} sessions` : 'Start studying'}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-white/55">
                <span className="text-cyan-400">⚡</span>
                <span className="font-semibold text-white/85">{totalSessions} total sessions</span>
              </div>
            </div>
          </div>
          <div className="hidden shrink-0 select-none text-[72px] opacity-75 sm:block">🎯</div>
        </div>
      </GlassCard>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {metrics.map((m, i) => (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0, transition: { delay: i * 0.08 } }}
          >
            <GlassCard
              className={`p-5 ${m.nav && onNavigate ? 'cursor-pointer transition-colors hover:border-cyan-400/20' : ''}`}
              onClick={m.nav && onNavigate ? () => onNavigate(m.nav!) : undefined}
            >
              <div className="mb-3 flex items-start justify-between">
                <div
                  className="flex h-[38px] w-[38px] items-center justify-center rounded-[11px] text-[17px]"
                  style={{ background: `${m.color}18` }}
                >
                  {m.icon}
                </div>
              </div>
              <p className="text-[26px] font-extrabold leading-none text-white">{m.value}</p>
              <p className="mt-1 text-[13px] font-semibold text-white/80">{m.label}</p>
              <p className="mt-0.5 text-[11px] text-white/35">{m.sub}</p>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
        {/* Course progress */}
        <GlassCard className="p-[22px]">
          <p className="mb-0.5 text-[15px] font-bold text-white">Course Progress</p>
          <p className="mb-[18px] text-[11px] text-white/35">
            {totalCourses > 0 ? `Semester ${Math.max(...courses.map((c) => c.semester), 1)} · ${now.getFullYear()}` : 'No courses yet'}
          </p>
          {!loaded ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-8 animate-pulse rounded-lg bg-white/[0.05]" />
              ))}
            </div>
          ) : displayCourses.length === 0 ? (
            <p className="py-8 text-center text-sm text-white/30">
              Belum ada mata kuliah.{' '}
              {onNavigate && (
                <button onClick={() => onNavigate('tracker')} className="text-cyan-400 hover:underline">
                  Tambah sekarang →
                </button>
              )}
            </p>
          ) : (
            <div className="flex flex-col gap-3.5">
              {displayCourses.map((c, i) => {
                const color = COURSE_COLORS[i % COURSE_COLORS.length]
                const code = c.code_sks?.split(' ')[0] || c.course_name.slice(0, 6).toUpperCase()
                return (
                  <div key={c.id}>
                    <div className="mb-1.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="mono rounded-[5px] px-[7px] py-0.5 text-[10px]"
                          style={{ background: `${color}15`, color, border: `1px solid ${color}30` }}
                        >
                          {code}
                        </span>
                        <span className="truncate text-[13px] text-white/65">{c.course_name}</span>
                      </div>
                      <span className="text-[13px] font-bold" style={{ color }}>{c.progress}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${c.progress}%`,
                          background: `linear-gradient(90deg, ${color}88, ${color})`,
                          boxShadow: `0 0 10px ${color}50`,
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </GlassCard>

        {/* Task summary */}
        <GlassCard className="p-[22px]">
          <p className="mb-0.5 text-[15px] font-bold text-white">Task Summary</p>
          <p className="mb-4 text-[11px] text-white/35">Recent activity</p>
          {recentTasks.length === 0 ? (
            <p className="py-6 text-center text-sm text-white/30">
              Belum ada tugas.{' '}
              {onNavigate && (
                <button onClick={() => onNavigate('tasks')} className="text-cyan-400 hover:underline">
                  Buat tugas →
                </button>
              )}
            </p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {recentTasks.map((t, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between gap-2.5 ${i < recentTasks.length - 1 ? 'border-b border-white/[0.05] pb-2.5' : ''}`}
                >
                  <p className="flex-1 text-xs text-white/65">{t.title}</p>
                  <FokusBadge label={t.status.label} color={t.status.color} />
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              [String(todoCount), 'To Do', '#f59e0b'],
              [String(inProgressCount), 'In Progress', '#22d3ee'],
              [String(doneTasks), 'Done', '#34d399'],
            ].map(([n, l, c]) => (
              <div
                key={l as string}
                className="rounded-[11px] px-1.5 py-2.5 text-center"
                style={{ background: `${c}0d`, border: `1px solid ${c}20` }}
              >
                <p className="text-lg font-extrabold leading-none" style={{ color: c as string }}>{n}</p>
                <p className="mt-[3px] text-[10px] text-white/35">{l}</p>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  )
}
