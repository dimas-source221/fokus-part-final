'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import type confetti from 'canvas-confetti'
import {
  Plus, Trash2, CheckCircle2, GraduationCap, Pencil, Loader2,
  BookOpen, ChevronRight, CalendarDays, ListChecks,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog'

import { api, getCached, setCached, invalidateCache } from '@/lib/api'

const SEMESTERS = Array.from({ length: 20 }, (_, i) => i + 1)
const DISCUSSION_OPTIONS = ['Belum Diskusikan', 'Sudah Diskusikan', 'Tanpa Diskusi']
const TASK_OPTIONS = ['Belum Mulai', 'Sedang Dikerjakan', 'Selesai', 'Tanpa Tugas']
const ATTENDANCE_OPTIONS = ['Belum', 'Hadir', 'Tidak Hadir', 'Izin']

function celebrate(opts: confetti.Options = {}) {
  if (typeof window === 'undefined') return
  import('canvas-confetti').then(({ default: confetti }) => {
    const defaults = {
      spread: 70, startVelocity: 35, ticks: 200, gravity: 0.9,
      decay: 0.9, scalar: 0.9,
      colors: ['#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#14b8a6'],
    }
    const merged = { ...defaults, ...opts }
    confetti({ ...merged, particleCount: 60, origin: { x: 0.5, y: 0.85 } })
    setTimeout(() => {
      confetti({ ...merged, particleCount: 40, angle: 60, origin: { x: 0.15, y: 0.9 } })
      confetti({ ...merged, particleCount: 40, angle: 120, origin: { x: 0.85, y: 0.9 } })
    }, 150)
  })
}

const statusColor = (kind: string, val: string) => {
  if (kind === 'discussion') {
    if (val === 'Sudah Diskusikan' || val === 'Tanpa Diskusi') return 'bg-emerald-500'
    return 'bg-amber-500'
  }
  if (kind === 'task') {
    if (val === 'Selesai' || val === 'Tanpa Tugas') return 'bg-emerald-500'
    if (val === 'Sedang Dikerjakan') return 'bg-amber-500'
    return 'bg-rose-500'
  }
  if (kind === 'attendance') {
    if (val === 'Hadir') return 'bg-emerald-500'
    if (val === 'Izin') return 'bg-amber-500'
    if (val === 'Tidak Hadir') return 'bg-rose-500'
    return 'bg-slate-400'
  }
  return 'bg-slate-400'
}

type Session = {
  id: string
  course_id: string
  session_number: number
  session_date: string | null
  attendance_status: string
  discussion_status: string
  task_status: string
  notes: string | null
}

type Course = {
  id: string
  course_name: string
  semester: number
  code_sks: string | null
  sks: number | null
  session_count: number
  notes: string | null
  progress: number
}

export default function TrackerView() {
  const [semester, setSemester] = useState(1)
  const [courses, setCourses] = useState<Course[]>(() => getCached('courses:1') || [])
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null)
  const [loading, setLoading] = useState(!getCached('courses:1'))
  const [showAdd, setShowAdd] = useState(false)
  const [editingCourse, setEditingCourse] = useState<Course | null>(null)

  const [newCourseName, setNewCourseName] = useState('')
  const [newCourseCode, setNewCourseCode] = useState('')
  const [newCourseSks, setNewCourseSks] = useState<string>('')
  const [templateCount, setTemplateCount] = useState(8)

  const loadCourses = async (silent = false) => {
    if (!silent) {
      const cached = getCached(`courses:${semester}`)
      if (cached) { setCourses(cached); setLoading(false) } else { setLoading(true) }
    }
    try {
      const d = await api(`/courses?semester=${semester}`)
      const list: Course[] = d.courses
      setCourses(setCached(`courses:${semester}`, list))
      if (list.length > 0 && !list.find((c) => c.id === selectedCourseId)) {
        setSelectedCourseId(list[0].id)
      } else if (list.length === 0) {
        setSelectedCourseId(null)
      }
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadCourses() }, [semester])

  const addCourse = async () => {
    if (!newCourseName.trim()) return
    try {
      const d = await api('/courses', {
        method: 'POST',
        body: JSON.stringify({
          course_name: newCourseName.trim(),
          
          sks: Number(newCourseSks) || 0,
          semester,
          session_count: templateCount,
        }),
      })
      setNewCourseName('')
      setNewCourseCode('')
      setNewCourseSks('')
      setTemplateCount(8)
      setShowAdd(false)
      toast.success(`Mata kuliah + ${templateCount} sesi otomatis dibuat`)
      invalidateCache('courses:')
      await loadCourses(true)
      setSelectedCourseId(d.course.id)
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const updateCourse = async (courseId: string, updatedData: any) => {
    try {
      await api(`/courses/${courseId}`, {
        method: 'PUT',
        body: JSON.stringify(updatedData),
      })
      toast.success('Data mata kuliah berhasil diperbarui!')
      invalidateCache('courses:')
      await loadCourses(true)
      setEditingCourse(null)
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const deleteCourse = async (id: string) => {
    if (typeof window !== 'undefined' && !window.confirm('Hapus mata kuliah ini beserta semua sesinya?')) return
    try {
      await api(`/courses/${id}`, { method: 'DELETE' })
      toast.success('Mata kuliah dihapus')
      invalidateCache('courses:')
      invalidateCache('sessions:')
      await loadCourses(true)
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const selectedCourse = courses.find((c) => c.id === selectedCourseId)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-white">Course Tracker</h2>
          <p className="mt-0.5 text-xs text-white/38">
            Lacak absensi, forum diskusi, & tugas per sesi.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={String(semester)} onValueChange={(v) => setSemester(parseInt(v))}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              {SEMESTERS.map((s) => (
                <SelectItem key={s} value={String(s)}>Semester {s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Dialog open={showAdd} onOpenChange={setShowAdd}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-1" /> Mata Kuliah</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Tambah Mata Kuliah — Semester {semester}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label>Nama mata kuliah</Label>
                  <Input
                    autoFocus
                    value={newCourseName}
                    onChange={(e) => setNewCourseName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addCourse()}
                    placeholder="Contoh: Kalkulus Lanjut"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Kode Mata Kuliah</Label>
                    <Input
                      value={newCourseCode}
                      onChange={(e) => setNewCourseCode(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addCourse()}
                      placeholder="Contoh: IF101"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>SKS</Label>
                    <Input
                      type="number"
                      min={1}
                      max={12}
                      value={newCourseSks}
                      onChange={(e) => setNewCourseSks(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addCourse()}
                      placeholder="Contoh: 3"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Templat Perkuliahan</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { n: 8, label: 'Reguler', desc: '8 sesi' },
                      { n: 14, label: 'Standar', desc: '14 sesi' },
                      { n: 16, label: 'Penuh', desc: '16 sesi' },
                    ].map((t) => {
                      const active = templateCount === t.n
                      return (
                        <motion.button
                          key={t.n}
                          type="button"
                          whileTap={{ scale: 0.96 }}
                          onClick={() => setTemplateCount(t.n)}
                          className={`p-3 rounded-lg border text-left transition-colors ${
                            active ? 'border-primary bg-primary/10' : 'hover:border-primary/40'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="font-semibold text-sm">{t.label}</div>
                            {active && <CheckCircle2 className="h-4 w-4 text-primary" />}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">{t.desc}</div>
                        </motion.button>
                      )
                    })}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAdd(false)}>Batal</Button>
                <Button onClick={addCourse}>Buat + {templateCount} Sesi</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
          <div className="h-64 rounded-lg bg-muted animate-pulse" />
        </div>
      ) : courses.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center space-y-3">
            <GraduationCap className="h-10 w-10 mx-auto text-muted-foreground" />
            <div className="font-medium">Belum ada mata kuliah di semester {semester}</div>
            <Button onClick={() => setShowAdd(true)}>
              <Plus className="h-4 w-4 mr-1" /> Tambah Mata Kuliah
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <motion.div
            className="space-y-2"
            initial="initial"
            animate="animate"
            variants={{ animate: { transition: { staggerChildren: 0.04 } } }}
          >
            {courses.map((c) => {
              const active = c.id === selectedCourseId
              return (
                <div key={c.id} className="relative group">
                  <motion.button
                    variants={{
                      initial: { opacity: 0, y: 10 },
                      animate: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
                    }}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedCourseId(c.id)}
                    className={`w-full text-left p-4 rounded-lg border transition-colors ${
                      active ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 pr-6">
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold truncate">{c.course_name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5 flex-wrap">
                          {c.code_sks && <span className="font-mono">{c.code_sks}</span>}
                          {c.sks != null && (
                            <span className="inline-flex items-center rounded bg-primary/10 px-1 py-0.5 text-[10px] font-medium text-primary">
                              {c.sks} SKS
                            </span>
                          )}
                          <span>· {c.session_count} sesi</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <Progress value={c.progress} className="h-1.5 flex-1" />
                      <span className="text-xs font-medium tabular-nums w-9 text-right">
                        {c.progress}%
                      </span>
                    </div>
                  </motion.button>

                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Edit Mata Kuliah"
                    onClick={(e) => { e.stopPropagation(); setEditingCourse(c) }}
                  >
                    <Pencil className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
                  </Button>
                </div>
              )
            })}
          </motion.div>

          <AnimatePresence mode="wait">
            {selectedCourse && (
              <motion.div
                key={selectedCourse.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } }}
                exit={{ opacity: 0, y: -6, transition: { duration: 0.15 } }}
              >
                <CourseDetail
                  course={selectedCourse}
                  onEdit={() => setEditingCourse(selectedCourse)}
                  onDelete={() => deleteCourse(selectedCourse.id)}
                  onDirty={() => loadCourses(true)}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Semester progress summary */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0, transition: { delay: 0.2 } }}
      >
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground">
              Ringkasan Semester {semester}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <div className="text-3xl font-bold tabular-nums">{courses.length}</div>
                <div className="text-xs text-muted-foreground mt-0.5">Mata Kuliah</div>
              </div>
              <div>
                <div className="text-3xl font-bold tabular-nums">
                  {courses.reduce((sum, c) => sum + (c.sks || 0), 0)}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">Total SKS</div>
              </div>
              <div>
                <div className="text-3xl font-bold tabular-nums">
                  {courses.length > 0
                    ? Math.round(courses.reduce((s, c) => s + c.progress, 0) / courses.length)
                    : 0}
                  %
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">Rata-rata Progres</div>
              </div>
            </div>
            {courses.length > 0 && (
              <div className="mt-4">
                <Progress
                  value={courses.length > 0
                    ? Math.round(courses.reduce((s, c) => s + c.progress, 0) / courses.length)
                    : 0}
                  className="h-2"
                />
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <EditCourseDialog
        open={!!editingCourse}
        course={editingCourse}
        onClose={() => setEditingCourse(null)}
        onSave={updateCourse}
      />
    </div>
  )
}

function CourseDetail({
  course, onEdit, onDelete, onDirty,
}: {
  course: Course
  onEdit: () => void
  onDelete: () => void
  onDirty: () => void
}) {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loadingSessions, setLoadingSessions] = useState(true)
  const [expanded, setExpanded] = useState<number | null>(null)
  const [editingSession, setEditingSession] = useState<Session | null>(null)

  const loadSessions = async () => {
    const cacheKey = `sessions:${course.id}`
    const cached = getCached(cacheKey)
    if (cached) {
      setSessions(cached)
      setLoadingSessions(false)
    } else {
      setLoadingSessions(true)
    }
    try {
      const d = await api(`/courses/${course.id}/sessions`)
      const list: Session[] = d.sessions.map((s: Session) => ({
        ...s,
        task_status: s.task_status === 'Tanpa Tugas' ? 'Belum Mulai' : s.task_status
      }))
      setSessions(setCached(cacheKey, list))
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoadingSessions(false)
    }
  }

  useEffect(() => { loadSessions() }, [course.id])

  const updateSession = async (sessionId: string, data: Partial<Session>) => {
    try {
      const d = await api(`/sessions/${sessionId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      })
      const updated: Session = d.session
      const next = sessions.map((s) => (s.id === sessionId ? updated : s))
      setSessions(setCached(`sessions:${course.id}`, next))
      invalidateCache('courses:')
      onDirty()

      const wasCompleted = sessions.find((s) => s.id === sessionId)?.task_status === 'Selesai'
      if (data.task_status === 'Selesai' && !wasCompleted) {
        celebrate()
        toast.success(`Sesi ${updated.session_number} selesai! 🎉`, {
          description: 'Tugas untuk sesi ini telah diselesaikan.',
        })
      }
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const completed = sessions.filter((s) => {
    const absenSelesai = s.attendance_status !== 'Belum';
    const diskusiSelesai = s.discussion_status === 'Sudah Diskusikan' || s.discussion_status === 'Tanpa Diskusi';
    const tugasSelesai = s.task_status === 'Selesai' || s.task_status === 'Tanpa Tugas';
    return absenSelesai && diskusiSelesai && tugasSelesai;
  }).length;

  const progressPercentage = sessions.length === 0 ? 0 : Math.round((completed / sessions.length) * 100);
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <CardTitle className="text-xl flex items-center gap-2 flex-wrap">
              {course.course_name}
              {course.code_sks && (
                <Badge variant="outline" className="text-xs font-mono">{course.code_sks}</Badge>
              )}
              {course.sks != null && (
                <Badge className="text-xs bg-primary/10 text-primary border border-primary/20">
                  {course.sks} SKS
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Semester {course.semester} · {course.session_count} sesi
            </CardDescription>
            {course.notes && (
              <p className="text-xs text-muted-foreground mt-2 italic bg-muted/40 p-2 rounded">
                {course.notes}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button size="sm" variant="outline" onClick={onEdit}>
              <Pencil className="h-4 w-4 mr-1" /> Edit
            </Button>
            <Button size="sm" variant="outline" onClick={onDelete}>
              <Trash2 className="h-4 w-4 text-rose-500" />
            </Button>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
  <Progress value={progressPercentage} className="h-2 flex-1" />
  <span className="text-sm font-semibold tabular-nums">
    {progressPercentage}% ({completed}/{sessions.length} sesi)
  </span>
</div>
      </CardHeader>

      <CardContent>
        {loadingSessions ? (
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.map((s, i) => {
              const isOpen = expanded === s.session_number
              return (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0, transition: { delay: i * 0.03 } }}
                  className="rounded-lg border overflow-hidden"
                >
                  <button
                    onClick={() => setExpanded(isOpen ? null : s.session_number)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-muted/40 transition-colors text-left"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-sm">
                      {s.session_number}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium">Sesi {s.session_number}</div>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className={`inline-flex items-center gap-1 text-[11px] text-muted-foreground`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${statusColor('attendance', s.attendance_status)}`} />
                          {s.attendance_status}
                        </span>
                        <span className={`inline-flex items-center gap-1 text-[11px] text-muted-foreground`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${statusColor('discussion', s.discussion_status)}`} />
                          {s.discussion_status}
                        </span>
                        <span className={`inline-flex items-center gap-1 text-[11px] text-muted-foreground`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${statusColor('task', s.task_status)}`} />
                          {s.task_status}
                        </span>
                      </div>
                    </div>
                    <ChevronRight
                      className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-90' : ''}`}
                    />
                  </button>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="border-t p-4 space-y-4 bg-muted/20">
                          <div className="grid gap-3 sm:grid-cols-3">
                            <StatusSelect
                              label="Absensi"
                              value={s.attendance_status}
                              options={ATTENDANCE_OPTIONS}
                              onChange={(v) => updateSession(s.id, { attendance_status: v })}
                              kind="attendance"
                            />
                            <StatusSelect
                              label="Diskusi"
                              value={s.discussion_status}
                              options={DISCUSSION_OPTIONS}
                              onChange={(v) => updateSession(s.id, { discussion_status: v })}
                              kind="discussion"
                            />
                            <StatusSelect
  label="Tugas"
  value={s.task_status || 'Belum Mulai'}
  options={TASK_OPTIONS}
  onChange={(v) => updateSession(s.id, { task_status: v })}
  kind="task"

                            />
                          </div>

                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-1.5">
                              <Label className="text-xs flex items-center gap-1.5">
                                <CalendarDays className="h-3.5 w-3.5" /> Tanggal
                              </Label>
                              <Input
                                type="date"
                                value={s.session_date || ''}
                                onChange={(e) => updateSession(s.id, { session_date: e.target.value })}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs flex items-center gap-1.5">
                                <ListChecks className="h-3.5 w-3.5" /> Catatan Sesi
                              </Label>
                              <Input
                                value={s.notes || ''}
                                placeholder="Topik, link Zoom, dll."
                                onChange={(e) => updateSession(s.id, { notes: e.target.value })}
                              />
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function StatusSelect({
  label, value, options, onChange, kind,
}: {
  label: string
  value: string
  options: string[]
  onChange: (v: string) => void
  kind: string
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs flex items-center gap-1.5">
        <span className={`h-1.5 w-1.5 rounded-full ${statusColor(kind, value)}`} />
        {label}
      </Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o} value={o}>{o}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function EditCourseDialog({
  open, course, onClose, onSave,
}: {
  open: boolean
  course: Course | null
  onClose: () => void
  onSave: (id: string, data: any) => void
}) {
  const [name, setName] = useState('')
  const [codeSks, setCodeSks] = useState('')
  const [sksVal, setSksVal] = useState('')
  const [sem, setSem] = useState(1)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open && course) {
      setName(course.course_name || '')
      setCodeSks(course.code_sks || '')
      setSksVal(course.sks != null ? String(course.sks) : '')
      setSem(course.semester || 1)
      setNotes(course.notes || '')
    }
  }, [open, course])

  const submit = async () => {
    if (!name.trim()) { toast.error('Nama mata kuliah wajib diisi'); return }
    if (!course) return
    setSaving(true)
    try {
      await onSave(course.id, {
        course_name: name.trim(),
        code_sks: codeSks.trim(),
        sks: sksVal,
        semester: Number(sem),
        notes: notes.trim(),
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-4 w-4" /> Edit Mata Kuliah
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Nama Mata Kuliah</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Algoritma & Pemrograman"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Kode Mata Kuliah</Label>
              <Input
                value={codeSks}
                onChange={(e) => setCodeSks(e.target.value)}
                placeholder="Contoh: IF101"
              />
            </div>
            <div className="space-y-1.5">
              <Label>SKS</Label>
              <Input
                type="number"
                min={1}
                max={12}
                value={sksVal}
                onChange={(e) => setSksVal(e.target.value)}
                placeholder="Contoh: 3"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Semester</Label>
              <Select value={String(sem)} onValueChange={(v) => setSem(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SEMESTERS.map((s) => (
                    <SelectItem key={s} value={String(s)}>Semester {s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Catatan (opsional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Catatan khusus, nama dosen, grup WA, dll."
              className="h-20"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={submit} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Simpan Perubahan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
