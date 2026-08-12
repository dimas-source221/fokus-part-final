import { NextRequest, NextResponse } from 'next/server'
import { supabaseWithAuth } from '@/lib/supabase-server'

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  const supabase = supabaseWithAuth(token)
  const body = await req.json()
  const {
    attendance_status,
    discussion_status,
    task_status,
    session_date,
    notes,
  } = body

  const updateData: Record<string, any> = {}
  if (attendance_status !== undefined) updateData.attendance_status = attendance_status
  if (discussion_status !== undefined) updateData.discussion_status = discussion_status
  if (task_status !== undefined) updateData.task_status = task_status
  if (session_date !== undefined) updateData.session_date = session_date || null
  if (notes !== undefined) updateData.notes = notes?.trim() || null

  const { data, error } = await supabase
    .from('sessions')
    .update(updateData)
    .eq('id', params.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ session: data })
}
