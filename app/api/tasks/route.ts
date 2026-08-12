import { NextRequest, NextResponse } from 'next/server'
import { supabaseWithAuth } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  const supabase = supabaseWithAuth(token)

  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('done', { ascending: true })
    .order('due_at', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ tasks: data || [] })
}

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  const supabase = supabaseWithAuth(token)
  const body = await req.json()
  const { title, category, priority, due_at } = body

  if (!title || !title.trim()) {
    return NextResponse.json({ error: 'Judul tugas wajib diisi' }, { status: 400 })
  }

  const validCategories = ['pekerjaan', 'pribadi']
  const validPriorities = ['tinggi', 'sedang', 'rendah']

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      title: title.trim(),
      category: validCategories.includes(category) ? category : 'pekerjaan',
      priority: validPriorities.includes(priority) ? priority : 'sedang',
      due_at: due_at || null,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ task: data })
}
