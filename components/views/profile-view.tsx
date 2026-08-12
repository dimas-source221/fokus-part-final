'use client'

import { useState, useRef, useEffect } from 'react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import {
  User, GraduationCap, Save, Calendar, Camera, Image as ImageIcon, Loader2,
} from 'lucide-react'

import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { api } from '@/lib/api'
import { supabase } from '@/lib/supabase-browser'

type Profile = {
  name: string
  university: string
  major: string
  semester: string
  bio: string
  avatar_url: string
  cover_url: string
}

const EMPTY: Profile = {
  name: '',
  university: '',
  major: '',
  semester: '',
  bio: '',
  avatar_url: '',
  cover_url: '',
}

const SEMESTERS = Array.from({ length: 20 }, (_, i) => String(i + 1))

export default function ProfileView() {
  const [form, setForm] = useState<Profile>(EMPTY)
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await api('/profiles')
        if (cancelled) return
        const p = data.profile
        if (p) {
          setForm({
            name: p.name || '',
            university: p.university || '',
            major: p.major || '',
            semester: p.semester || '',
            bio: p.bio || '',
            avatar_url: p.avatar_url || '',
            cover_url: p.cover_url || '',
          })
        }
      } catch {
        // silent — new user has no profile yet
      } finally {
        if (!cancelled) setLoaded(true)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const update = (field: keyof Profile, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const saveProfile = async () => {
    setSaving(true)
    try {
      await api('/profiles', {
        method: 'PUT',
        body: JSON.stringify(form),
      })
      toast.success('Profil berhasil disimpan!')
    } catch (e: any) {
      toast.error(e.message || 'Gagal menyimpan profil')
    } finally {
      setSaving(false)
    }
  }

  const uploadPhoto = async (
    file: File,
    kind: 'avatar' | 'cover',
  ) => {
    const { data: sessionData } = await supabase.auth.getSession()
    const userId = sessionData?.session?.user?.id
    if (!userId) {
      toast.error('Sesi berakhir, silakan masuk kembali')
      return
    }

    const setUploading = kind === 'avatar' ? setUploadingAvatar : setUploadingCover
    setUploading(true)

    try {
      const ext = file.name.split('.').pop() || 'jpg'
      const path = `${userId}/${kind}-${Date.now()}.${ext}`

      const { error: upErr } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true })

      if (upErr) throw upErr

      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(path)

      const publicUrl = urlData.publicUrl

      setForm((prev) => ({
        ...prev,
        [kind === 'avatar' ? 'avatar_url' : 'cover_url']: publicUrl,
      }))

      await api('/profiles', {
        method: 'PUT',
        body: JSON.stringify({
          ...form,
          [kind === 'avatar' ? 'avatar_url' : 'cover_url']: publicUrl,
        }),
      })

      toast.success(kind === 'avatar' ? 'Foto profil diperbarui!' : 'Foto sampul diperbarui!')
    } catch (e: any) {
      toast.error(e.message || 'Gagal mengunggah foto')
    } finally {
      setUploading(false)
    }
  }

  const initials = (form.name || '?')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?'

  if (!loaded) {
    return (
      <div className="space-y-4 max-w-3xl">
        <div className="h-8 w-48 rounded bg-muted animate-pulse" />
        <div className="h-48 rounded-lg bg-muted animate-pulse" />
        <div className="h-64 rounded-lg bg-muted animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-xl font-extrabold text-white">Profile</h2>
        <p className="text-muted-foreground mt-1">
          Atur informasi pribadi dan foto kamu.
        </p>
      </div>

      <input
        ref={avatarInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) uploadPhoto(f, 'avatar')
          e.target.value = ''
        }}
      />
      <input
        ref={coverInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) uploadPhoto(f, 'cover')
          e.target.value = ''
        }}
      />

      {/* Profile header card with cover + avatar */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="overflow-hidden">
          <div className="relative h-32 bg-gradient-to-r from-primary/30 via-primary/15 to-accent/30 group">
            {form.cover_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={form.cover_url}
                alt="Sampul"
                className="h-full w-full object-cover"
              />
            )}
            <button
              onClick={() => coverInputRef.current?.click()}
              className="absolute top-3 right-3 flex items-center gap-1.5 rounded-lg bg-black/50 px-3 py-1.5 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/70"
            >
              {uploadingCover ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ImageIcon className="h-3.5 w-3.5" />
              )}
              {uploadingCover ? 'Mengunggah...' : 'Ubah Sampul'}
            </button>
          </div>
          <CardContent className="pb-6">
            <div className="flex items-end gap-4 -mt-12">
              <div className="relative group">
                <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
                  {form.avatar_url ? (
                    <AvatarImage src={form.avatar_url} alt={form.name} />
                  ) : null}
                  <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition-transform hover:scale-110"
                  aria-label="Ubah foto profil"
                >
                  {uploadingAvatar ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                </button>
              </div>
              <div className="pb-2">
                <div className="text-xl font-bold">
                  {form.name || 'Nama Belum Diisi'}
                </div>
                <div className="text-sm text-muted-foreground">
                  {form.major || form.university || 'Lengkapi profil kamu'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Edit form */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.1 } }}>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Informasi Pribadi</CardTitle>
            <CardDescription>Ubah data diri kamu di bawah ini</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                icon={<User className="h-4 w-4" />}
                label="Nama Lengkap"
                value={form.name}
                onChange={(v) => update('name', v)}
                placeholder="Nama kamu"
              />
            </div>

            <Separator />

            <div className="space-y-1.5">
              <Label className="text-sm font-medium flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-primary" /> Akademik
              </Label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                label="Universitas"
                value={form.university}
                onChange={(v) => update('university', v)}
                placeholder="Nama universitas"
              />
              <FormField
                label="Jurusan"
                value={form.major}
                onChange={(v) => update('major', v)}
                placeholder="Program studi"
              />
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1.5 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  Semester
                </Label>
                <Select
                  value={form.semester || undefined}
                  onValueChange={(v) => update('semester', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih semester saat ini" />
                  </SelectTrigger>
                  <SelectContent>
                    {SEMESTERS.map((s) => (
                      <SelectItem key={s} value={s}>Semester {s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label className="text-sm font-medium">Bio</Label>
              <Textarea
                value={form.bio}
                onChange={(e) => update('bio', e.target.value)}
                placeholder="Ceritakan sedikit tentang diri kamu..."
                className="min-h-[80px]"
              />
            </div>

            <div className="flex justify-end">
              <Button onClick={saveProfile} disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Simpan Profil
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

function FormField({
  icon, label, value, onChange, placeholder, type = 'text',
}: {
  icon?: React.ReactNode
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs flex items-center gap-1.5 text-muted-foreground">
        {icon}
        {label}
      </Label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  )
}
