'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft, ChevronRight, CalendarDays, BookOpen,
  ListChecks, Timer, LayoutGrid, List, Inbox, Plus, Clock,
  MapPin, Pencil, Trash2, Bell, Loader2, X,
} from 'lucide-react'

import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { api, getCached, setCached, invalidateCache } from '@/lib/api'

type Course = { id: string; course_name: string; semester: number }
type Session = {
  id: string
  course_id: string
  session_number: number
  session_date: string | null
  attendance_status: string
  task_status: string
  notes: string | null
}
type CalSession = Session & { course_name: string }
type Task = {
  id: string
  title: string
  category: 'pekerjaan' | 'pribadi'
  priority: 'tinggi' | 'sedang' | 'rendah'
  done: boolean
  due_at: string | null
  created_at: string
}
type PomodoroSession = {
  id: string
  mode: string
  duration_minutes: number
  completed_at: string
}

type Agenda = {
  id: string
  title: string
  description: string | null
  location: string | null
  agenda_date: string
  agenda_time: string | null
  reminder_minutes: number
  notified: boolean
}

type AgendaItem = {
  id: string
  type: 'lecture' | 'task' | 'pomodoro' | 'agenda'
  title: string
  subtitle: string
  time: string
  dateKey: string
  sortKey: number
  done?: boolean
  badge?: { text: string; className: string }
  icon: typeof BookOpen
  iconBg: string
  raw?: Agenda
}

const DAYS_SHORT = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
const DAYS_FULL = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

const REMINDER_OPTIONS = [
  { value: 0, label: 'Tepat waktu' },
  { value: 5, label: '5 menit sebelum' },
  { value: 10, label: '10 menit sebelum' },
  { value: 30, label: '30 menit sebelum' },
  { value: 60, label: '1 jam sebelum' },
  { value: 1440, label: '1 hari sebelum' },
]

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

const PRIORITY_BADGE: Record<Task['priority'], { text: string; className: string }> = {
  tinggi: { text: 'Tinggi', className: 'border-rose-500/40 text-rose-600 dark:text-rose-400' },
  sedang: { text: 'Sedang', className: 'border-amber-500/40 text-amber-600 dark:text-amber-400' },
  rendah: { text: 'Rendah', className: 'border-sky-500/40 text-sky-600 dark:text-sky-400' },
}

const ATTENDANCE_BADGE: Record<string, string> = {
  'Hadir': 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400',
  'Tidak Hadir': 'border-rose-500/40 text-rose-600 dark:text-rose-400',
  'Izin': 'border-amber-500/40 text-amber-600 dark:text-amber-400',
}

type ViewMode = 'month' | 'agenda'

const emptyForm = {
  title: '',
  description: '',
  location: '',
  agenda_date: '',
  agenda_time: '',
  reminder_minutes: 10,
}

