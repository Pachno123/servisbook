interface ServisBookLogoProps {
  size?: number
}

export default function ServisBookLogo({ size = 48 }: ServisBookLogoProps) {
  const gradId = `sb-grad-${size}`
  const scale = size / 48
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1e3a5f" />
          <stop offset="100%" stopColor="#e85d04" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="12" fill={`url(#${gradId})`} />
      {/* Flame icon */}
      <g transform={`translate(${24 - 9 * scale}, ${6}) scale(${scale * 0.75})`}>
        <path
          d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </g>
      {/* SB text */}
      <text
        x="24"
        y="44"
        textAnchor="middle"
        fill="white"
        fontSize="10"
        fontFamily="'Inter', system-ui, sans-serif"
        fontWeight="700"
        letterSpacing="1.5"
      >
        SB
      </text>
    </svg>
  )
}
