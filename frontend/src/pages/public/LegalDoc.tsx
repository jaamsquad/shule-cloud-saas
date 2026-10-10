/**
 * Long-form legal page body (Terms, Privacy): a contents list that jumps to numbered sections.
 * Rendered inside LegalShell.
 */
import type { ReactNode } from "react";
import { NAVY, TEAL } from "./MarketingChrome";

export interface LegalSection { id: string; title: string; body: ReactNode }

export const Bullets = ({ items }: { items: ReactNode[] }) => (
  <ul className="list-disc pl-5 space-y-1.5 marker:text-slate-400">{items.map((it, i) => <li key={i}>{it}</li>)}</ul>
);

export const Sub = ({ title, children }: { title: string; children: ReactNode }) => (
  <div className="space-y-2">
    <h3 className="font-black text-slate-800">{title}</h3>
    {children}
  </div>
);

export function LegalDoc({ intro, sections, lastUpdated }: { intro: ReactNode; sections: LegalSection[]; lastUpdated: string }) {
  return (
    <div className="leading-relaxed text-slate-600">
      <div className="text-lg space-y-3 mb-8">{intro}</div>

      <nav aria-label="Contents" className="rounded-2xl bg-white ring-1 ring-slate-200/70 p-5 mb-10">
        <p className="text-[11px] font-black uppercase tracking-wide text-slate-400 mb-3">Contents</p>
        <ol className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
          {sections.map((s, i) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="font-semibold hover:underline" style={{ color: TEAL }}>{i + 1}. {s.title}</a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="space-y-10">
        {sections.map((s, i) => (
          <section key={s.id} id={s.id} className="scroll-mt-24 space-y-3">
            <h2 className="text-xl font-black" style={{ color: NAVY }}>{i + 1}. {s.title}</h2>
            {s.body}
          </section>
        ))}
      </div>

      <p className="text-xs text-slate-400 pt-4 mt-10 border-t border-slate-100">Last updated: {lastUpdated}</p>
    </div>
  );
}
