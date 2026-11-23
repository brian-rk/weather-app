import { BellSimple, CalendarBlank, ChatCircleText, Command } from '@phosphor-icons/react'
import { Avatar } from './Avatar'
import { Search } from './Search'
import { t } from '../lib/i18n'
import type { Place, Units } from '../lib/weather'
import type { Prefs } from '../lib/prefs'

type Props = {
  prefs: Prefs
  greeting: string
  status: string
  onSelect: (p: Place) => void
  onLocate: () => void
  locating: boolean
  units: Units
  onUnits: (u: Units) => void
  unreadAlerts: number
  bellRing: number
  open: string | null
  onOpen: (id: 'calendar' | 'briefing' | 'alerts' | 'settings') => void
  onPalette: () => void
}

export function Header({
  prefs,
  greeting,
  status,
  onSelect,
  onLocate,
  locating,
  units,
  onUnits,
  unreadAlerts,
  bellRing,
  open,
  onOpen,
  onPalette,
}: Props) {
  const first = prefs.name.trim()
  return (
    <header className="topbar">
      <div className="hello">
        <button type="button" className="hello-avatar" onClick={() => onOpen('settings')} data-panel-trigger title={t('Profile and settings')}>
          <Avatar name={prefs.name} color={prefs.color} photo={prefs.photo} />
          <span className="sr-only">{t('Open profile settings')}</span>
        </button>
        <div>
          <p className="muted">
            {t(greeting)}
            {status && <span className="status" aria-live="polite"> · {status}</span>}
          </p>
          {first ? (
            <h1>{first}</h1>
          ) : (
            <h1>
              <button type="button" className="hello-name" onClick={() => onOpen('settings')} data-panel-trigger>
                {t('Add your name')}
              </button>
            </h1>
          )}
        </div>
      </div>

      <Search onSelect={onSelect} onLocate={onLocate} locating={locating} />

      <div className="topbar-actions">
        <button
          type="button"
          className="icon-btn icon-btn--soft hide-mobile palette-btn"
          onClick={onPalette}
          title={t('Command palette (Ctrl+K)')}
        >
          <Command size={19} />
          <span className="sr-only">{t('Command palette')}</span>
        </button>
        <button
          type="button"
          className="icon-btn icon-btn--soft"
          onClick={() => onOpen('calendar')}
          aria-expanded={open === 'calendar'}
          aria-haspopup="dialog"
          data-panel-trigger
          title={t('Forecast calendar')}
        >
          <CalendarBlank size={19} />
          <span className="sr-only">{t('Forecast calendar')}</span>
        </button>
        <button
          type="button"
          className="icon-btn icon-btn--soft"
          onClick={() => onOpen('briefing')}
          aria-expanded={open === 'briefing'}
          aria-haspopup="dialog"
          data-panel-trigger
          title={t('Daily briefing')}
        >
          <ChatCircleText size={19} />
          <span className="sr-only">{t('Daily briefing')}</span>
        </button>
        <button
          key={bellRing}
          type="button"
          className={`icon-btn icon-btn--soft bell ${unreadAlerts > 0 ? 'has-unread' : ''}`}
          onClick={() => onOpen('alerts')}
          aria-expanded={open === 'alerts'}
          aria-haspopup="dialog"
          data-panel-trigger
          title={t('Weather alerts')}
        >
          <BellSimple size={19} weight={unreadAlerts ? 'fill' : 'regular'} />
          {unreadAlerts > 0 && (
            <span className="bell-badge" aria-hidden="true">
              {unreadAlerts}
            </span>
          )}
          <span className="sr-only">
            {t('Weather alerts')}
            {unreadAlerts ? `, ${t('{n} new', { n: unreadAlerts })}` : ''}
          </span>
        </button>
        <div className="units" role="radiogroup" aria-label={t('Temperature unit')}>
          {(['metric', 'imperial'] as const).map((u) => (
            <button key={u} type="button" role="radio" aria-checked={units === u} onClick={() => onUnits(u)}>
              °{u === 'metric' ? 'C' : 'F'}
            </button>
          ))}
        </div>
      </div>
    </header>
  )
}
