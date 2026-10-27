import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { Me } from '../lib/types'
import { btn, field } from '../components/ui'
import { Mark } from '../components/Layout'

export function Login() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const qc = useQueryClient()
  const navigate = useNavigate()
  const submit = useMutation({
    mutationFn: () => api<Me>(`/auth/${mode}`, { method: 'POST', json: { email, password } }),
    onSuccess: (me) => { qc.setQueryData(['me'], me); void navigate('/') },
  })

  return (
    <div className="mx-auto max-w-md pt-6">
      <form className="glass-card rounded-lg p-6 sm:p-8" onSubmit={(e) => { e.preventDefault(); submit.mutate() }} noValidate={false}>
        <Mark size={32} />
        <h1 className="mt-4 font-serif text-title">{mode === 'login' ? 'Sign in' : 'Create your account'}</h1>
        <p className="mt-1 text-[14px] text-slate">
          {mode === 'login' ? 'Saved trips and alerts follow your account.' : 'Use at least 10 characters for your password.'}
        </p>
        <label htmlFor="email" className="mt-6 block text-[13px] text-slate">Email</label>
        <input id="email" type="email" autoComplete="email" required className={`${field} mt-1`} value={email} onChange={(e) => setEmail(e.target.value)} />
        <label htmlFor="password" className="mt-4 block text-[13px] text-slate">Password</label>
        <input id="password" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={10} required className={`${field} mt-1`} value={password} onChange={(e) => setPassword(e.target.value)} />
        {submit.error && <p role="alert" className="mt-3 text-[14px] text-stop-ink">{submit.error.message}</p>}
        <button className={`${btn.primary} mt-6 w-full`} disabled={submit.isPending}>
          {submit.isPending ? (mode === 'login' ? 'Signing in…' : 'Creating account…') : mode === 'login' ? 'Sign in' : 'Create account'}
        </button>
        <p className="mt-4 text-center text-[14px] text-slate">
          {mode === 'login' ? 'New here? ' : 'Already have an account? '}
          <button type="button" className="text-sky-ink underline decoration-sky/40 underline-offset-[3px]" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); submit.reset() }}>
            {mode === 'login' ? 'Create an account' : 'Sign in'}
          </button>
        </p>
      </form>
    </div>
  )
}

export function NotFound() {
  return (
    <div className="max-w-xl pt-6">
      <p className="font-mono text-[14px] text-muted">404</p>
      <h1 className="mt-1 font-serif text-display">Off the map.</h1>
      <p className="mt-3 text-[15px] text-slate">There is no page at this address. Pick a board, the live map or fare comparison from the menu.</p>
    </div>
  )
}
