'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Trash2, Pencil, StickyNote, Save, X,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card'
import { useLocalStorage } from '@/hooks/use-local-storage'

type Note = {
  id: string
  title: string
  body: string
  color: string
  updatedAt: number
}

const NOTE_COLORS = [
  { id: 'amber', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
  { id: 'sky', bg: 'bg-sky-500/10', border: 'border-sky-500/30' },
  { id: 'emerald', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
  { id: 'rose', bg: 'bg-rose-500/10', border: 'border-rose-500/30' },
  { id: 'slate', bg: 'bg-slate-500/10', border: 'border-slate-500/30' },
]

const colorMap = Object.fromEntries(NOTE_COLORS.map((c) => [c.id, c]))

export default function NotesView() {
  const [notes, setNotes, loaded] = useLocalStorage<Note[]>('fokus:notes', [])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formTitle, setFormTitle] = useState('')
  const [formBody, setFormBody] = useState('')
  const [formColor, setFormColor] = useState('amber')

  const openNew = () => {
    setEditingId(null)
    setFormTitle('')
    setFormBody('')
    setFormColor('amber')
    setShowForm(true)
  }

  const openEdit = (note: Note) => {
    setEditingId(note.id)
    setFormTitle(note.title)
    setFormBody(note.body)
    setFormColor(note.color)
    setShowForm(true)
  }

  const save = () => {
    if (!formTitle.trim() && !formBody.trim()) {
      toast.error('Catatan tidak boleh kosong')
      return
    }
    if (editingId) {
      setNotes((prev) =>
        prev.map((n) =>
          n.id === editingId
            ? { ...n, title: formTitle.trim() || 'Tanpa Judul', body: formBody.trim(), color: formColor, updatedAt: Date.now() }
            : n
        )
      )
      toast.success('Catatan diperbarui')
    } else {
      const note: Note = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title: formTitle.trim() || 'Tanpa Judul',
        body: formBody.trim(),
        color: formColor,
        updatedAt: Date.now(),
      }
      setNotes((prev) => [note, ...prev])
      toast.success('Catatan ditambahkan')
    }
    setShowForm(false)
  }

  const deleteNote = (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id))
    toast.success('Catatan dihapus')
  }

  if (!loaded) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 rounded bg-muted animate-pulse" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-32 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-extrabold text-white">Notes</h2>
          <p className="text-muted-foreground mt-1">
            Simpan catatan penting. Data tersimpan di perangkat.
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4 mr-1" /> Catatan Baru
        </Button>
      </div>

      {/* Form dialog */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {editingId ? 'Edit Catatan' : 'Catatan Baru'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Input
                    autoFocus
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="Judul catatan..."
                  />
                </div>
                <Textarea
                  value={formBody}
                  onChange={(e) => setFormBody(e.target.value)}
                  placeholder="Tulis catatan kamu di sini..."
                  className="min-h-[120px]"
                />
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground mr-1">Warna:</span>
                  {NOTE_COLORS.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setFormColor(c.id)}
                      className={`h-7 w-7 rounded-full border-2 transition-all ${
                        formColor === c.id ? 'border-foreground scale-110' : 'border-transparent'
                      } ${c.bg}`}
                    >
                      <span className={`block h-3 w-3 rounded-full ${c.bg}`} />
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <Button onClick={save}>
                    <Save className="h-4 w-4 mr-1" /> Simpan
                  </Button>
                  <Button variant="outline" onClick={() => setShowForm(false)}>
                    <X className="h-4 w-4 mr-1" /> Batal
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notes grid */}
      {notes.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center space-y-3">
            <StickyNote className="h-10 w-10 mx-auto text-muted-foreground" />
            <div className="font-medium">Belum ada catatan</div>
            <p className="text-sm text-muted-foreground">
              Buat catatan pertama kamu untuk menyimpan hal-hal penting.
            </p>
            <Button onClick={openNew} className="mt-2">
              <Plus className="h-4 w-4 mr-1" /> Buat Catatan
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence>
            {notes.map((n, i) => {
              const c = colorMap[n.color] || colorMap.slate
              return (
                <motion.div
                  key={n.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1, transition: { delay: i * 0.04 } }}
                  exit={{ opacity: 0, scale: 0.9 }}
                >
                  <Card className={`group ${c.bg} ${c.border}`}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-base truncate">{n.title}</CardTitle>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => openEdit(n)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 hover:text-rose-500"
                            onClick={() => deleteNote(n.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {n.body && (
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-6">
                          {n.body}
                        </p>
                      )}
                      <p className="text-[11px] text-muted-foreground/70 mt-3">
                        {new Date(n.updatedAt).toLocaleDateString('id-ID', {
                          day: 'numeric', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
