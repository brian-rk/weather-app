import { Bicycle, CheckCircle, CookingPot, Dog, ListChecks, PersonSimpleRun, Star, TShirt, XCircle } from '@phosphor-icons/react'
import { Sheet } from './Sheet'
import type { Plan } from '../lib/insights'
import { t } from '../lib/i18n'

const ICONS: Record<string, typeof Star> = {
  run: PersonSimpleRun,
  cycle: Bicycle,
  walk: Dog,
  laundry: TShirt,
  bbq: CookingPot,
  stars: Star,
}

type Props = {
  open: boolean
  onClose: () => void
  side?: 'left' | 'right'
  plans: Plan[]
  dayLabel: string
}

/** Best time of day for common outdoor plans, scored from rain, wind, UV, temperature and cloud. */
export function PlannerPanel({ open, onClose, side, plans, dayLabel }: Props) {
  const sorted = [...plans].sort((a, b) => b.score - a.score)
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('Plan your day')}
      side={side}
      icon={<ListChecks size={20} weight="duotone" aria-hidden="true" />}
    >
      <p className="sheet-hint">{t('Best windows for {day}, from rain, wind, UV, temperature and cloud.', { day: dayLabel })}</p>
      <ul className="plans">
        {sorted.map((p, i) => {
          const Icon = ICONS[p.id] ?? Star
          const Mark = p.verdict === 'poor' ? XCircle : CheckCircle
          return (
            <li key={p.id} className={`plan plan--${p.verdict}`} style={{ animationDelay: `${i * 60}ms` }}>
              <span className="plan-icon" aria-hidden="true">
                <Icon size={22} weight="duotone" />
              </span>
              <div className="plan-copy">
                <p className="plan-title">
                  {p.label}
                  <Mark size={16} weight="fill" aria-hidden="true" />
                  <span className="sr-only">{p.verdict === 'poor' ? ` (${t('not advised')})` : ` (${t(p.verdict)})`}</span>
                </p>
                <p className="plan-when">{p.window ?? p.reason}</p>
                {p.window && <p className="plan-why">{p.reason}</p>}
                <span className="plan-meter" aria-hidden="true">
                  <span style={{ transform: `scaleX(${Math.max(p.score, 0.04)})`, animationDelay: `${200 + i * 60}ms` }} />
                </span>
              </div>
            </li>
          )
        })}
      </ul>
    </Sheet>
  )
}
