import { NextRequest, NextResponse } from 'next/server'
import { supabaseWithAuth } from '@/lib/supabase-server'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  const supabase = supabaseWithAuth(token)
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('course_id', params.id)
    .order('session_number', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ sessions: data || [] })
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  const supabase = supabaseWithAuth(token)
  const body = await req.json()
  const { session_date, notes } = body

  const { data: last } = await supabase
    .from('sessions')
    .select('session_number')
    .eq('course_id', params.id)
    .order('session_number', { ascending: false })
    .limit(1)
    .maybeSingle()

  const nextNum = (last?.session_number || 0) + 1

  const { data, error } = await supabase
    .from('sessions')
    .insert({
      course_id: params.id,
      session_number: nextNum,
      session_date: session_date || null,
      notes: notes?.trim() || null,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ session: data })
}
