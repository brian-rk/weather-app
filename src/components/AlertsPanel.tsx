import { BellSimple, CloudLightning, CloudRain, Drop, Snowflake, Sun, Thermometer, ThermometerCold, Wind } from '@phosphor-icons/react'
import { Sheet } from './Sheet'
import type { WeatherAlert } from '../lib/insights'
import type { AlertKind } from '../lib/prefs'
import { t } from '../lib/i18n'

const ICONS: Record<AlertKind, typeof Sun> = {
  storm: CloudLightning,
  rain: CloudRain,
  snow: Snowflake,
  wind: Wind,
  heat: Thermometer,
  frost: ThermometerCold,
  uv: Sun,
  air: Drop,
}

type Props = {
  open: boolean
  onClose: () => void
  side?: 'left' | 'right'
  alerts: WeatherAlert[]
  unread: Set<string>
  onMarkAllRead: () => void
  onOpenSettings: () => void
}

export function AlertsPanel({ open, onClose, side, alerts, unread, onMarkAllRead, onOpenSettings }: Props) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('Weather alerts')}
      side={side}
      icon={<BellSimple size={20} weight="duotone" aria-hidden="true" />}
    >
      {alerts.length === 0 ? (
        <div className="alerts-empty">
          <span className="alerts-calm" aria-hidden="true" />
          <p>
            <strong>{t('All clear.')}</strong> {t('Nothing to watch for in the next two days.')}
          </p>
        </div>
      ) : (
        <>
          <div className="alerts-bar">
            <p className="sheet-hint">{t('Worked out from the forecast for the next two days.')}</p>
            {unread.size > 0 && (
              <button type="button" className="btn-ghost btn-ghost--small" onClick={onMarkAllRead}>
                {t('Mark all read')}
              </button>
            )}
          </div>
          <ul className="alerts">
            {alerts.map((a, i) => {
              const Icon = ICONS[a.kind]
              return (
                <li
                  key={a.id}
                  className={`alert alert--${a.severity} ${unread.has(a.id) ? 'is-unread' : ''}`}
                  style={{ animationDelay: `${i * 70}ms` }}
                >
                  <span className="alert-icon" aria-hidden="true">
                    <Icon size={20} weight="duotone" />
                  </span>
                  <div>
                    <p className="alert-title">
                      {a.title}
                      {unread.has(a.id) && <span className="sr-only"> ({t('new')})</span>}
                    </p>
                    <p className="alert-body">{a.body}</p>
                  </div>
                </li>
              )
            })}
          </ul>
        </>
      )}
      <button type="button" className="btn-link" onClick={onOpenSettings}>
        {t('Choose which alerts you get')}
      </button>
    </Sheet>
  )
}
