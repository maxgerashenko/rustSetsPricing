import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import styles from './snackbar.module.css'

const SnackbarContext = createContext(null)

export function useSnackbar() {
  const ctx = useContext(SnackbarContext)
  if (!ctx) throw new Error('useSnackbar must be used inside SnackbarProvider')
  return ctx
}

export function SnackbarProvider({ children }) {
  const [snack, setSnack] = useState(null)

  const dismiss = useCallback(() => setSnack(null), [])

  const confirm = useCallback((opts) => {
    setSnack(prev => {
      if (prev) prev.onCancel?.()
      return { ...opts, id: Date.now() + Math.random() }
    })
  }, [])

  return (
    <SnackbarContext.Provider value={{ confirm, dismiss }}>
      {children}
      {snack && (
        <SnackbarItem
          key={snack.id}
          snack={snack}
          onDone={() => setSnack(null)}
        />
      )}
    </SnackbarContext.Provider>
  )
}

function SnackbarItem({ snack, onDone }) {
  const { message, actionLabel, delayMs, onConfirm, onCancel } = snack
  const [remaining, setRemaining] = useState(Math.ceil(delayMs / 1000))
  const settledRef = useRef(false)

  useEffect(() => {
    const start = Date.now()
    const intervalId = setInterval(() => {
      const elapsed = Date.now() - start
      const left = Math.max(0, Math.ceil((delayMs - elapsed) / 1000))
      setRemaining(left)
      if (elapsed >= delayMs) {
        clearInterval(intervalId)
        if (!settledRef.current) {
          settledRef.current = true
          onConfirm?.()
          onDone()
        }
      }
    }, 100)
    return () => clearInterval(intervalId)
  }, [delayMs, onConfirm, onDone])

  const handleDismiss = () => {
    onDone()
  }

  const handleCancel = () => {
    if (settledRef.current) return
    settledRef.current = true
    onCancel?.()
    onDone()
  }

  const parts = message.split('{n}')

  return (
    <div className={styles.snackbar} role="status" aria-live="polite">
      <span className={styles.message}>
        {parts[0]}<span className={styles.countdown}>{remaining}</span> seconds{parts[1]}
      </span>
      <button type="button" className={styles.dismissBtn} onClick={handleDismiss}>
        Ignore
      </button>
      <button type="button" className={styles.cancelBtn} onClick={handleCancel}>
        {actionLabel}
      </button>
    </div>
  )
}
