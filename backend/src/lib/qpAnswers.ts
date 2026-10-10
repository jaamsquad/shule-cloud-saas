/**
 * Answers and marking schemes for question papers:
 *  - matchScheme(): an uploaded marking scheme (same numbering as the paper) → answer and
 *    marking scheme per question, matched by question number (and part labels in the text)
 *  - aiAnswers(): the school's AI assistant writes the answer and a marking scheme (marks per
 *    point, adding up to the question's marks) for each question
 */
import { Request } from 'express';
import { ExtractedQuestion, questionPlainText } from './paperExtract';
import { getAiConfig, schoolAiEnabled, usedToday, callModel, countUse } from './aiAssistant';

export interface SchemeMatch { answer: string; markingScheme: string }

/** Answers from an uploaded marking scheme, keyed by question number. */
export function matchScheme(paper: ExtractedQuestion[], scheme: ExtractedQuestion[]) {
    const byNo = new Map(scheme.map(s => [s.number, s]));
    let matched = 0;
    const out: (SchemeMatch | null)[] = paper.map(q => {
        const s = byNo.get(q.number);
        if (!s) return null;
        matched++;
        const text = questionPlainText(s as any).trim();
        // an MCQ's answer is the option letter the scheme gives ("B", "Answer: C", "(b)")
        const opts = ((q as any).options || []) as { label: string }[];
        let answer = text;
        if (opts.length >= 2) {
            const m = text.match(/\b(?:answer|ans)?\s*[:\-]?\s*\(?([A-H])\)?(?:[.)\s]|$)/i);
            if (m && opts.some(o => o.label.toUpperCase() === m[1].toUpperCase())) answer = m[1].toUpperCase();
        }
        return { answer: answer.slice(0, 2000), markingScheme: text.slice(0, 4000) };
    });
    const unmatched = paper.filter((q, i) => !out[i]).map(q => q.number);
    return { answers: out, matched, unmatched, extra: scheme.filter(s => !paper.some(q => q.number === s.number)).map(s => s.number) };
}

const SYSTEM = `You are an experienced Kenyan secondary/CBE school teacher and KNEC-style examiner.
For each question you get, write:
- "answer": the correct answer (for multiple choice give only the option letter; for parts give each part's answer labelled (a), (b) …)
- "markingScheme": a marking scheme a teacher can mark with: the expected points, each with its marks in brackets like "(1 mark)", acceptable alternative answers, and the total, which must equal the question's marks.
Be accurate, concise and age-appropriate for the class. If a question is unclear, give the most likely intended answer and say "check" in the scheme.
Reply ONLY with JSON: {"items":[{"i":<index>,"answer":"...","markingScheme":"..."}]}`;

export async function aiAnswers(req: Request, questions: any[], ctx: { subject: string; className: string }) {
    const cfg = await getAiConfig();
    if (!cfg.enabled || !cfg.apiKey) throw Object.assign(new Error('The AI assistant is not set up yet (Owner → AI settings).'), { status: 503 });
    const tenantId = (req as any).tenantContext?.tenantId;
    if (!(await schoolAiEnabled(tenantId))) throw Object.assign(new Error('The AI assistant is turned off for your school.'), { status: 403 });
    if (cfg.dailyLimit && (await usedToday(tenantId)) >= cfg.dailyLimit) throw Object.assign(new Error("Your school has used today's AI allowance. Try again tomorrow."), { status: 429 });

    const results: SchemeMatch[] = questions.map(() => ({ answer: '', markingScheme: '' }));
    const BATCH = 6;
    let tokens = 0, failed = 0;
    for (let start = 0; start < questions.length; start += BATCH) {
        const chunk = questions.slice(start, start + BATCH).map((q, k) => ({
            i: start + k, marks: Number(q.marks) || null, type: q.type || '',
            question: questionPlainText(q).slice(0, 3000),
            options: (q.options || []).map((o: any) => `${o.label}. ${o.text}`),
        }));
        try {
            const out = await callModel({ ...cfg, temperature: 0.2, maxTokens: 3500 }, {
                response_format: { type: 'json_object' },
                messages: [
                    { role: 'system', content: SYSTEM },
                    { role: 'user', content: `Subject: ${ctx.subject || 'unknown'}. Class: ${ctx.className || 'unknown'}.\nQuestions:\n${JSON.stringify(chunk)}` },
                ],
            });
            tokens += out?.usage?.total_tokens || 0;
            const parsed = JSON.parse(String(out?.choices?.[0]?.message?.content || '{}'));
            for (const it of Array.isArray(parsed?.items) ? parsed.items : []) {
                const i = Number(it?.i);
                if (Number.isInteger(i) && i >= start && i < start + BATCH && results[i]) {
                    results[i] = { answer: String(it.answer || '').slice(0, 2000), markingScheme: String(it.markingScheme || '').slice(0, 4000) };
                }
            }
        } catch (e: any) {
            if (start === 0) throw e;   // nothing done yet → report the real error
            failed += chunk.length;
        }
    }
    await countUse(tenantId, tokens);
    return { results, failed };
}
