/**
 * Minimal folder glyph with a very soft 3D feel (back panel, front panel, tab highlight).
 * Pure SVG — no bitmap, no filters heavier than a single drop shadow — tinted by `accent`.
 */
interface Props {
  accent: string;
  size?: number;
  className?: string;
}

export function FolderIcon({ accent, size = 64, className }: Props) {
  const id = `folder-${accent.replace("#", "")}`;
  return (
    <svg
      className={className}
      width={size}
      height={size * 0.8}
      viewBox="0 0 80 64"
      role="img"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={`${id}-back`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={accent} stopOpacity="0.55" />
          <stop offset="1" stopColor={accent} stopOpacity="0.32" />
        </linearGradient>
        <linearGradient id={`${id}-front`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={accent} stopOpacity="0.95" />
          <stop offset="1" stopColor={accent} stopOpacity="0.72" />
        </linearGradient>
      </defs>
      {/* back panel with tab */}
      <path
        d="M6 14a5 5 0 0 1 5-5h17l6 6h35a5 5 0 0 1 5 5v33a5 5 0 0 1-5 5H11a5 5 0 0 1-5-5z"
        fill={`url(#${id}-back)`}
      />
      {/* front panel, slightly offset for depth */}
      <path
        d="M4 24a4 4 0 0 1 4-4h64a4 4 0 0 1 4 4v29a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"
        fill={`url(#${id}-front)`}
      />
      {/* top-edge highlight */}
      <path d="M8 21h64a3 3 0 0 1 3 3v1H5v-1a3 3 0 0 1 3-3z" fill="#ffffff" opacity="0.22" />
      {/* subtle inner sheet peeking out */}
      <rect x="14" y="16" width="30" height="4" rx="2" fill="#ffffff" opacity="0.18" />
    </svg>
  );
}
