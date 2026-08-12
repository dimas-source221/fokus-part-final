'use client'

import { useEffect } from 'react'
import { GraduationCap, RefreshCw } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="text-center space-y-4 max-w-md">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-destructive/10 text-destructive mx-auto">
          <GraduationCap className="h-7 w-7" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-xl font-semibold">Terjadi kesalahan</h2>
          <p className="text-sm text-muted-foreground">
            Aplikasi mengalami masalah saat dimuat. Coba muat ulang halaman.
          </p>
        </div>
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Coba lagi
        </button>
      </div>
    </div>
  )
}
