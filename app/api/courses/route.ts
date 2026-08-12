import { NextRequest, NextResponse } from 'next/server'
import { supabaseWithAuth } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  const supabase = supabaseWithAuth(token)
  const searchParams = new URL(req.url)
  const semester = Number(searchParams.searchParams.get('semester') || 1)

  const { data, error } = await supabase
    .from('courses')
    .select('*, sessions(task_status)')
    .eq('semester', semester)
    .order('created_at', { ascending: true })
    .order('course_name', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const courses = (data || []).map((c) => {
    const sessions = (c as any).sessions || []
    const done = sessions.filter(
      (s: any) => s.task_status === 'Selesai' || s.task_status === 'Tanpa Tugas'
    ).length
    const progress =
      sessions.length > 0 ? Math.round((done / sessions.length) * 100) : 0
    const { sessions: _, ...rest } = c as any
    return { ...rest, progress }
  })

  return NextResponse.json({ courses })
}

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  const supabase = supabaseWithAuth(token)
  const body = await req.json()
  const { course_name, semester, session_count, code_sks, sks, notes } = body

  if (!course_name || !course_name.trim()) {
    return NextResponse.json({ error: 'Nama mata kuliah wajib diisi' }, { status: 400 })
  }

  const { data: course, error } = await supabase
    .from('courses')
    .insert({
      course_name: course_name.trim(),
      semester: Number(semester) || 1,
      sks: sks !== undefined && sks !== '' ? Number(sks) : 0,
      notes: notes?.trim() || null,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const targetSessions = Number(session_count) || 8
  const sessions = Array.from({ length: targetSessions }, (_, i) => ({
    course_id: course.id,
    session_number: i + 1,
    title: `Sesi ${i + 1}`,
    task_status: 'Tanpa Tugas',
  }))

  const { error: sessionError } = await supabase.from('sessions').insert(sessions)
  if (sessionError) {
    console.error('Error creating sessions:', sessionError)
  }
  return NextResponse.json({ course: { ...course, progress: 0 } })
}
  
