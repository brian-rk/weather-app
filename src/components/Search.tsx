import { useEffect, useId, useRef, useState } from 'react'
import { MagnifyingGlass, MapPin, X } from '@phosphor-icons/react'
import { searchPlaces, type Place } from '../lib/weather'

type Status = 'idle' | 'loading' | 'done' | 'error'

export function Search({ onSelect }: { onSelect: (p: Place) => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Place[]>([])
  const [status, setStatus] = useState<Status>('idle')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const listId = useId()
  const wrapRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const trimmed = query.trim()

  useEffect(() => {
    if (trimmed.length < 2) return
    const ctrl = new AbortController()
    const t = window.setTimeout(() => {
      setStatus('loading')
      searchPlaces(trimmed, ctrl.signal)
        .then((r) => {
          setResults(r)
          setActive(0)
          setStatus('done')
        })
        .catch((e: unknown) => {
          if ((e as Error).name !== 'AbortError') setStatus('error')
        })
    }, 220)
    return () => {
      window.clearTimeout(t)
      ctrl.abort()
    }
  }, [trimmed])

  useEffect(() => {
    const onDoc = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  const pick = (p: Place) => {
    onSelect(p)
    setQuery('')
    setResults([])
    setStatus('idle')
    setOpen(false)
    inputRef.current?.blur()
  }

  const showPanel = open && trimmed.length >= 2

  return (
    <div className="search" ref={wrapRef}>
      <label htmlFor={`${listId}-input`} className="sr-only">
        Search for a city
      </label>
      <input
        ref={inputRef}
        id={`${listId}-input`}
        type="text"
        role="combobox"
        aria-expanded={showPanel}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showPanel && results[active] ? `${listId}-${active}` : undefined}
        autoComplete="off"
        spellCheck={false}
        placeholder="Search a city"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
          if (e.target.value.trim().length < 2) setStatus('idle')
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setActive((a) => Math.min(a + 1, results.length - 1))
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setActive((a) => Math.max(a - 1, 0))
          } else if (e.key === 'Enter' && results[active]) {
            e.preventDefault()
            pick(results[active])
          } else if (e.key === 'Escape') {
            setOpen(false)
          }
        }}
      />
      {query ? (
        <button
          type="button"
          className="search-icon search-clear"
          onClick={() => {
            setQuery('')
            setStatus('idle')
            inputRef.current?.focus()
          }}
        >
          <X size={16} />
          <span className="sr-only">Clear search</span>
        </button>
      ) : (
        <span className="search-icon" aria-hidden="true">
          <MagnifyingGlass size={18} />
        </span>
      )}

      {showPanel && (
        <div className="search-panel" id={listId} role="listbox" aria-label="Matching places">
          {status === 'loading' && results.length === 0 && (
            <div className="search-note">
              <span className="skeleton-line" />
              <span className="skeleton-line short" />
            </div>
          )}
          {status === 'error' && (
            <p className="search-note">Couldn't reach the place search. Check your connection.</p>
          )}
          {status === 'done' && results.length === 0 && (
            <p className="search-note">No places match "{trimmed}". Try a nearby larger city.</p>
          )}
          {results.map((p, i) => (
            <div
              key={p.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              className="search-option"
              onPointerEnter={() => setActive(i)}
              onClick={() => pick(p)}
            >
              <MapPin size={16} aria-hidden="true" />
              <span>
                <strong>{p.name}</strong>
                <small>{p.region}</small>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
