import { NextRequest, NextResponse } from 'next/server'
import { supabaseWithAuth } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  const supabase = supabaseWithAuth(token)

  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userData.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('agendas')
    .select('*')
    .order('agenda_date', { ascending: true })
    .order('agenda_time', { ascending: true, nullsFirst: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ agendas: data || [] })
}

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  const supabase = supabaseWithAuth(token)

  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userData.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { title, description, location, agenda_date, agenda_time, reminder_minutes } = body

  if (!title || !title.trim()) {
    return NextResponse.json({ error: 'Judul agenda wajib diisi' }, { status: 400 })
  }
  if (!agenda_date) {
    return NextResponse.json({ error: 'Tanggal agenda wajib diisi' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('agendas')
    .insert({
      title: title.trim(),
      description: description || null,
      location: location || null,
      agenda_date,
      agenda_time: agenda_time || null,
      reminder_minutes: reminder_minutes ?? 10,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ agenda: data })
}
