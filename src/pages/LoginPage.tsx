import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Button, Icon, Input } from '../components/ui'
import { supabase } from '../lib/supabase'


const [isSubmitting, setIsSubmitting] = useState(false)

export function LoginPage() {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [errors, setErrors] = useState<{ identifier?: string; password?: string }>({})
  const [authError, setAuthError] = useState('')
  const navigate = useNavigate()

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()

    const next: typeof errors = {}
    if (!identifier.trim()) next.identifier = 'Enter your email'
    if (!password) next.password = 'Enter your password'

    setErrors(next)
    setAuthError('')
    if (Object.keys(next).length > 0) return

    setIsSubmitting(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: identifier.trim(),
        password,
      })

      if (error) {
        setAuthError('Email or password is incorrect.')
        return
      }

      navigate('/', { replace: true })
    } catch (error) {
      console.error('[auth] sign-in failed', error)
      setAuthError('Could not sign in. Check your connection and try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-dvh bg-background text-foreground flex flex-col lg:flex-row">
      <aside className="bg-secondary text-secondary-foreground lg:w-[44%] px-6 py-8 sm:px-10 lg:p-14 flex flex-col justify-between gap-8">
        <div>
          <p className="font-mono text-[10px] tracking-[0.25em] uppercase text-secondary-foreground/45 mb-1">0UNKLORDE</p>
          <p className="font-display text-2xl font-semibold tracking-tight">Student OS</p>
          <div className="mt-4 h-px w-40 bg-gradient-to-r from-accent/60 via-accent/20 to-transparent" />
        </div>
        <p className="hidden sm:block font-display text-xl lg:text-3xl leading-snug text-secondary-foreground/90 max-w-md">
          Courses, grades, portfolio and the rest of your life, in one calm place.
        </p>
      </aside>

      <main className="flex-1 flex items-center justify-center px-5 py-10 sm:px-8">
        <form onSubmit={onSubmit} noValidate className="w-full max-w-sm space-y-5">
          <div>
            <p className="font-mono text-[10px] tracking-[0.22em] uppercase text-accent mb-1">Welcome back</p>
            <h1 className="font-display text-2xl font-semibold">Sign in</h1>
          </div>

          <Input
            label="Email address"
            icon="user"
            autoComplete="email"
            value={identifier}
            onChange={(e) => { setIdentifier(e.target.value); setAuthError('') }}
            error={errors.identifier}
          />

          <div className="flex flex-col gap-1">
            <div className="relative">
              <Input
                label="Password"
                type={show ? 'text' : 'password'}
                autoComplete="current-password"
                className="pr-11"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setAuthError('') }}
                error={errors.password}
              />
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                aria-label={show ? 'Hide password' : 'Show password'}
                className="absolute right-0 top-[18px] w-10 h-[38px] flex items-center justify-center text-muted-foreground hover:text-foreground"
              >
                <Icon name={show ? 'eye-off' : 'eye'} size={15} />
              </button>
            </div>
          </div>

          <Button type="submit" size="lg" disabled={isSubmitting} className="w-full !bg-silver-wolf text-white">
  {isSubmitting ? 'Signing in…' : 'Log in'}
</Button>

          {authError && (
            <p role="alert" className="text-xs rounded border border-destructive/50 bg-destructive/10 px-3 py-2 text-destructive">
              {authError}
            </p>
          )}
        </form>
      </main>
    </div>
  )
}
