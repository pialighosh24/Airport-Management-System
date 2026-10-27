import { useId, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { Airport } from '../lib/types'
import { field } from './ui'

/** Accessible combobox: type a city, name or code; arrow keys + Enter to choose. */
export function AirportSearch({
  label, value, onChange, placeholder = 'City or airport code', autoFocus,
}: { label: string; value?: string; onChange: (a: Airport) => void; placeholder?: string; autoFocus?: boolean }) {
  const id = useId()
  const [text, setText] = useState(value ?? '')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const q = text.trim()
  const { data, isFetching } = useQuery({
    queryKey: ['airports', q],
    queryFn: () => api<{ items: Airport[] }>(`/airports?query=${encodeURIComponent(q)}`),
    enabled: open && q.length > 0,
    staleTime: 5 * 60e3,
  })
  const items = data?.items ?? []

  const choose = (a: Airport) => {
    setText(a.iata)
    setOpen(false)
    onChange(a)
  }

  return (
    <div className="relative">
      <label htmlFor={id} className="mb-1 block text-[13px] text-slate">{label}</label>
      <input
        id={id}
        role="combobox"
        aria-expanded={open && items.length > 0}
        aria-controls={`${id}-list`}
        aria-activedescendant={open && items[active] ? `${id}-${items[active].iata}` : undefined}
        aria-autocomplete="list"
        autoComplete="off"
        autoFocus={autoFocus}
        className={`${field} font-mono uppercase placeholder:font-sans placeholder:normal-case`}
        placeholder={placeholder}
        value={text}
        onChange={(e) => { setText(e.target.value); setOpen(true); setActive(0) }}
        onFocus={(e) => { e.target.select(); setOpen(true) }}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(i + 1, items.length - 1)) }
          if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)) }
          if (e.key === 'Enter' && open && items[active]) { e.preventDefault(); choose(items[active]) }
          if (e.key === 'Escape') setOpen(false)
        }}
      />
      {open && q && (
        <ul id={`${id}-list`} role="listbox" className="glass-float absolute z-30 mt-1 max-h-72 w-full min-w-64 overflow-auto rounded-md p-1">
          {items.map((a, i) => (
            <li
              key={a.iata}
              id={`${id}-${a.iata}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => { e.preventDefault(); choose(a) }}
              onMouseEnter={() => setActive(i)}
              className={`flex cursor-pointer items-baseline gap-3 rounded-sm px-2.5 py-2 ${i === active ? 'bg-sky-wash' : ''}`}
            >
              <span className="w-9 font-mono text-[14px] font-medium tracking-wide">{a.iata}</span>
              <span className="min-w-0">
                <span className="block truncate text-[14px]">{a.city}</span>
                <span className="block truncate text-[12px] text-muted">{a.name}</span>
              </span>
            </li>
          ))}
          {!items.length && !isFetching && <li className="px-2.5 py-2 text-[13px] text-muted">No airport matches “{q}”. Try a city name or a 3-letter code.</li>}
          {!items.length && isFetching && <li className="px-2.5 py-2 text-[13px] text-muted">Searching…</li>}
        </ul>
      )}
    </div>
  )
}
