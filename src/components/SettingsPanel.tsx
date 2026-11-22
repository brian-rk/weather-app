import { useId, useRef, useState, type ReactNode } from 'react'
import { Camera, GearSix, Trash } from '@phosphor-icons/react'
import { Sheet } from './Sheet'
import { Avatar } from './Avatar'
import { THEME_OPTIONS, type ThemeSetting } from '../lib/theme'
import { ALERT_KINDS, AVATAR_COLORS, type Prefs } from '../lib/prefs'
import type { Place } from '../lib/weather'

type Props = {
  open: boolean
  onClose: () => void
  side?: 'left' | 'right'
  prefs: Prefs
  onChange: (next: Prefs) => void
  theme: ThemeSetting
  onTheme: (t: ThemeSetting, origin?: { x: number; y: number }) => void
  current: Place
}

function Segmented<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: { id: T; label: string }[]
  onChange: (v: T) => void
}) {
  const id = useId()
  return (
    <div className="field">
      <span id={id} className="field-label">
        {label}
      </span>
      <div className="seg" role="radiogroup" aria-labelledby={id}>
        {options.map((o) => (
          <button key={String(o.id)} type="button" role="radio" aria-checked={value === o.id} onClick={() => onChange(o.id)}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="settings-section">
      <h3>{title}</h3>
      {children}
    </section>
  )
}

/** Resize an uploaded image to a small square avatar (keeps localStorage light). */
function toAvatar(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const size = 128
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = size
      const ctx = canvas.getContext('2d')!
      const s = Math.min(img.width, img.height)
      ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', 0.85))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('That file could not be read as an image.'))
    }
    img.src = url
  })
}

