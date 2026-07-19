import s from './shell.module.css';

// Letterpress mark: a cream block-mosaic cloud stamped on warm ink, with the
// three risk tones set into the last row — the whole product in one glyph.
export function Logo() {
  return (
    <svg className={s.logo} viewBox="0 0 64 64" role="img" aria-label="BlockCast logo">
      <rect width="64" height="64" rx="13" fill="#241f16" />
      <rect x="0.5" y="0.5" width="63" height="63" rx="12.5" fill="none" stroke="#f4f0e6" strokeOpacity="0.14" />
      <g fill="#f4f0e6">
        {[
          [22, 18],
          [29, 18],
          [15, 25],
          [22, 25],
          [29, 25],
          [36, 25],
          [43, 25],
          [8, 32],
          [15, 32],
          [22, 32],
          [29, 32],
          [36, 32],
          [43, 32],
          [50, 32],
          [8, 39],
          [15, 39],
          [22, 39],
          [29, 39],
        ].map(([x, y]) => (
          <rect key={`${x}-${y}`} x={x} y={y} width="6" height="6" rx="1.6" />
        ))}
      </g>
      <rect x="36" y="39" width="6" height="6" rx="1.6" fill="#4c9a5d" />
      <rect x="43" y="39" width="6" height="6" rx="1.6" fill="#cf8a1e" />
      <rect x="50" y="39" width="6" height="6" rx="1.6" fill="#cd5248" />
    </svg>
  );
}
