import type { CSSProperties } from 'react'
import {
  ArrowClockwise,
  CalendarBlank,
  ChatCircleText,
  GearSix,
  ListChecks,
  MapTrifold,
  SidebarSimple,
  SquaresFour,
  Star,
} from '@phosphor-icons/react'

export type NavId = 'dashboard' | 'briefing' | 'map' | 'calendar' | 'planner' | 'saved' | 'settings'

const ITEMS: { id: NavId; label: string; icon: typeof Star; mobile: boolean }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: SquaresFour, mobile: true },
  { id: 'briefing', label: 'Briefing', icon: ChatCircleText, mobile: false },
  { id: 'map', label: 'Map', icon: MapTrifold, mobile: true },
  { id: 'calendar', label: 'Calendar', icon: CalendarBlank, mobile: false },
  { id: 'planner', label: 'Plan your day', icon: ListChecks, mobile: true },
  { id: 'saved', label: 'Saved cities', icon: Star, mobile: true },
  { id: 'settings', label: 'Settings', icon: GearSix, mobile: true },
]

type Props = {
  active: NavId
  onNav: (id: NavId) => void
  expanded: boolean
  onToggleExpanded: () => void
  onRefresh: () => void
  refreshing: boolean
}

export function Sidebar({ active, onNav, expanded, onToggleExpanded, onRefresh, refreshing }: Props) {
  const index = Math.max(
    ITEMS.findIndex((i) => i.id === active),
    0,
  )
  return (
    <nav className={`sidebar ${expanded ? 'is-expanded' : ''}`} aria-label="Primary">
      <div className="brand">
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
        <span className="brand-name">Nimbus</span>
      </div>

      <ul className="side-nav" style={{ '--active': index } as CSSProperties}>
        <span className="side-arrow" aria-hidden="true" />
        {ITEMS.map((item) => {
          const Icon = item.icon
          const on = item.id === active
          const isPanel = item.id !== 'dashboard' && item.id !== 'map'
          return (
            <li key={item.id} className={item.mobile ? undefined : 'hide-mobile'}>
              <button
                type="button"
                className="side-btn"
                aria-current={on && !isPanel ? 'page' : undefined}
                aria-expanded={isPanel ? on : undefined}
                aria-haspopup={isPanel ? 'dialog' : undefined}
                data-panel-trigger
                data-active={on || undefined}
                onClick={() => onNav(item.id)}
                title={expanded ? undefined : item.label}
              >
                <Icon size={20} weight={on ? 'fill' : 'regular'} />
                <span className="side-label">{item.label}</span>
              </button>
            </li>
          )
        })}
      </ul>

      <div className="side-bottom">
        <button type="button" className="side-btn" onClick={onRefresh} disabled={refreshing} title={expanded ? undefined : 'Refresh'}>
          <ArrowClockwise size={20} className={refreshing ? 'spin' : undefined} />
          <span className="side-label">Refresh</span>
        </button>
        <button
          type="button"
          className="side-btn hide-mobile"
          onClick={onToggleExpanded}
          aria-pressed={expanded}
          title={expanded ? undefined : 'Expand sidebar'}
        >
          <SidebarSimple size={20} className="side-toggle-icon" />
          <span className="side-label">Collapse</span>
          <span className="sr-only">{expanded ? '' : 'Expand sidebar'}</span>
        </button>
      </div>
    </nav>
  )
}