export default function CalendarView() {
  const [sessions, setSessions] = useState<CalSession[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [pomodoros, setPomodoros] = useState<PomodoroSession[]>([])
  const [agendas, setAgendas] = useState<Agenda[]>([])
  const [loading, setLoading] = useState(true)
  const [current, setCurrent] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date())
  const [viewMode, setViewMode] = useState<ViewMode>('month')

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const cachedS = getCached('cal_sessions')
        const cachedT = getCached('tasks')
        const cachedP = getCached('pomodoro')
        const cachedA = getCached('cal_agendas')
        if (cachedS) setSessions(cachedS)
        if (cachedT) setTasks(cachedT)
        if (cachedP) setPomodoros(cachedP)
        if (cachedA) setAgendas(cachedA)

        const [lectureData, taskData, pomoData, agendaData] = await Promise.all([
          loadLectures(),
          api('/tasks').then((d) => d.tasks).catch(() => []),
          api('/pomodoro').then((d) => d.sessions).catch(() => []),
          api('/agendas').then((d) => d.agendas).catch(() => []),
        ])
        if (cancelled) return
        setSessions(setCached('cal_sessions', lectureData))
        setTasks(setCached('tasks', taskData))
        setPomodoros(setCached('pomodoro', pomoData))
        setAgendas(setCached('cal_agendas', agendaData))
      } catch (e: any) {
        toast.error(e.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const loadLectures = async (): Promise<CalSession[]> => {
    const all: CalSession[] = []
    for (let s = 1; s <= 9; s++) {
      const d = await api(`/courses?semester=${s}`)
      if (d.courses?.length) {
        for (const c of d.courses as Course[]) {
          const sd = await api(`/courses/${c.id}/sessions`)
          if (sd.sessions?.length) {
            for (const sess of sd.sessions as Session[]) {
              if (sess.session_date) {
                all.push({ ...sess, course_name: c.course_name })
              }
            }
          }
        }
      }
    }
    return all
  }

  const openAdd = (date?: Date) => {
    setEditingId(null)
    setForm({
      ...emptyForm,
      agenda_date: date ? dateKey(date) : dateKey(selectedDate),
    })
    setDialogOpen(true)
  }

  const openEdit = (agenda: Agenda) => {
    setEditingId(agenda.id)
    setForm({
      title: agenda.title,
      description: agenda.description || '',
      location: agenda.location || '',
      agenda_date: agenda.agenda_date,
      agenda_time: agenda.agenda_time || '',
      reminder_minutes: agenda.reminder_minutes,
    })
    setDialogOpen(true)
  }

  const saveAgenda = async () => {
    if (!form.title.trim()) {
      toast.error('Judul agenda wajib diisi')
      return
    }
    if (!form.agenda_date) {
      toast.error('Tanggal agenda wajib diisi')
      return
    }
    setSaving(true)
    try {
      if (editingId) {
        const data = await api(`/agendas/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(form),
        })
        setAgendas((prev) => prev.map((a) => a.id === editingId ? data.agenda : a))
        toast.success('Agenda diperbarui!')
      } else {
        const data = await api('/agendas', {
          method: 'POST',
          body: JSON.stringify(form),
        })
        setAgendas((prev) => [...prev, data.agenda])
        toast.success('Agenda ditambahkan!')
      }
      invalidateCache('cal_agendas')
      setDialogOpen(false)
      setForm(emptyForm)
      setEditingId(null)
    } catch (e: any) {
      toast.error(e.message || 'Gagal menyimpan agenda')
    } finally {
      setSaving(false)
    }
  }

  const deleteAgenda = async (id: string) => {
    try {
      await api(`/agendas/${id}`, { method: 'DELETE' })
      setAgendas((prev) => prev.filter((a) => a.id !== id))
      invalidateCache('cal_agendas')
      toast.success('Agenda dihapus')
    } catch (e: any) {
      toast.error(e.message || 'Gagal menghapus agenda')
    }
  }

  // Build unified agenda items
  const agendaItems = useMemo(() => {
    const items: AgendaItem[] = []

    for (const s of sessions) {
      if (!s.session_date) continue
      const d = new Date(s.session_date + 'T00:00:00')
      items.push({
        id: `lecture-${s.id}`,
        type: 'lecture',
        title: s.course_name,
        subtitle: `Sesi ${s.session_number}`,
        time: '',
        dateKey: dateKey(d),
        sortKey: d.getTime(),
        icon: BookOpen,
        iconBg: 'bg-primary/10 text-primary',
        badge: s.attendance_status !== 'Belum' ? {
          text: s.attendance_status,
          className: ATTENDANCE_BADGE[s.attendance_status] || '',
        } : undefined,
      })
    }

    for (const t of tasks) {
      if (!t.due_at) continue
      const d = new Date(t.due_at)
      items.push({
        id: `task-${t.id}`,
        type: 'task',
        title: t.title,
        subtitle: t.category === 'pekerjaan' ? 'Tugas Pekerjaan' : 'Tugas Pribadi',
        time: d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        dateKey: dateKey(d),
        sortKey: d.getTime(),
        done: t.done,
        icon: ListChecks,
        iconBg: t.category === 'pekerjaan'
          ? 'bg-primary/10 text-primary'
          : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
        badge: { text: PRIORITY_BADGE[t.priority].text, className: PRIORITY_BADGE[t.priority].className },
      })
    }

    for (const p of pomodoros) {
      const d = new Date(p.completed_at)
      items.push({
        id: `pomodoro-${p.id}`,
        type: 'pomodoro',
        title: p.mode === 'focus' ? 'Sesi Fokus' : p.mode === 'short_break' ? 'Jeda Pendek' : 'Jeda Panjang',
        subtitle: `${p.duration_minutes} menit`,
        time: d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        dateKey: dateKey(d),
        sortKey: d.getTime(),
        icon: Timer,
        iconBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
      })
    }

    for (const a of agendas) {
      const d = new Date(a.agenda_date + 'T00:00:00')
      const sortTime = a.agenda_time
        ? new Date(`${a.agenda_date}T${a.agenda_time}`).getTime()
        : d.getTime()
      items.push({
        id: `agenda-${a.id}`,
        type: 'agenda',
        title: a.title,
        subtitle: a.location || 'Agenda',
        time: a.agenda_time || '',
        dateKey: dateKey(d),
        sortKey: sortTime,
        icon: Bell,
        iconBg: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
        raw: a,
      })
    }

    return items
  }, [sessions, tasks, pomodoros, agendas])

  // Group by date
  const itemsByDate = useMemo(() => {
    const map = new Map<string, AgendaItem[]>()
    for (const item of agendaItems) {
      if (!map.has(item.dateKey)) map.set(item.dateKey, [])
      map.get(item.dateKey)!.push(item)
    }
    map.forEach((list) => list.sort((a, b) => a.sortKey - b.sortKey))
    return map
  }, [agendaItems])

  const year = current.getFullYear()
  const month = current.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startWeekday = firstDay.getDay()
  const daysInMonth = lastDay.getDate()

  const today = new Date()

  const cells: (Date | null)[] = []
  for (let i = 0; i < startWeekday; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d))
  while (cells.length % 7 !== 0) cells.push(null)

  const prevMonth = () => setCurrent(new Date(year, month - 1, 1))
  const nextMonth = () => setCurrent(new Date(year, month + 1, 1))
  const goToday = () => { setCurrent(new Date()); setSelectedDate(today) }

  const selectedKey = dateKey(selectedDate)
  const selectedItems = itemsByDate.get(selectedKey) || []

  // Agenda view: upcoming items sorted by date
  const upcomingItems = useMemo(() => {
    const now = new Date()
    const todayKey = dateKey(now)
    return agendaItems
      .filter((item) => item.dateKey >= todayKey)
      .sort((a, b) => a.sortKey - b.sortKey)
  }, [agendaItems])

  // Group upcoming by date
  const upcomingByDate = useMemo(() => {
    const map = new Map<string, AgendaItem[]>()
    for (const item of upcomingItems) {
      if (!map.has(item.dateKey)) map.set(item.dateKey, [])
      map.get(item.dateKey)!.push(item)
    }
    return Array.from(map.entries()).slice(0, 14)
  }, [upcomingItems])

  const monthItemCount = useMemo(() => {
    let count = 0
    for (let d = 1; d <= daysInMonth; d++) {
      const key = dateKey(new Date(year, month, d))
      count += (itemsByDate.get(key) || []).length
    }
    return count
  }, [itemsByDate, year, month, daysInMonth])

  const update = (field: keyof typeof form, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-extrabold text-white">Calendar</h2>
          <p className="text-muted-foreground mt-1">
            Agenda harian dan bulanan — sesi kuliah, tugas, Pomodoro, dan agenda kustom.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => openAdd()} size="sm">
            <Plus className="h-4 w-4 mr-1.5" />
            Tambah Agenda
          </Button>
          {/* View toggle */}
          <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
            {(['month', 'agenda'] as const).map((v) => {
              const Icon = v === 'month' ? LayoutGrid : List
              const active = viewMode === v
              return (
                <button
                  key={v}
                  onClick={() => setViewMode(v)}
                  className={`relative flex items-center gap-2 rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                    active ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {active && (
                    <motion.div
                      layoutId="cal-view-tab"
                      className="absolute inset-0 rounded-md bg-primary"
                      transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                    />
                  )}
                  <Icon className="h-4 w-4 relative" />
                  <span className="relative">{v === 'month' ? 'Bulanan' : 'Agenda'}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {viewMode === 'month' ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          {/* Calendar grid */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl">{MONTHS[month]} {year}</CardTitle>
                  <CardDescription>
                    {loading ? 'Memuat...' : `${monthItemCount} agenda bulan ini`}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={goToday}>Hari ini</Button>
                  <Button variant="ghost" size="icon" onClick={prevMonth}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={nextMonth}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-80 animate-pulse bg-muted rounded-lg" />
              ) : (
                <>
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {DAYS_SHORT.map((d) => (
                      <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">
                        {d}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {cells.map((d, i) => {
                      if (!d) return <div key={i} className="aspect-square" />
                      const key = dateKey(d)
                      const dayItems = itemsByDate.get(key) || []
                      const isToday = isSameDay(d, today)
                      const isSelected = selectedDate && isSameDay(d, selectedDate)
                      return (
                        <motion.button
                          key={i}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setSelectedDate(d)}
                          className={`aspect-square rounded-lg border text-sm transition-colors flex flex-col items-center justify-center gap-0.5 ${
                            isSelected
                              ? 'border-primary bg-primary/10'
                              : isToday
                              ? 'border-primary/50 bg-primary/5'
                              : dayItems.length > 0
                              ? 'border-primary/20 hover:border-primary/40'
                              : 'border-transparent hover:bg-muted/50'
                          }`}
                        >
                          <span className={`text-sm ${isToday ? 'font-bold text-primary' : ''}`}>
                            {d.getDate()}
                          </span>
                          {dayItems.length > 0 && (
                            <div className="flex items-center gap-0.5">
                              {dayItems.slice(0, 4).map((item, idx) => (
                                <span
                                  key={idx}
                                  className={`h-1.5 w-1.5 rounded-full ${
                                    item.type === 'lecture'
                                      ? 'bg-primary'
                                      : item.type === 'task'
                                      ? item.done ? 'bg-muted-foreground/40' : 'bg-emerald-500'
                                      : item.type === 'agenda'
                                      ? 'bg-violet-500'
                                      : 'bg-amber-500'
                                  }`}
                                />
                              ))}
                              {dayItems.length > 4 && (
                                <span className="text-[9px] text-muted-foreground">+</span>
                              )}
                            </div>
                          )}
                        </motion.button>
                      )
                    })}
                  </div>

                  {/* Legend */}
                  <div className="mt-4 flex items-center gap-4 flex-wrap text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-primary" /> Sesi Kuliah
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" /> Tugas
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-violet-500" /> Agenda
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-amber-500" /> Pomodoro
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Selected day agenda */}
          <Card className="lg:sticky lg:top-20 h-fit">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CalendarDays className="h-5 w-5 text-primary" />
                    {selectedDate ? (
                      `${selectedDate.getDate()} ${MONTHS[selectedDate.getMonth()].slice(0, 3)} ${selectedDate.getFullYear()}`
                    ) : 'Pilih Tanggal'}
                  </CardTitle>
                  <CardDescription>
                    {selectedItems.length > 0
                      ? `${selectedItems.length} agenda pada tanggal ini`
                      : 'Tidak ada agenda'}
                  </CardDescription>
                </div>
                <Button variant="ghost" size="icon" onClick={() => openAdd(selectedDate)} aria-label="Tambah agenda">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {selectedItems.length === 0 ? (
                <div className="py-8 text-center space-y-2">
                  <Inbox className="h-8 w-8 mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Tidak ada agenda pada tanggal ini.
                  </p>
                  <Button variant="outline" size="sm" onClick={() => openAdd(selectedDate)}>
                    <Plus className="h-4 w-4 mr-1.5" />
                    Tambah Agenda
                  </Button>
                </div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto scrollbar-thin">
                  <AnimatePresence>
                    {selectedItems.map((item, i) => {
                      const Icon = item.icon
                      return (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0, transition: { delay: i * 0.05 } }}
                          className="rounded-lg border p-3 group"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${item.iconBg}`}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className={`text-sm font-medium truncate ${item.done ? 'line-through text-muted-foreground' : ''}`}>
                                {item.title}
                              </div>
                              <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                                {item.time && <span className="flex items-center gap-0.5"><Clock className="h-3 w-3" />{item.time}</span>}
                                <span>{item.subtitle}</span>
                              </div>
                            </div>
                            {item.badge && (
                              <Badge variant="outline" className={`text-xs shrink-0 ${item.badge.className}`}>
                                {item.badge.text}
                              </Badge>
                            )}
                            {item.type === 'agenda' && item.raw && (
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => openEdit(item.raw!)}
                                  className="rounded p-1 hover:bg-muted"
                                  aria-label="Edit agenda"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => deleteAgenda(item.raw!.id)}
                                  className="rounded p-1 hover:bg-destructive/10 text-destructive"
                                  aria-label="Hapus agenda"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )
                    })}
                  </AnimatePresence>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        /* Agenda view — upcoming items grouped by date */
        <Card>
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <List className="h-5 w-5 text-primary" />
              Agenda Mendatang
            </CardTitle>
            <CardDescription>
              {upcomingItems.length > 0
                ? `${upcomingItems.length} agenda akan datang`
                : 'Belum ada agenda terjadwal'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
                ))}
              </div>
            ) : upcomingByDate.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <Inbox className="h-10 w-10 mx-auto text-muted-foreground" />
                <div className="font-medium">Tidak ada agenda mendatang</div>
                <p className="text-sm text-muted-foreground">
                  Tambahkan agenda baru untuk melihatnya di sini.
                </p>
                <Button variant="outline" size="sm" onClick={() => openAdd()}>
                  <Plus className="h-4 w-4 mr-1.5" />
                  Tambah Agenda
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {upcomingByDate.map(([key, items]) => {
                  const d = parseDateKey(key)
                  const isToday = isSameDay(d, today)
                  const isTomorrow = isSameDay(d, new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1))
                  const label = isToday
                    ? 'Hari Ini'
                    : isTomorrow
                    ? 'Besok'
                    : `${DAYS_FULL[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`
                  return (
                    <div key={key}>
                      <div className="flex items-center gap-2 mb-3">
                        <h4 className={`text-sm font-semibold ${isToday ? 'text-primary' : ''}`}>
                          {label}
                        </h4>
                        <Badge variant="secondary" className="text-xs">{items.length}</Badge>
                        <div className="h-px flex-1 bg-border" />
                      </div>
                      <div className="space-y-2">
                        <AnimatePresence>
                          {items.map((item, i) => {
                            const Icon = item.icon
                            return (
                              <motion.div
                                key={item.id}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0, transition: { delay: i * 0.04 } }}
                                className="rounded-lg border p-3 group"
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${item.iconBg}`}>
                                    <Icon className="h-4 w-4" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className={`text-sm font-medium truncate ${item.done ? 'line-through text-muted-foreground' : ''}`}>
                                      {item.title}
                                    </div>
                                    <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                                      {item.time && <span className="flex items-center gap-0.5"><Clock className="h-3 w-3" />{item.time}</span>}
                                      <span>{item.subtitle}</span>
                                    </div>
                                  </div>
                                  {item.badge && (
                                    <Badge variant="outline" className={`text-xs shrink-0 ${item.badge.className}`}>
                                      {item.badge.text}
                                    </Badge>
                                  )}
                                  {item.type === 'agenda' && item.raw && (
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button
                                        onClick={() => openEdit(item.raw!)}
                                        className="rounded p-1 hover:bg-muted"
                                        aria-label="Edit agenda"
                                      >
                                        <Pencil className="h-3.5 w-3.5" />
                                      </button>
                                      <button
                                        onClick={() => deleteAgenda(item.raw!.id)}
                                        className="rounded p-1 hover:bg-destructive/10 text-destructive"
                                        aria-label="Hapus agenda"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            )
                          })}
                        </AnimatePresence>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Agenda Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Edit Agenda' : 'Tambah Agenda Baru'}
            </DialogTitle>
            <DialogDescription>
              Catat kegiatan atau agenda penting dengan pengingat otomatis.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Judul Agenda</Label>
              <Input
                value={form.title}
                onChange={(e) => update('title', e.target.value)}
                placeholder="contoh: Ujian Tengah Semester"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium flex items-center gap-1.5">
                  <CalendarDays className="h-4 w-4" /> Tanggal
                </Label>
                <Input
                  type="date"
                  value={form.agenda_date}
                  onChange={(e) => update('agenda_date', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium flex items-center gap-1.5">
                  <Clock className="h-4 w-4" /> Waktu
                </Label>
                <Input
                  type="time"
                  value={form.agenda_time}
                  onChange={(e) => update('agenda_time', e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                <MapPin className="h-4 w-4" /> Lokasi (opsional)
              </Label>
              <Input
                value={form.location}
                onChange={(e) => update('location', e.target.value)}
                placeholder="contoh: Ruang 301, Gedung A"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                <Bell className="h-4 w-4" /> Pengingat
              </Label>
              <Select
                value={String(form.reminder_minutes)}
                onValueChange={(v) => update('reminder_minutes', Number(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REMINDER_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={String(opt.value)}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Catatan (opsional)</Label>
              <Textarea
                value={form.description}
                onChange={(e) => update('description', e.target.value)}
                placeholder="Detail tambahan..."
                className="min-h-[60px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={saveAgenda} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingId ? 'Simpan Perubahan' : 'Tambah Agenda'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
