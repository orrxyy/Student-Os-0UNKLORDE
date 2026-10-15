import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { Button, Input } from '../components/ui'
import { supabase } from '../lib/supabase'

export function UpdatePasswordPage() {
  const [checking, setChecking] = useState(true)
  const [hasSession, setHasSession] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    let active = true

    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return

      if (error) setError('Could not verify the reset link. Request a new one.')
      setHasSession(Boolean(data.session))
      setChecking(false)
    })

    return () => {
      active = false
    }
  }, [])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setMessage('')

    if (password.length < 8) {
      setError('Use a password with at least 8 characters.')
      return
    }

    if (password !== confirmPassword) {
      setError('The passwords do not match.')
      return
    }

    setSaving(true)

    try {
      const { error } = await supabase.auth.updateUser({ password })

      if (error) {
        setError(error.message)
        return
      }

      setMessage('Password updated. Taking you to your dashboard…')
      setTimeout(() => navigate('/', { replace: true }), 1200)
    } catch (error) {
      console.error('[auth] password update failed', error)
      setError('Could not update the password. Request a new reset link.')
    } finally {
      setSaving(false)
    }
  }

  if (checking) {
    return <div className="min-h-dvh bg-background p-6 text-foreground">Checking reset link…</div>
  }

  if (!hasSession) {
    return (
      <main className="min-h-dvh bg-background text-foreground flex items-center justify-center p-5">
        <div className="w-full max-w-sm space-y-4">
          <h1 className="font-display text-2xl font-semibold">Reset link expired</h1>
          <p className="text-sm text-muted-foreground">
            Request a new password reset link from the login page.
          </p>
          <Button onClick={() => navigate('/login', { replace: true })}>Back to login</Button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-dvh bg-background text-foreground flex items-center justify-center p-5">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-5">
        <div>
          <p className="font-mono text-[10px] tracking-[0.22em] uppercase text-accent mb-1">
            Account security
          </p>
          <h1 className="font-display text-2xl font-semibold">Set a new password</h1>
        </div>

        <Input
          label="New password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <Input
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />

        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {message && <p role="status" className="text-sm text-muted-foreground">{message}</p>}

        <Button type="submit" disabled={saving} className="w-full">
          {saving ? 'Saving…' : 'Update password'}
        </Button>
      </form>
    </main>
  )
}
