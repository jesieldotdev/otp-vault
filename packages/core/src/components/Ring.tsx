interface RingProps {
  rem: number
  period?: number
  color: string
}

export function Ring({ rem, period = 30, color }: RingProps) {
  const r = 16
  const circ = 2 * Math.PI * r
  const urgent = rem <= 6
  const strokeColor = urgent ? 'var(--danger)' : color

  return (
    <svg
      width={40}
      height={40}
      aria-label={`${rem} segundos restantes`}
      style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}
    >
      <circle
        cx={20} cy={20} r={r}
        fill="none"
        stroke="rgba(255,255,255,0.07)"
        strokeWidth={3}
      />
      <circle
        cx={20} cy={20} r={r}
        fill="none"
        stroke={strokeColor}
        strokeWidth={3}
        strokeDasharray={`${(rem / period) * circ} ${circ}`}
        style={{ transition: 'stroke-dasharray 1s linear, stroke 0.3s' }}
      />
      <text
        x={20} y={20}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={10}
        fontWeight={700}
        fill={urgent ? 'var(--danger)' : 'rgba(255,255,255,0.6)'}
        style={{
          transform: 'rotate(90deg)',
          transformOrigin: '20px 20px',
          fontFamily: 'var(--font-mono)',
        }}
      >
        {rem}
      </text>
    </svg>
  )
}
