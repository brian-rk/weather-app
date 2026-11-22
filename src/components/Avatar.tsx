import type { CSSProperties } from 'react'

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return ''
  return (parts[0][0] + (parts.length > 1 ? parts.at(-1)![0] : '')).toUpperCase()
}

export function Avatar({ name, color, photo, size = 44 }: { name: string; color: string; photo: string | null; size?: number }) {
  const style = { '--avatar-bg': color, width: size, height: size, fontSize: size * 0.38 } as CSSProperties
  if (photo) return <img className="avatar" src={photo} alt="" width={size} height={size} style={style} />
  const text = initials(name)
  return (
    <span className="avatar" style={style} aria-hidden="true">
      {text || (
        <svg viewBox="0 0 24 24" width={size * 0.5} height={size * 0.5}>
          <circle cx="12" cy="8.5" r="4" fill="currentColor" />
          <path d="M4 20.5c1.2-4 4.4-6 8-6s6.8 2 8 6" fill="currentColor" />
        </svg>
      )}
    </span>
  )
}
