/**
 * ShuleCloud brand mark — a cloud cradling an open book/mortarboard, in the
 * purple brand. Used across the public site (nav, footer, legal pages).
 * `tone="light"` renders white for dark/purple backgrounds.
 */
export function ShuleCloudMark({ size = 36, tone = "brand" }: { size?: number; tone?: "brand" | "light" }) {
  const primary = tone === "light" ? "#ffffff" : "#613ddf";
  const accent = tone === "light" ? "rgba(255,255,255,.65)" : "#9b7bff";
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* cloud */}
      <path
        d="M14 38c-5.5 0-10-4.3-10-9.6 0-4.8 3.7-8.8 8.5-9.5C14.2 13.3 19.3 9.5 25.2 9.5c6.9 0 12.6 5.1 13.4 11.7 3.2.9 5.4 3.7 5.4 7 0 4.1-3.5 7.3-7.8 7.3H14z"
        fill={primary}
      />
      {/* open book on the cloud */}
      <path d="M24 22.5c-2.2-1.5-4.8-2-7.5-1.6v9.4c2.7-.4 5.3.1 7.5 1.6 2.2-1.5 4.8-2 7.5-1.6v-9.4c-2.7-.4-5.3.1-7.5 1.6z" fill="#fff" opacity={tone === "light" ? 0.95 : 1} />
      <path d="M24 22.5v9.4" stroke={accent} strokeWidth="1.4" strokeLinecap="round" />
      {/* graduation tassel dot */}
      <circle cx="24" cy="18.5" r="2.2" fill={accent} />
    </svg>
  );
}

/** Full lockup: mark + "ShuleCloud" wordmark. */
export function ShuleCloudLogo({ tone = "brand", size = 34 }: { tone?: "brand" | "light"; size?: number }) {
  const textColor = tone === "light" ? "#ffffff" : "#1a1333";
  const accent = tone === "light" ? "#ffffff" : "#613ddf";
  return (
    <span className="flex items-center gap-2.5">
      <ShuleCloudMark size={size} tone={tone} />
      <span className="text-xl font-black tracking-tight" style={{ color: textColor }}>
        Shule<span style={{ color: accent }}>Cloud</span>
      </span>
    </span>
  );
}
