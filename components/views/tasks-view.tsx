'use client'

import { useEffect, useState, useRef } from 'react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import type confetti from 'canvas-confetti'
import {
  Plus, Trash2, CheckCircle2, Circle, ListChecks, Flame,
  Briefcase, Home, Clock, CalendarClock, X,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card, CardContent,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { api, getCached, setCached, invalidateCache } from '@/lib/api'

type Task = {
  id: string
  title: string
  category: 'pekerjaan' | 'pribadi'
  priority: 'tinggi' | 'sedang' | 'rendah'
  done: boolean
  due_at: string | null
  created_at: string
}

const PRIORITY_CONFIG = {
  tinggi: { label: 'Tinggi', color: 'border-rose-500/40 text-rose-600 dark:text-rose-400', dot: 'bg-rose-500' },
  sedang: { label: 'Sedang', color: 'border-amber-500/40 text-amber-600 dark:text-amber-400', dot: 'bg-amber-500' },
  rendah: { label: 'Rendah', color: 'border-sky-500/40 text-sky-600 dark:text-sky-400', dot: 'bg-sky-500' },
} as const

const CATEGORY_CONFIG = {
  pekerjaan: { label: 'Pekerjaan', icon: Briefcase, color: 'text-primary bg-primary/10' },
  pribadi: { label: 'Pribadi', icon: Home, color: 'text-emerald-600 bg-emerald-500/10 dark:text-emerald-400' },
} as const

function celebrate(opts: confetti.Options = {}) {
  if (typeof window === 'undefined') return
  import('canvas-confetti').then(({ default: confetti }) => {
    const defaults = {
      spread: 70, startVelocity: 35, ticks: 200, gravity: 0.9,
      decay: 0.9, scalar: 0.9,
      colors: ['#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#14b8a6'],
    }
    const merged = { ...defaults, ...opts }
    confetti({ ...merged, particleCount: 60, origin: { x: 0.5, y: 0.7 } })
    setTimeout(() => {
      confetti({ ...merged, particleCount: 40, angle: 60, origin: { x: 0.1, y: 0.8 } })
      confetti({ ...merged, particleCount: 40, angle: 120, origin: { x: 0.9, y: 0.8 } })
    }, 150)
  })
}

function formatDue(iso: string | null): { text: string; urgent: boolean; overdue: boolean } {
  if (!iso) return { text: '', urgent: false, overdue: false }
  const due = new Date(iso)
  const now = new Date()
  const diffMs = due.getTime() - now.getTime()
  const diffMin = diffMs / 60000
  const diffHr = diffMin / 60
  const diffDay = diffHr / 24

  const overdue = diffMs < 0
  const urgent = !overdue && diffHr >= 0 && diffHr <= 3

  const timeStr = due.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  const dateStr = due.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })

  if (Math.abs(diffDay) < 1) {
    if (overdue) return { text: `Terlewat ${timeStr}`, urgent: false, overdue: true }
    return { text: `Hari ini ${timeStr}`, urgent, overdue: false }
  }
  if (diffDay >= 1 && diffDay < 2) return { text: `Besok ${timeStr}`, urgent, overdue: false }
  if (diffDay < -1 && diffDay > -2) return { text: 'Kemarin', urgent: false, overdue: true }
  return { text: `${dateStr} ${timeStr}`, urgent, overdue }
}

function toLocalInputValue(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const off = d.getTimezoneOffset()
  const local = new Date(d.getTime() - off * 60000)
  return local.toISOString().slice(0, 16)
}

function fromLocalInputValue(val: string): string | null {
  if (!val) return null
  return new Date(val).toISOString()
}

