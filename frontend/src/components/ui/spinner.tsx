/** The ShuleCloud loading spinner (styled in index.css → .sc-spinner). */
export function Spinner({ size = 20, light = false, className = "", label = "Loading" }: { size?: number; light?: boolean; className?: string; label?: string }) {
    return <span role="status" aria-label={label} className={`sc-spinner inline-block ${light ? "sc-spinner--light" : ""} ${className}`} style={{ width: size, height: size }} />;
}

/** Centered full-area loader with an optional caption. */
export function PageLoader({ caption }: { caption?: string }) {
    return (
        <div className="flex flex-col items-center justify-center gap-3 py-24">
            <Spinner size={44} />
            {caption ? <p className="text-xs font-semibold text-slate-400">{caption}</p> : null}
        </div>
    );
}
