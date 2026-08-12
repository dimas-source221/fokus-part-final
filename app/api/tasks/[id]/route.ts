import { NextRequest, NextResponse } from 'next/server'
import { supabaseWithAuth } from '@/lib/supabase-server'

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  const supabase = supabaseWithAuth(token)
  const body = await req.json()
  const { title, category, priority, done, due_at } = body

  const updateData: Record<string, any> = {}
  if (title !== undefined) updateData.title = title.trim()
  if (category !== undefined) updateData.category = category
  if (priority !== undefined) updateData.priority = priority
  if (done !== undefined) updateData.done = done
  if (due_at !== undefined) updateData.due_at = due_at || null

  const { data, error } = await supabase
    .from('tasks')
    .update(updateData)
    .eq('id', params.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ task: data })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  const supabase = supabaseWithAuth(token)
  const { error } = await supabase.from('tasks').delete().eq('id', params.id)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
