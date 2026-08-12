import { NextRequest, NextResponse } from 'next/server'
import { supabaseWithAuth } from '@/lib/supabase-server'

export async function PUT(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  const supabase = supabaseWithAuth(token)

  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userData.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const id = req.nextUrl.pathname.split('/').pop()
  const body = await req.json()
  const { title, description, location, agenda_date, agenda_time, reminder_minutes, notified } = body

  const payload: Record<string, unknown> = {}
  if (title !== undefined) payload.title = title.trim()
  if (description !== undefined) payload.description = description || null
  if (location !== undefined) payload.location = location || null
  if (agenda_date !== undefined) payload.agenda_date = agenda_date
  if (agenda_time !== undefined) payload.agenda_time = agenda_time || null
  if (reminder_minutes !== undefined) payload.reminder_minutes = reminder_minutes
  if (notified !== undefined) payload.notified = notified

  const { data, error } = await supabase
    .from('agendas')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ agenda: data })
}

export async function DELETE(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  const supabase = supabaseWithAuth(token)

  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userData.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const id = req.nextUrl.pathname.split('/').pop()

  const { error } = await supabase
    .from('agendas')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