export function SettingsPanel({ open, onClose, side, prefs, onChange, theme, onTheme, current }: Props) {
  const set = <K extends keyof Prefs>(k: K, v: Prefs[K]) => onChange({ ...prefs, [k]: v })
  const fileRef = useRef<HTMLInputElement>(null)
  const nameId = useId()
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [notifyNote, setNotifyNote] = useState<string | null>(null)

  const toggleNotify = async (on: boolean) => {
    setNotifyNote(null)
    if (!on) return set('notify', false)
    if (!('Notification' in window)) return setNotifyNote('This browser does not support notifications.')
    const result = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission()
    if (result === 'granted') set('notify', true)
    else setNotifyNote('Notifications are blocked. Allow them in your browser settings to turn this on.')
  }

  return (
    <Sheet open={open} onClose={onClose} title="Settings" side={side} icon={<GearSix size={20} weight="duotone" aria-hidden="true" />}>
      <Section title="Profile">
        <div className="profile-row">
          <Avatar name={prefs.name} color={prefs.color} photo={prefs.photo} size={56} />
          <div className="profile-actions">
            <button type="button" className="btn-ghost btn-ghost--small" onClick={() => fileRef.current?.click()}>
              <Camera size={16} aria-hidden="true" /> {prefs.photo ? 'Change photo' : 'Add photo'}
            </button>
            {prefs.photo && (
              <button type="button" className="btn-ghost btn-ghost--small" onClick={() => set('photo', null)}>
                <Trash size={16} aria-hidden="true" /> Remove
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={async (e) => {
                const file = e.target.files?.[0]
                e.target.value = ''
                if (!file) return
                try {
                  setPhotoError(null)
                  set('photo', await toAvatar(file))
                } catch (err) {
                  setPhotoError((err as Error).message)
                }
              }}
            />
          </div>
        </div>
        {photoError && <p className="field-error">{photoError}</p>}
        <div className="field">
          <label htmlFor={nameId} className="field-label">
            Your name
          </label>
          <input
            id={nameId}
            className="input"
            value={prefs.name}
            maxLength={40}
            placeholder="Shown in the greeting"
            onChange={(e) => set('name', e.target.value)}
          />
          <span className="field-help">Stored only in this browser.</span>
        </div>
        {!prefs.photo && (
          <div className="field">
            <span className="field-label">Avatar colour</span>
            <div className="swatches" role="radiogroup" aria-label="Avatar colour">
              {AVATAR_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={prefs.color === c}
                  aria-label={c}
                  className="swatch"
                  style={{ background: c }}
                  onClick={() => set('color', c)}
                />
              ))}
            </div>
          </div>
        )}
      </Section>

      <Section title="Units">
        <Segmented
          label="Temperature"
          value={prefs.temp}
          options={[
            { id: 'c', label: '°C' },
            { id: 'f', label: '°F' },
          ]}
          onChange={(v) => set('temp', v)}
        />
        <Segmented
          label="Wind"
          value={prefs.wind}
          options={[
            { id: 'kmh', label: 'km/h' },
            { id: 'mph', label: 'mph' },
            { id: 'ms', label: 'm/s' },
          ]}
          onChange={(v) => set('wind', v)}
        />
        <Segmented
          label="Pressure"
          value={prefs.pressure}
          options={[
            { id: 'hPa', label: 'hPa' },
            { id: 'inHg', label: 'inHg' },
          ]}
          onChange={(v) => set('pressure', v)}
        />
        <Segmented
          label="Time"
          value={prefs.clock}
          options={[
            { id: '24', label: '24-hour' },
            { id: '12', label: '12-hour' },
          ]}
          onChange={(v) => set('clock', v)}
        />
      </Section>

      <Section title="Start-up">
        <Segmented
          label="Open with"
          value={prefs.startWith}
          options={[
            { id: 'last', label: 'Last city viewed' },
            { id: 'home', label: 'Home city' },
          ]}
          onChange={(v) => onChange({ ...prefs, startWith: v, home: v === 'home' && !prefs.home ? current : prefs.home })}
        />
        {prefs.startWith === 'home' && (
          <div className="field">
            <span className="field-label">Home city</span>
            <div className="home-row">
              <strong>{prefs.home?.name ?? current.name}</strong>
              {prefs.home?.id !== current.id && (
                <button type="button" className="btn-ghost btn-ghost--small" onClick={() => set('home', current)}>
                  Use {current.name}
                </button>
              )}
            </div>
          </div>
        )}
        <Segmented
          label="Refresh automatically"
          value={prefs.refreshMin}
          options={[
            { id: 5, label: '5 min' },
            { id: 15, label: '15 min' },
            { id: 30, label: '30 min' },
            { id: 0, label: 'Off' },
          ]}
          onChange={(v) => set('refreshMin', v)}
        />
      </Section>

      <Section title="Appearance">
        <div className="theme-cards" role="radiogroup" aria-label="Theme">
          {THEME_OPTIONS.map((o) => (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={theme === o.id}
              className={`theme-card theme-card--${o.id}`}
              onClick={(e) => onTheme(o.id, { x: e.clientX, y: e.clientY })}
            >
              <span className="theme-swatch" aria-hidden="true" />
              <strong>{o.label}</strong>
              <small>{o.hint}</small>
            </button>
          ))}
        </div>
      </Section>

      <Section title="Alerts">
        <ul className="toggles">
          {ALERT_KINDS.map((k) => (
            <li key={k.id}>
              <label className="toggle">
                <span>{k.label}</span>
                <input
                  type="checkbox"
                  role="switch"
                  checked={prefs.alerts[k.id]}
                  onChange={(e) => set('alerts', { ...prefs.alerts, [k.id]: e.target.checked })}
                />
                <span className="toggle-track" aria-hidden="true" />
              </label>
            </li>
          ))}
          <li>
            <label className="toggle">
              <span>
                Browser notifications
                <small>Get a notification when a new alert appears</small>
              </span>
              <input type="checkbox" role="switch" checked={prefs.notify} onChange={(e) => toggleNotify(e.target.checked)} />
              <span className="toggle-track" aria-hidden="true" />
            </label>
          </li>
        </ul>
        {notifyNote && <p className="field-error">{notifyNote}</p>}
      </Section>
    </Sheet>
  )
}
