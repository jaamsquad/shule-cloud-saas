import { Link } from "react-router-dom";

const PURPLE = "#613ddf";
const PURPLE_DARK = "#3a1f9e";

/**
 * Playful, original ShuleCloud-branded 404 — a friendly little character peeking
 * up between a big "404", on a soft purple background with floating clouds.
 * Single action button (Dashboard for logged-in users, else Login). No nav.
 */
export function NotFoundContent() {
  const loggedIn = !!localStorage.getItem("token");
  return (
    <div className="flex-1 w-full min-h-full flex flex-col items-center justify-center text-center px-6 py-12 relative overflow-hidden" style={{ background: "#f3f0ff" }}>
      {/* soft floating clouds */}
      <Cloud className="absolute top-[12%] left-[8%] w-28 opacity-80" />
      <Cloud className="absolute top-[22%] right-[10%] w-36 opacity-70" />
      <Cloud className="absolute bottom-[16%] left-[16%] w-24 opacity-60 hidden sm:block" />

      <p className="relative text-xs font-black uppercase tracking-[0.35em] mb-6 z-10" style={{ color: PURPLE }}>
        Shule<span style={{ color: PURPLE_DARK }}>Cloud</span>
      </p>

      {/* 404 with a character forming the 0 */}
      <div className="relative flex items-end justify-center gap-1 sm:gap-3 z-10 select-none">
        <Digit>4</Digit>
        <Character />
        <Digit>4</Digit>
      </div>

      <h2 className="relative z-10 mt-8 text-2xl md:text-3xl font-black" style={{ color: PURPLE_DARK }}>
        The page you're looking for doesn't exist.
      </h2>
      <p className="relative z-10 text-slate-500 max-w-md mt-2 mb-8">
        It may have been moved or removed, or the link might be broken.
      </p>

      <Link
        to={loggedIn ? "/dashboard" : "/login"}
        className="relative z-10 inline-flex items-center justify-center px-9 py-3.5 rounded-full font-bold text-white shadow-lg transition-transform hover:-translate-y-0.5"
        style={{ background: PURPLE }}
      >
        {loggedIn ? "Back to dashboard" : "Back home"}
      </Link>
    </div>
  );
}

function Digit({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="font-black leading-none"
      style={{ color: PURPLE, fontSize: "clamp(6rem, 22vw, 13rem)", lineHeight: 0.8 }}
    >
      {children}
    </span>
  );
}

/** An original friendly character (round face, big glasses) standing in for the "0". */
function Character() {
  return (
    <svg viewBox="0 0 200 200" className="w-[clamp(6rem,22vw,13rem)] h-auto" aria-hidden="true">
      {/* body / head */}
      <circle cx="100" cy="100" r="86" fill={PURPLE} />
      <circle cx="100" cy="100" r="64" fill="#fff" />
      {/* cheeks */}
      <circle cx="58" cy="118" r="11" fill="#ffd1e8" />
      <circle cx="142" cy="118" r="11" fill="#ffd1e8" />
      {/* glasses */}
      <circle cx="78" cy="96" r="22" fill="none" stroke={PURPLE_DARK} strokeWidth="7" />
      <circle cx="122" cy="96" r="22" fill="none" stroke={PURPLE_DARK} strokeWidth="7" />
      <line x1="96" y1="92" x2="104" y2="92" stroke={PURPLE_DARK} strokeWidth="6" strokeLinecap="round" />
      {/* eyes */}
      <circle cx="78" cy="96" r="8" fill={PURPLE_DARK} />
      <circle cx="122" cy="96" r="8" fill={PURPLE_DARK} />
      <circle cx="81" cy="93" r="2.5" fill="#fff" />
      <circle cx="125" cy="93" r="2.5" fill="#fff" />
      {/* smile */}
      <path d="M82 132 q18 18 36 0" fill="none" stroke={PURPLE_DARK} strokeWidth="6" strokeLinecap="round" />
    </svg>
  );
}

function Cloud({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 60" className={className} aria-hidden="true">
      <g fill="#ffffff">
        <circle cx="30" cy="36" r="22" />
        <circle cx="58" cy="28" r="28" />
        <circle cx="88" cy="38" r="20" />
        <rect x="28" y="40" width="62" height="18" rx="9" />
      </g>
    </svg>
  );
}

/** Standalone 404 (logged-out / outside the dashboard layout). */
export default function NotFound() {
  return (
    <div className="min-h-screen flex" style={{ background: "#f3f0ff" }}>
      <NotFoundContent />
    </div>
  );
}