export default function TasksView() {
  const [tasks, setTasks] = useState<Task[]>(() => getCached('tasks') || [])
  const [loaded, setLoaded] = useState(!!getCached('tasks'))
  const [newTitle, setNewTitle] = useState('')
  const [newCategory, setNewCategory] = useState<Task['category']>('pekerjaan')
  const [newPriority, setNewPriority] = useState<Task['priority']>('sedang')
  const [newDueAt, setNewDueAt] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [filter, setFilter] = useState<'all' | 'active' | 'done'>('all')
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'pekerjaan' | 'pribadi'>('all')
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const tickingRef = useRef(0)

  useEffect(() => {
    loadTasks()
  }, [])

  useEffect(() => {
    const id = setInterval(() => {
      setTasks((prev) => {
        let changed = false
        const next = prev.map((t) => {
          if (!t.done && t.due_at) {
            const diff = new Date(t.due_at).getTime() - Date.now()
            if (diff <= 0 && diff > -60000) {
              changed = true
              const { text } = formatDue(t.due_at)
              toast.info(`Tugas jatuh tempo: ${t.title} (${text})`)
              return { ...t }
            }
          }
          return t
        })
        return changed ? next : prev
      })
      tickingRef.current += 1
      // Force re-render every 30s so due-time labels stay current
      if (tickingRef.current % 6 === 0) {
        setTasks((prev) => [...prev])
      }
    }, 10000)
    return () => clearInterval(id)
  }, [])

  const loadTasks = async (silent = false) => {
    if (!silent) {
      const cached = getCached('tasks')
      if (cached) { setTasks(cached); setLoaded(true) }
    }
    try {
      const d = await api('/tasks')
      setTasks(setCached('tasks', d.tasks))
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoaded(true)
    }
  }

  const addTask = async () => {
    if (!newTitle.trim()) return
    try {
      const d = await api('/tasks', {
        method: 'POST',
        body: JSON.stringify({
          title: newTitle.trim(),
          category: newCategory,
          priority: newPriority,
          due_at: fromLocalInputValue(newDueAt),
        }),
      })
      invalidateCache('tasks')
      await loadTasks(true)
      setNewTitle('')
      setNewCategory('pekerjaan')
      setNewPriority('sedang')
      setNewDueAt('')
      setShowAdd(false)
      toast.success('Tugas ditambahkan')
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const toggleTask = async (task: Task) => {
    const newDone = !task.done
    // Optimistic update
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, done: newDone } : t)))
    if (newDone) {
      celebrate()
      toast.success('Tugas selesai!')
    }
    try {
      await api(`/tasks/${task.id}`, {
        method: 'PUT',
        body: JSON.stringify({ done: newDone }),
      })
      invalidateCache('tasks')
    } catch (e: any) {
      // Revert on failure
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, done: !newDone } : t)))
      toast.error(e.message)
    }
  }

  const deleteTask = async (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id))
    try {
      await api(`/tasks/${id}`, { method: 'DELETE' })
      invalidateCache('tasks')
      toast.success('Tugas dihapus')
    } catch (e: any) {
      toast.error(e.message)
      await loadTasks(true)
    }
  }

  const updateTask = async (id: string, data: Record<string, any>) => {
    try {
      await api(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) })
      invalidateCache('tasks')
      await loadTasks(true)
      setEditingTask(null)
      toast.success('Tugas diperbarui')
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const clearDone = async () => {
    const doneTasks = tasks.filter((t) => t.done)
    setTasks((prev) => prev.filter((t) => !t.done))
    try {
      for (const t of doneTasks) {
        await api(`/tasks/${t.id}`, { method: 'DELETE' })
      }
      invalidateCache('tasks')
      if (doneTasks.length > 0) toast.success(`${doneTasks.length} tugas selesai dihapus`)
    } catch (e: any) {
      toast.error(e.message)
      await loadTasks(true)
    }
  }

  const filtered = tasks.filter((t) => {
    if (filter === 'active' && t.done) return false
    if (filter === 'done' && !t.done) return false
    if (categoryFilter !== 'all' && t.category !== categoryFilter) return false
    return true
  })

  const activeCount = tasks.filter((t) => !t.done).length
  const doneCount = tasks.filter((t) => t.done).length

  if (!loaded) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 rounded bg-muted animate-pulse" />
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-extrabold text-white">Tasks</h2>
          <p className="text-muted-foreground mt-1">
            Kelola tugas pekerjaan & pribadi dengan pengingat waktu.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1.5">
            <Flame className="h-3.5 w-3.5 text-amber-500" />
            {activeCount} aktif
          </Badge>
          <Badge variant="secondary" className="gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            {doneCount} selesai
          </Badge>
        </div>
      </div>

      {/* Add task button */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <Button onClick={() => setShowAdd(true)} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-1" /> Tambah Tugas
        </Button>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Tugas</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Judul tugas</Label>
              <Input
                autoFocus
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addTask()}
                placeholder="Contoh: Selesaikan laporan mingguan"
              />
            </div>
            <div className="space-y-2">
              <Label>Kategori</Label>
              <div className="grid grid-cols-2 gap-2">
                {(['pekerjaan', 'pribadi'] as const).map((c) => {
                  const cfg = CATEGORY_CONFIG[c]
                  const Icon = cfg.icon
                  const active = newCategory === c
                  return (
                    <button
                      key={c}
                      onClick={() => setNewCategory(c)}
                      className={`flex items-center gap-2 rounded-lg border p-3 text-sm font-medium transition-colors ${
                        active ? 'border-primary bg-primary/10 text-primary' : 'hover:border-primary/40'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {cfg.label}
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Prioritas</Label>
                <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
                  {(['tinggi', 'sedang', 'rendah'] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setNewPriority(p)}
                      className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-all ${
                        newPriority === p
                          ? 'bg-background text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {PRIORITY_CONFIG[p].label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Pengingat waktu</Label>
                <Input
                  type="datetime-local"
                  value={newDueAt}
                  onChange={(e) => setNewDueAt(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Batal</Button>
            <Button onClick={addTask}>Tambah</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Filters */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 rounded-lg bg-muted p-1 w-fit">
            {(['all', 'active', 'done'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-md px-4 py-1.5 text-sm font-medium transition-all ${
                  filter === f
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {f === 'all' ? 'Semua' : f === 'active' ? 'Aktif' : 'Selesai'}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 rounded-lg bg-muted p-1 w-fit">
            {(['all', 'pekerjaan', 'pribadi'] as const).map((c) => (
              <button
                key={c}
                onClick={() => setCategoryFilter(c)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
                  categoryFilter === c
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {c === 'all' ? 'Semua' : c === 'pekerjaan' ? 'Pekerjaan' : 'Pribadi'}
              </button>
            ))}
          </div>
        </div>
        {doneCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clearDone}>
            <Trash2 className="h-3.5 w-3.5 mr-1" /> Hapus yang selesai
          </Button>
        )}
      </div>

      {/* Task list */}
      {filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center space-y-3">
            <ListChecks className="h-10 w-10 mx-auto text-muted-foreground" />
            <div className="font-medium">
              {tasks.length === 0 ? 'Belum ada tugas' : 'Tidak ada tugas untuk filter ini'}
            </div>
            <p className="text-sm text-muted-foreground">
              {tasks.length === 0 ? 'Tambahkan tugas pertama kamu di atas.' : 'Coba ganti filter di atas.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {filtered.map((t, i) => {
              const pc = PRIORITY_CONFIG[t.priority]
              const cc = CATEGORY_CONFIG[t.category]
              const CatIcon = cc.icon
              const due = formatDue(t.due_at)
              return (
                <motion.div
                  key={t.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0, transition: { delay: i * 0.03 } }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <Card className={`p-4 ${t.done ? 'opacity-60' : ''}`}>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleTask(t)}
                        className="shrink-0 transition-transform hover:scale-110"
                      >
                        {t.done ? (
                          <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                        ) : (
                          <Circle className="h-6 w-6 text-muted-foreground" />
                        )}
                      </button>
                      <div className="min-w-0 flex-1 cursor-pointer" onClick={() => setEditingTask(t)}>
                        <div className={`text-sm font-medium ${t.done ? 'line-through' : ''}`}>
                          {t.title}
                        </div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium ${cc.color}`}>
                            <CatIcon className="h-3 w-3" />
                            {cc.label}
                          </span>
                          {t.due_at && (
                            <span className={`inline-flex items-center gap-1 text-[11px] ${
                              due.overdue
                                ? 'text-rose-600 dark:text-rose-400 font-medium'
                                : due.urgent
                                  ? 'text-amber-600 dark:text-amber-400 font-medium'
                                  : 'text-muted-foreground'
                            }`}>
                              <CalendarClock className="h-3 w-3" />
                              {due.text}
                            </span>
                          )}
                        </div>
                      </div>
                      <Badge variant="outline" className={`text-xs shrink-0 gap-1.5 ${pc.color}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${pc.dot}`} />
                        {pc.label}
                      </Badge>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-rose-500"
                        onClick={() => deleteTask(t.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Edit dialog */}
      <EditTaskDialog
        task={editingTask}
        onClose={() => setEditingTask(null)}
        onSave={updateTask}
      />
    </div>
  )
}

function EditTaskDialog({
  task,
  onClose,
  onSave,
}: {
  task: Task | null
  onClose: () => void
  onSave: (id: string, data: Record<string, any>) => void
}) {
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<Task['category']>('pekerjaan')
  const [priority, setPriority] = useState<Task['priority']>('sedang')
  const [dueAt, setDueAt] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (task) {
      setTitle(task.title)
      setCategory(task.category)
      setPriority(task.priority)
      setDueAt(toLocalInputValue(task.due_at))
    }
  }, [task])

  const submit = async () => {
    if (!title.trim() || !task) return
    setSaving(true)
    try {
      await onSave(task.id, {
        title: title.trim(),
        category,
        priority,
        due_at: fromLocalInputValue(dueAt),
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={!!task} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Tugas</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Judul tugas</Label>
            <Input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
            />
          </div>
          <div className="space-y-2">
            <Label>Kategori</Label>
            <div className="grid grid-cols-2 gap-2">
              {(['pekerjaan', 'pribadi'] as const).map((c) => {
                const cfg = CATEGORY_CONFIG[c]
                const Icon = cfg.icon
                const active = category === c
                return (
                  <button
                    key={c}
                    onClick={() => setCategory(c)}
                    className={`flex items-center gap-2 rounded-lg border p-3 text-sm font-medium transition-colors ${
                      active ? 'border-primary bg-primary/10 text-primary' : 'hover:border-primary/40'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {cfg.label}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Prioritas</Label>
              <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
                {(['tinggi', 'sedang', 'rendah'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPriority(p)}
                    className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-all ${
                      priority === p
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {PRIORITY_CONFIG[p].label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Pengingat waktu</Label>
              <div className="relative">
                <Input
                  type="datetime-local"
                  value={dueAt}
                  onChange={(e) => setDueAt(e.target.value)}
                />
                {dueAt && (
                  <button
                    onClick={() => setDueAt('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={submit} disabled={saving}>Simpan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
