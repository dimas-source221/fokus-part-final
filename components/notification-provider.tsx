'use client'

import { useEffect, useRef, useCallback } from 'react'
import { api } from '@/lib/api'

type Agenda = {
  id: string
  title: string
  description: string | null
  location: string | null
  agenda_date: string
  agenda_time: string | null
  reminder_minutes: number
  notified: boolean
}

type Task = {
  id: string
  title: string
  done: boolean
  due_at: string | null
}

function playFokusSound() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()

    const now = ctx.currentTime

    const notes = [
      { freq: 523.25, start: 0, dur: 0.15 },
      { freq: 659.25, start: 0.12, dur: 0.15 },
      { freq: 783.99, start: 0.24, dur: 0.25 },
    ]

    for (const note of notes) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = note.freq
      gain.gain.setValueAtTime(0, now + note.start)
      gain.gain.linearRampToValueAtTime(0.25, now + note.start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, now + note.start + note.dur)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now + note.start)
      osc.stop(now + note.start + note.dur + 0.05)
    }

    setTimeout(() => ctx.close(), 1000)
  } catch {
    // AudioContext not available
  }
}

async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const result = await Notification.requestPermission()
  return result === 'granted'
}

function showNotification(title: string, body: string) {
  if (typeof window === 'undefined' || !('Notification' in window)) return
  if (Notification.permission !== 'granted') return
  try {
    new Notification(title, {
      body,
      icon: '/favicon.ico',
      tag: title + body,
    })
  } catch {
    // notification failed
  }
}

export default function NotificationProvider() {
  const agendasRef = useRef<Agenda[]>([])
  const tasksRef = useRef<Task[]>([])
  const notifiedAgendasRef = useRef<Set<string>>(new Set())
  const notifiedTasksRef = useRef<Set<string>>(new Set())

  const loadAgendas = useCallback(async () => {
    try {
      const data = await api('/agendas')
      const list: Agenda[] = data.agendas || []
      agendasRef.current = list
    } catch {
      // silent
    }
  }, [])

  const loadTasks = useCallback(async () => {
    try {
      const data = await api('/tasks')
      const list: Task[] = (data.tasks || []).filter((t: Task) => !t.done && t.due_at)
      tasksRef.current = list
    } catch {
      // silent
    }
  }, [])

  const checkAgendas = useCallback(() => {
    const now = new Date()
    for (const agenda of agendasRef.current) {
      if (notifiedAgendasRef.current.has(agenda.id)) continue

      const dateStr = agenda.agenda_time
        ? `${agenda.agenda_date}T${agenda.agenda_time}`
        : `${agenda.agenda_date}T09:00:00`
      const eventTime = new Date(dateStr)
      const reminderTime = new Date(eventTime.getTime() - agenda.reminder_minutes * 60 * 1000)

      if (now >= reminderTime && now <= eventTime) {
        const timeLabel = agenda.agenda_time
          ? `Pukul ${agenda.agenda_time}`
          : 'Hari ini'
        showNotification(
          'Pengingat Agenda: ' + agenda.title,
          `${timeLabel}${agenda.location ? ' - ' + agenda.location : ''}`,
        )
        playFokusSound()
        notifiedAgendasRef.current.add(agenda.id)

        api(`/agendas/${agenda.id}`, {
          method: 'PUT',
          body: JSON.stringify({ notified: true }),
        }).catch(() => {})
      }
    }
  }, [])

  const checkTasks = useCallback(() => {
    const now = new Date()
    for (const task of tasksRef.current) {
      if (notifiedTasksRef.current.has(task.id)) continue

      const dueTime = new Date(task.due_at!)
      const reminderTime = new Date(dueTime.getTime() - 10 * 60 * 1000)

      if (now >= reminderTime) {
        showNotification(
          'Pengingat Tugas: ' + task.title,
          'Tugas ini sudah jatuh tempo!',
        )
        playFokusSound()
        notifiedTasksRef.current.add(task.id)
      }
    }
  }, [])

  useEffect(() => {
    requestNotificationPermission()
    loadAgendas()
    loadTasks()

    const interval = setInterval(() => {
      loadAgendas()
      loadTasks()
      checkAgendas()
      checkTasks()
    }, 30000)

    checkAgendas()
    checkTasks()

    return () => clearInterval(interval)
  }, [loadAgendas, loadTasks, checkAgendas, checkTasks])

  return null
}
