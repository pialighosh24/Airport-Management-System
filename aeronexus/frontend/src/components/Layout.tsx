import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ListIcon, XIcon } from '@phosphor-icons/react'
import { api } from '../lib/api'
import type { Me } from '../lib/types'

export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: () => api<Me>('/auth/me').catch(() => null),
    staleTime: 5 * 60e3,
  })
}

/** The brand mark: radar rings, borrowed from the blueprint cover. */
export function Mark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden className="shrink-0">
      <circle cx="17" cy="7" r="3" fill="none" stroke="var(--color-sky)" strokeWidth="1.6" />
      <circle cx="17" cy="7" r="8" fill="none" stroke="var(--color-ink)" strokeWidth="1.4" opacity=".55" />
      <circle cx="17" cy="7" r="13.5" fill="none" stroke="var(--color-ink)" strokeWidth="1.2" opacity=".3" />
      <circle cx="17" cy="7" r="1.4" fill="var(--color-amber)" />
    </svg>
  )
}

const links = [
  { to: '/', label: 'Boards', end: true },
  { to: '/live-map', label: 'Live map' },
  { to: '/compare', label: 'Compare fares' },
]

function Nav() {
  const [open, setOpen] = useState(false)
  const { data: me } = useMe()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const logout = useMutation({
    mutationFn: () => api('/auth/logout', { method: 'POST' }),
    onSuccess: () => { qc.setQueryData(['me'], null); void navigate('/') },
  })
  const item = ({ isActive }: { isActive: boolean }) =>
    `relative rounded-sm px-3 py-1.5 text-[14px] transition-colors duration-[var(--dur-micro)] ${isActive ? 'text-ink after:absolute after:inset-x-3 after:-bottom-0.5 after:h-[2px] after:rounded-full after:bg-sky' : 'text-slate hover:text-ink'}`

  return (
    <header className="sticky top-0 z-40 px-3 pt-3 sm:px-5">
      <nav aria-label="Main" className="glass-float mx-auto flex max-w-[1240px] items-center gap-2 rounded-lg px-3 py-2">
        <Link to="/" className="mr-3 flex items-center gap-2 rounded-sm px-1 py-1">
          <Mark />
          <span className="text-[16px] font-semibold tracking-[-0.01em]">AeroNexus</span>
        </Link>
        <div className="hidden items-center md:flex">
          {links.map((l) => <NavLink key={l.to} to={l.to} end={l.end} className={item}>{l.label}</NavLink>)}
        </div>
        <div className="ml-auto hidden items-center gap-2 md:flex">
          {me ? (
            <>
              <span className="max-w-48 truncate text-[13px] text-slate" title={me.email}>{me.email}</span>
              <button className="rounded-sm px-3 py-1.5 text-[14px] text-slate hover:text-ink" onClick={() => logout.mutate()}>Sign out</button>
            </>
          ) : (
            <NavLink to="/login" className={item}>Sign in</NavLink>
          )}
        </div>
        <button
          className="ml-auto inline-flex size-10 items-center justify-center rounded-md text-ink md:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <XIcon size={20} /> : <ListIcon size={20} />}
        </button>
      </nav>
      {open && (
        <div id="mobile-nav" className="glass-float mx-auto mt-2 flex max-w-[1240px] flex-col rounded-lg p-2 md:hidden">
          {[...links, ...(me ? [] : [{ to: '/login', label: 'Sign in', end: false }])].map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} onClick={() => setOpen(false)} className={({ isActive }) => `rounded-md px-3 py-3 text-[15px] ${isActive ? 'bg-sky-wash text-ink' : 'text-slate'}`}>{l.label}</NavLink>
          ))}
          {me && <button className="rounded-md px-3 py-3 text-left text-[15px] text-slate" onClick={() => { setOpen(false); logout.mutate() }}>Sign out ({me.email})</button>}
        </div>
      )}
    </header>
  )
}

/** Line-art backdrop: radar rings top-right, a runway centreline bottom-left. Gives the glass something to refract. */
function Backdrop() {
  return (
    <svg aria-hidden className="pointer-events-none fixed inset-0 -z-10 h-full w-full" preserveAspectRatio="xMidYMid slice" viewBox="0 0 1440 900">
      <defs>
        <radialGradient id="sun" cx="88%" cy="6%" r="55%">
          <stop offset="0" stopColor="oklch(93% 0.05 245)" />
          <stop offset="1" stopColor="oklch(93% 0.05 245 / 0)" />
        </radialGradient>
      </defs>
      <rect width="1440" height="900" fill="url(#sun)" />
      <g fill="none" stroke="oklch(45% 0.06 255)" strokeOpacity=".09">
        {[90, 190, 300, 420, 560, 720].map((r) => <circle key={r} cx="1270" cy="60" r={r} />)}
      </g>
      <path d="M-40 980 L620 560" stroke="oklch(45% 0.06 255)" strokeOpacity=".08" strokeWidth="2" strokeDasharray="28 22" />
    </svg>
  )
}

export function Layout() {
  return (
    <div className="isolate flex min-h-dvh flex-col">
      <Backdrop />
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-ink focus:px-3 focus:py-2 focus:text-paper">Skip to content</a>
      <Nav />
      <main id="main" className="mx-auto w-full max-w-[1240px] flex-1 px-4 pb-16 pt-6 sm:px-6">
        <Outlet />
      </main>
      <footer className="mx-auto w-full max-w-[1240px] border-t border-rule px-4 py-5 text-[12.5px] text-muted sm:px-6">
        AeroNexus is an information service. It is not air traffic control, an airline booking system or an airport's official flight display. Weather from Open-Meteo, base map © OpenStreetMap contributors via OpenFreeMap.
      </footer>
    </div>
  )
}
