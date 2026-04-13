import { useState, useEffect } from 'react'
import api from '../api/client'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || ''

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function usePushNotifications() {
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setIsSupported('serviceWorker' in navigator && 'PushManager' in window)
  }, [])

  useEffect(() => {
    if (!isSupported) return
    navigator.serviceWorker.ready.then((sw) => {
      sw.pushManager.getSubscription().then((sub) => {
        setIsSubscribed(!!sub)
      })
    })
  }, [isSupported])

  async function subscribe() {
    setError(null)
    try {
      const sw = await navigator.serviceWorker.ready
      const sub = await sw.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY).buffer as ArrayBuffer,
      })
      await api.push.subscribe(sub.toJSON())
      setIsSubscribed(true)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Push-Abonnement fehlgeschlagen'
      setError(msg)
      throw e
    }
  }

  async function unsubscribe() {
    setError(null)
    try {
      const sw = await navigator.serviceWorker.ready
      const sub = await sw.pushManager.getSubscription()
      if (sub) {
        await sub.unsubscribe()
        setIsSubscribed(false)
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Fehler beim Abbestellen'
      setError(msg)
    }
  }

  return { isSubscribed, isSupported, subscribe, unsubscribe, error }
}
