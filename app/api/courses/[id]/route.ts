import { NextRequest, NextResponse } from 'next/server'
import { supabaseWithAuth } from '@/lib/supabase-server'

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  const supabase = supabaseWithAuth(token)
  const body = await req.json()
  const { course_name, semester, code_sks, sks, notes } = body

  const updateData: Record<string, any> = {}
  if (course_name !== undefined) updateData.course_name = course_name.trim()
  if (semester !== undefined) updateData.semester = Number(semester)
  if (code_sks !== undefined) updateData.code_sks = code_sks?.trim() || null
  if (sks !== undefined) updateData.sks = sks === '' || sks === null ? null : Number(sks)
  if (notes !== undefined) updateData.notes = notes?.trim() || null

  const { data, error } = await supabase
    .from('courses')
    .update(updateData)
    .eq('id', params.id)
    .select('*, sessions(task_status)')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const sessions = (data as any).sessions || []
  const done = sessions.filter(
    (s: any) => s.task_status === 'Selesai' || s.task_status === 'Tanpa Tugas'
  ).length
  const progress =
    sessions.length > 0 ? Math.round((done / sessions.length) * 100) : 0
  const { sessions: _, ...rest } = data as any

  return NextResponse.json({ course: { ...rest, progress } })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  const supabase = supabaseWithAuth(token)
  const { error } = await supabase.from('courses').delete().eq('id', params.id)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
