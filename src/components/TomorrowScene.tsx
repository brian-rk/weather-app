import type { Outfit } from '../lib/outfit'

const SKIN = '#c98e6a'
const HAIR = '#2b2b33'
const TROUSERS = '#2a3550'
const BENCH = '#2f3b55'

/**
 * A traveller waiting on a bench with a suitcase, dressed for tomorrow's
 * weather. Original illustration drawn in SVG so it can change outfit.
 */
export function TomorrowScene({ outfit, className }: { outfit: Outfit; className?: string }) {
  const jacket = outfit === 'sun' ? '#3aa39a' : outfit === 'cold' || outfit === 'snow' ? '#5b6fd8' : '#f08a3c'
  const jacketShade = outfit === 'sun' ? '#2c847c' : outfit === 'cold' || outfit === 'snow' ? '#4757b8' : '#d46f26'
  const umbrellaOpen = outfit === 'rain' || outfit === 'snow'

  return (
    <svg viewBox="0 0 220 220" className={['scene', `scene--${outfit}`, className].filter(Boolean).join(' ')} aria-hidden="true">
      {/* Ground */}
      <ellipse cx="128" cy="204" rx="92" ry="7" fill="oklch(0 0 0 / 0.12)" />

      {/* Closed umbrella leaning on the bench */}
      {outfit === 'mild' && (
        <g className="scene-leaning">
          <line x1="54" y1="200" x2="74" y2="118" stroke="#2b2b33" strokeWidth="3" strokeLinecap="round" />
          <path d="M70 128 C 62 150 58 170 60 186 L 66 186 C 70 170 74 150 76 130 Z" fill="#e8763a" />
          <path d="M54 200 q -6 2 -6 -6" fill="none" stroke="#2b2b33" strokeWidth="3" strokeLinecap="round" />
        </g>
      )}

      {/* Bench */}
      <rect x="40" y="114" width="118" height="9" rx="4" fill={BENCH} />
      <rect x="40" y="128" width="118" height="9" rx="4" fill={BENCH} />
      <rect x="34" y="152" width="132" height="10" rx="4" fill={BENCH} />
      <rect x="46" y="160" width="8" height="40" rx="3" fill={BENCH} />
      <rect x="146" y="160" width="8" height="40" rx="3" fill={BENCH} />
      <rect x="50" y="114" width="6" height="40" rx="3" fill={BENCH} />
      <rect x="142" y="114" width="6" height="40" rx="3" fill={BENCH} />

      {/* Suitcase */}
      <g className="scene-case">
        <path d="M176 120 v -10 a 4 4 0 0 1 4 -4 h 12 a 4 4 0 0 1 4 4 v 10" fill="none" stroke="#5c677a" strokeWidth="4" />
        <rect x="166" y="118" width="40" height="78" rx="7" fill="#9aa6b8" />
        <rect x="174" y="126" width="5" height="62" rx="2.5" fill="#808ca0" />
        <rect x="186" y="126" width="5" height="62" rx="2.5" fill="#808ca0" />
        <rect x="198" y="126" width="3" height="62" rx="1.5" fill="#808ca0" />
        <circle cx="172" cy="199" r="4" fill="#3d4556" />
        <circle cx="200" cy="199" r="4" fill="#3d4556" />
      </g>

      {/* Person */}
      <g className="scene-person">
        {/* Legs (seated) */}
        <path d="M96 150 H 128 V 192" fill="none" stroke={TROUSERS} strokeWidth="15" strokeLinejoin="round" strokeLinecap="round" />
        <path d="M104 150 H 122 V 192" fill="none" stroke="#243049" strokeWidth="6" strokeLinejoin="round" opacity="0.35" />
        <ellipse cx="134" cy="196" rx="12" ry="5.5" fill="#1d2230" />

        <g className="scene-breathe">
          {/* Torso */}
          <path d="M86 108 q 0 -12 14 -12 h 10 q 14 0 14 12 v 42 h -38 z" fill={jacket} />
          <path d="M105 98 v 52" stroke={jacketShade} strokeWidth="2" />
          {outfit === 'sun' && <path d="M98 97 l 7 8 l 7 -8" fill="none" stroke="#f4e9d8" strokeWidth="3" strokeLinecap="round" />}

          {/* Arm resting on lap */}
          <path d="M90 112 q -4 22 10 34 h 14" fill="none" stroke={jacketShade} strokeWidth="9" strokeLinecap="round" />
          <circle cx="116" cy="146" r="5" fill={SKIN} />

          {/* Neck + head */}
          <rect x="101" y="88" width="8" height="10" rx="3" fill={SKIN} />
          <circle cx="105" cy="78" r="13" fill={SKIN} />
          <path d="M92 76 q 0 -16 14 -16 q 14 0 13 14 q -4 -6 -9 -6 q -2 4 -8 4 q -5 0 -10 4 z" fill={HAIR} />
          <circle cx="100" cy="80" r="1.5" fill="#3a2a22" />
          <circle cx="110" cy="80" r="1.5" fill="#3a2a22" />
          <path d="M101.5 86 q 3.5 2.5 7 0" fill="none" stroke="#8a5a43" strokeWidth="1.5" strokeLinecap="round" />

          {outfit === 'sun' && (
            <g className="scene-shades">
              <rect x="95" y="76" width="9" height="6" rx="2.5" fill="#1d2230" />
              <rect x="106" y="76" width="9" height="6" rx="2.5" fill="#1d2230" />
              <path d="M104 78 h 2" stroke="#1d2230" strokeWidth="1.5" />
              <path className="scene-glint" d="M97 77.5 l 3 0" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" />
              <path d="M90 68 q 15 -12 30 0 l 6 2 q -3 3 -8 1 q -14 -6 -28 -3 z" fill="#f2c14e" />
            </g>
          )}

          {(outfit === 'cold' || outfit === 'snow') && (
            <g>
              <path d="M92 70 q 0 -18 13 -18 q 13 0 13 18 z" fill="#e05a4f" />
              <rect x="91" y="67" width="28" height="6" rx="3" fill="#c94a40" />
              <circle cx="105" cy="51" r="4" fill="#f4e9d8" />
              <path d="M95 96 q 10 6 20 0 v 6 q -10 6 -20 0 z" fill="#e05a4f" />
              <path d="M110 100 l 4 16 h -6 l -2 -14 z" fill="#c94a40" />
            </g>
          )}

          {/* Arm holding the umbrella, or relaxed */}
          {umbrellaOpen ? (
            <>
              <path d="M120 108 q 10 8 12 18" fill="none" stroke={jacket} strokeWidth="9" strokeLinecap="round" />
              <circle cx="132" cy="126" r="5" fill={SKIN} />
            </>
          ) : (
            <path d="M120 110 q 6 20 -2 36" fill="none" stroke={jacket} strokeWidth="9" strokeLinecap="round" />
          )}
        </g>
      </g>

      {/* Open umbrella */}
      {umbrellaOpen && (
        <g className="scene-umbrella">
          <line x1="132" y1="132" x2="122" y2="44" stroke="#2b2b33" strokeWidth="2.5" strokeLinecap="round" />
          <path
            d="M64 58 Q 122 -6 180 58 Q 166 49 151 58 Q 136 49 122 58 Q 108 49 93 58 Q 78 49 64 58 Z"
            fill="#e8763a"
          />
          <path d="M122 14 Q 108 30 93 58 M122 14 Q 136 30 151 58" fill="none" stroke="#c95e25" strokeWidth="1.5" />
          <path d="M122 14 v -5" stroke="#2b2b33" strokeWidth="2.5" strokeLinecap="round" />
          {/* Drops sliding off the rim */}
          {outfit === 'rain' &&
            [64, 93, 151, 180].map((x, i) => (
              <circle key={x} className="scene-drip" cx={x} cy={60} r="2" fill="#5aa6d6" style={{ animationDelay: `${i * 0.35}s` }} />
            ))}
          {outfit === 'snow' && (
            <path d="M80 50 q 20 -14 42 -16 q 22 2 42 16" fill="none" stroke="#f4f7fb" strokeWidth="4" strokeLinecap="round" />
          )}
        </g>
      )}
    </svg>
  )
}
