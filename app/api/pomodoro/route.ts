import { NextRequest, NextResponse } from 'next/server'
import { supabaseWithAuth } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  const supabase = supabaseWithAuth(token)

  const { data, error } = await supabase
    .from('pomodoro_sessions')
    .select('*')
    .order('completed_at', { ascending: false })
    .limit(100)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ sessions: data || [] })
}

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  const supabase = supabaseWithAuth(token)
  const body = await req.json()
  const { mode, duration_minutes } = body

  const validModes = ['focus', 'short_break', 'long_break']
  if (!validModes.includes(mode)) {
    return NextResponse.json({ error: 'Mode tidak valid' }, { status: 400 })
  }
  if (!duration_minutes || duration_minutes < 1) {
    return NextResponse.json({ error: 'Durasi tidak valid' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('pomodoro_sessions')
    .insert({ mode, duration_minutes: Math.round(duration_minutes) })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ session: data })
}
