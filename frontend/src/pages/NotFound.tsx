import { Link } from "react-router-dom";
import { Home } from "lucide-react";

const PURPLE = "#613ddf";

/**
 * The 404 body. When rendered via the catch-all inside DashboardLayout it shows
 * inside the app's sidebar + top bar. When a logged-out user hits an unknown
 * URL, NotFound (below) wraps this in a plain full-screen container.
 */
export function NotFoundContent() {
  const loggedIn = !!localStorage.getItem("token");
  return (
    <div className="flex-1 w-full min-h-full flex flex-col items-center justify-center text-center px-6 py-16 bg-[#faf9ff]">
      <p className="text-xs font-black uppercase tracking-[0.3em] mb-4" style={{ color: PURPLE }}>
        Shule<span style={{ color: "#1a1333" }}>Cloud</span>
      </p>

      <h1 className="font-black leading-none mb-4 select-none" style={{ color: PURPLE, fontSize: "clamp(5rem, 18vw, 11rem)" }}>
        404
      </h1>

      <h2 className="text-2xl md:text-3xl font-black mb-2" style={{ color: "#1a1333" }}>
        The page you're looking for doesn't exist.
      </h2>
      <p className="text-slate-500 max-w-md mb-8">
        It may have been moved or removed, or the link might be broken. Let's get you back on track.
      </p>

      <Link
        to={loggedIn ? "/dashboard" : "/login"}
        className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full font-bold text-white shadow-lg transition-transform hover:-translate-y-0.5"
        style={{ background: PURPLE }}
      >
        <Home className="w-4 h-4" /> Back home
      </Link>
    </div>
  );
}

/** Standalone 404 (logged-out / outside the dashboard layout). */
export default function NotFound() {
  return (
    <div className="min-h-screen flex bg-[#faf9ff]">
      <NotFoundContent />
    </div>
  );
}
