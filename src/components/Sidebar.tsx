import type { RefObject } from 'react'
import {
  ArrowClockwise,
  CircleHalf,
  Crosshair,
  MapTrifold,
  SquaresFour,
  Star,
} from '@phosphor-icons/react'

type Props = {
  mapExpanded: boolean
  onToggleMap: () => void
  onLocate: () => void
  locating: boolean
  onRefresh: () => void
  refreshing: boolean
  savedOpen: boolean
  onToggleSaved: () => void
  savedRef: RefObject<HTMLButtonElement | null>
  themeOpen: boolean
  onToggleTheme: () => void
  themeRef: RefObject<HTMLButtonElement | null>
}

export function Sidebar({
  mapExpanded,
  onToggleMap,
  onLocate,
  locating,
  onRefresh,
  refreshing,
  savedOpen,
  onToggleSaved,
  savedRef,
  themeOpen,
  onToggleTheme,
  themeRef,
}: Props) {
  return (
    <nav className="sidebar" aria-label="Primary">
      <div className="brand" aria-label="Nimbus">
        <svg viewBox="0 0 40 32" aria-hidden="true">
          <path
            d="M10 30C4.5 30 1 26.4 1 21.8c0-4 2.9-7.3 6.8-8C8.9 7.6 14 3 20.2 3c5.4 0 10 3.5 11.6 8.4C36 12.3 39 16 39 20.4 39 25.7 34.8 30 29.5 30Z"
            fill="var(--accent)"
          />
          <path
            d="M13 20.5c2 2.4 4.6 3.6 7.2 3.6s5.2-1.2 7.2-3.6"
            fill="none"
            stroke="var(--surface)"
            strokeWidth="2.6"
            strokeLinecap="round"
          />
        </svg>
      </div>

      <ul className="side-nav">
        <li>
          <button
            type="button"
            className="side-btn"
            aria-current={!mapExpanded ? 'page' : undefined}
            onClick={() => mapExpanded && onToggleMap()}
            title="Overview"
          >
            <SquaresFour size={20} weight={!mapExpanded ? 'fill' : 'regular'} />
            <span className="sr-only">Overview</span>
          </button>
        </li>
        <li>
          <button
            type="button"
            className="side-btn"
            aria-current={mapExpanded ? 'page' : undefined}
            onClick={() => !mapExpanded && onToggleMap()}
            title="Map"
          >
            <MapTrifold size={20} weight={mapExpanded ? 'fill' : 'regular'} />
            <span className="sr-only">Map</span>
          </button>
        </li>
        <li>
          <button
            ref={savedRef}
            type="button"
            className="side-btn"
            aria-expanded={savedOpen}
            aria-haspopup="dialog"
            onClick={onToggleSaved}
            title="Saved cities"
          >
            <Star size={20} weight={savedOpen ? 'fill' : 'regular'} />
            <span className="sr-only">Saved cities</span>
          </button>
        </li>
        <li>
          <button
            type="button"
            className="side-btn"
            onClick={onLocate}
            disabled={locating}
            title="Use my location"
          >
            <Crosshair size={20} className={locating ? 'spin' : undefined} />
            <span className="sr-only">Use my location</span>
          </button>
        </li>
      </ul>

      <div className="side-bottom">
        <button
          ref={themeRef}
          type="button"
          className="side-btn"
          aria-expanded={themeOpen}
          aria-haspopup="dialog"
          onClick={onToggleTheme}
          title="Appearance"
        >
          <CircleHalf size={20} weight={themeOpen ? 'fill' : 'regular'} />
          <span className="sr-only">Appearance</span>
        </button>
        <button type="button" className="side-btn" onClick={onRefresh} disabled={refreshing} title="Refresh">
          <ArrowClockwise size={20} className={refreshing ? 'spin' : undefined} />
          <span className="sr-only">Refresh forecast</span>
        </button>
      </div>
    </nav>
  )
}
