import { useEffect, useRef, useState } from 'react'
import { Copy, DownloadSimple, LinkSimple, ShareNetwork } from '@phosphor-icons/react'
import { Sheet } from './Sheet'
import { canvasToBlob, renderShareCard, type CardFormat, type CardStyle } from '../lib/shareCard'
import { t } from '../lib/i18n'
import type { Forecast, Place, Units } from '../lib/weather'

type Props = {
  open: boolean
  onClose: () => void
  side?: 'left' | 'right'
  place: Place
  forecast: Forecast | null
  units: Units
  onCopyLink: () => void
}

/** Preview, download, share or copy a picture of the current forecast. */
export function SharePanel({ open, onClose, side, place, forecast, units, onCopyLink }: Props) {
  const [style, setStyle] = useState<CardStyle>('sky')
  const [format, setFormat] = useState<CardFormat>('square')
  const [url, setUrl] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    if (!open || !forecast) return
    let cancelled = false
    setBusy(true)
    setNote(null)
    renderShareCard({ place, forecast, units, style, format })
      .then((canvas) => {
        if (cancelled) return
        canvasRef.current = canvas
        setUrl(canvas.toDataURL('image/png'))
        setBusy(false)
      })
      .catch(() => {
        if (cancelled) return
        setBusy(false)
        setNote(t("Couldn't draw the card. Try again."))
      })
    return () => {
      cancelled = true
    }
  }, [open, forecast, place, units, style, format])

  const fileName = `weather-${place.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`

  const download = () => {
    if (!url) return
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    a.click()
  }

  const shareImage = async () => {
    if (!canvasRef.current) return
    try {
      const blob = await canvasToBlob(canvasRef.current)
      const file = new File([blob], fileName, { type: 'image/png' })
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: t('Weather in {place}', { place: place.name }) })
      } else {
        download()
        setNote(t('Sharing images isn’t supported here, so the picture was downloaded instead.'))
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setNote(t("Couldn't share the picture."))
    }
  }

  const copyImage = async () => {
    if (!canvasRef.current) return
    try {
      const blob = await canvasToBlob(canvasRef.current)
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
      setNote(t('Picture copied. Paste it into a chat or post.'))
    } catch {
      setNote(t("This browser can't copy pictures. Use Download instead."))
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={t('Share')} side={side} icon={<ShareNetwork size={20} weight="duotone" aria-hidden="true" />}>
      <div className={`share-preview share-preview--${format}`} aria-busy={busy}>
        {url ? (
          <img src={url} alt={t('Weather card for {place}', { place: place.name })} className={busy ? 'is-busy' : ''} />
        ) : (
          <span className="skeleton share-skeleton" />
        )}
      </div>

      <div className="share-options">
        <div className="seg" role="radiogroup" aria-label={t('Card style')}>
          {(['sky', 'light', 'dark'] as const).map((s) => (
            <button key={s} type="button" role="radio" aria-checked={style === s} onClick={() => setStyle(s)}>
              {s === 'sky' ? t('Sky') : s === 'light' ? t('Light') : t('Dark')}
            </button>
          ))}
        </div>
        <div className="seg" role="radiogroup" aria-label={t('Card size')}>
          {(['square', 'story'] as const).map((f) => (
            <button key={f} type="button" role="radio" aria-checked={format === f} onClick={() => setFormat(f)}>
              {f === 'square' ? t('Post') : t('Story')}
            </button>
          ))}
        </div>
      </div>

      <div className="share-actions">
        <button type="button" className="btn-primary" onClick={download} disabled={!url}>
          <DownloadSimple size={18} aria-hidden="true" /> {t('Download')}
        </button>
        <button type="button" className="btn-ghost" onClick={shareImage} disabled={!url}>
          <ShareNetwork size={16} aria-hidden="true" /> {t('Share picture')}
        </button>
        <button type="button" className="btn-ghost" onClick={copyImage} disabled={!url}>
          <Copy size={16} aria-hidden="true" /> {t('Copy picture')}
        </button>
        <button type="button" className="btn-ghost" onClick={onCopyLink}>
          <LinkSimple size={16} aria-hidden="true" /> {t('Copy link')}
        </button>
      </div>
      {note && (
        <p className="sheet-hint" role="status">
          {note}
        </p>
      )}
    </Sheet>
  )
}
