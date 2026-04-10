'use client'

import { useEffect } from 'react'

export function ServiceWorkerRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // 서비스워커 등록 실패 시 조용히 무시
      })
    }
  }, [])

  return null
}
