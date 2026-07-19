import s from './shell.module.css';

export function Logo() {
  return (
    <svg className={s.logo} viewBox="0 0 64 64" role="img" aria-label="BlockCast logo">
      <defs>
        <linearGradient id="bc-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2563eb" />
          <stop offset="1" stopColor="#0ea5e9" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="14" fill="url(#bc-g)" />
      <g fill="#fff">
        {[
          [22, 19],
          [29, 19],
          [15, 26],
          [22, 26],
          [29, 26],
          [36, 26],
          [43, 26],
          [8, 33],
          [15, 33],
          [22, 33],
          [29, 33],
          [36, 33],
          [43, 33],
          [50, 33],
          [8, 40],
          [15, 40],
          [22, 40],
          [29, 40],
        ].map(([x, y]) => (
          <rect key={`${x}-${y}`} x={x} y={y} width="6" height="6" rx="1.8" />
        ))}
      </g>
      <rect x="36" y="40" width="6" height="6" rx="1.8" fill="#4ade80" />
      <rect x="43" y="40" width="6" height="6" rx="1.8" fill="#fbbf24" />
      <rect x="50" y="40" width="6" height="6" rx="1.8" fill="#f87171" />
    </svg>
  );
}
