/**
 * Question papers → questions (Question Paper → Import).
 *
 * 1. documentLines(): a Word (.docx), PDF or text file becomes plain lines.
 *    Word's automatic numbering (1., (a), (i)) lives in list formatting, not in the text,
 *    so .docx is read as HTML and the numbers are rebuilt from the list nesting; top-level
 *    numbering continues across lists broken up by paragraphs, as on the printed page.
 *    Pictures in Word files are kept with their question. Scanned PDFs (no text) are
 *    reported instead of guessed at.
 * 2. parseQuestions(): lines become numbered questions with sub-parts (a)(b), sub-sub-parts
 *    (i)(ii), multiple-choice options, answers, marks and sections. Page furniture (page
 *    numbers, "turn over") is dropped and the text before question 1 is kept as the header.
 */

export interface ExtractedPart { label: string; text: string; marks: number | null; parts: ExtractedPart[] }
export interface ExtractedQuestion {
    number: number; text: string; marks: number | null; section: string;
    parts: ExtractedPart[]; options: { label: string; text: string }[]; answer: string;
    images: string[]; type: 'MCQ' | 'Short Answer' | 'Structured' | 'Essay';
    difficulty: 'EASY' | 'MEDIUM' | 'HARD';
}
export interface ExtractResult { header: string[]; instructions: string[]; questions: ExtractedQuestion[]; warnings: string[]; pages: number }

const ROMAN = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x', 'xi', 'xii'];
const LETTERS = 'abcdefghijklmnopqrstuvwxyz';
const WORDS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20 };

const decode = (s: string) => s
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#(\d+);/g, (_m, n) => String.fromCharCode(Number(n)));

/** Mammoth HTML → lines, rebuilding list numbers ("1.", "(a)", "(i)"). Images become [[IMG:n]]. */
export function htmlToLines(html: string): { lines: string[]; images: string[] } {
    const lines: string[] = [];
    const images: string[] = [];
    const counters = [0, 0, 0, 0];
    const listStack: ('ol' | 'ul')[] = [];
    let buf = '';
    let row: string[] | null = null;
    let cell = '';
    const flush = () => { const t = buf.replace(/\s+/g, ' ').trim(); if (t) lines.push(t); buf = ''; };
    const re = /<(\/?)([a-zA-Z0-9]+)([^>]*)>|([^<]+)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html))) {
        const [, close, tagRaw, attrs, text] = m;
        if (text !== undefined) { if (row) cell += decode(text); else buf += decode(text); continue; }
        const tag = tagRaw.toLowerCase();
        if (tag === 'ol' || tag === 'ul') {
            if (!close) { flush(); listStack.push(tag as any); const d = listStack.length - 1; if (d > 0) counters[d] = 0; }
            else { flush(); listStack.pop(); }
        } else if (tag === 'li') {
            if (!close) {
                flush();
                const d = Math.min(listStack.length - 1, 3);
                if (listStack[listStack.length - 1] === 'ol') {
                    counters[d] = (counters[d] || 0) + 1;
                    for (let k = d + 1; k < counters.length; k++) counters[k] = 0;
                    buf = d === 0 ? `${counters[0]}. ` : d === 1 ? `(${LETTERS[(counters[1] - 1) % 26]}) ` : `(${ROMAN[(counters[d] - 1) % ROMAN.length]}) `;
                } else buf = '';
            } else flush();
        } else if (tag === 'p' || tag === 'h1' || tag === 'h2' || tag === 'h3' || tag === 'h4' || tag === 'h5' || tag === 'h6') {
            if (close) flush(); else if (buf.trim() && !/^\s*(\d+\.|\([a-z]+\))\s*$/.test(buf)) flush();
        } else if (tag === 'br') {
            if (row) cell += ' '; else flush();
        } else if (tag === 'tr') {
            if (!close) { flush(); row = []; } else { if (row && row.some(c => c.trim())) lines.push(row.map(c => c.replace(/\s+/g, ' ').trim()).join(' | ')); row = null; }
        } else if (tag === 'td' || tag === 'th') {
            if (!close) cell = ''; else if (row) row.push(cell);
        } else if (tag === 'img' && !close) {
            const src = (attrs.match(/src="([^"]+)"/) || [])[1];
            if (src && src.length < 600_000) { images.push(src); const mark = `[[IMG:${images.length - 1}]]`; if (row) cell += ` ${mark} `; else buf += ` ${mark} `; }
        }
    }
    flush();
    return { lines, images };
}

/** Read a file into lines. Throws an Error with a user-facing message when it can't. */
export async function documentLines(buffer: Buffer, filename: string): Promise<{ lines: string[]; images: string[]; pages: number; warnings: string[] }> {
    const name = filename.toLowerCase();
    const warnings: string[] = [];
    if (name.endsWith('.docx')) {
        const mammoth: any = (await import('mammoth')).default || (await import('mammoth'));
        const r = await mammoth.convertToHtml({ buffer }, { convertImage: mammoth.images.imgElement((img: any) => img.read('base64').then((b64: string) => ({ src: `data:${img.contentType};base64,${b64}` }))) });
        const { lines, images } = htmlToLines(String(r.value || ''));
        return { lines, images, pages: 1, warnings };
    }
    if (name.endsWith('.pdf')) {
        // the library entry point, not its index (which runs a self-test when imported)
        // @ts-ignore — no types for the inner path
        const pdfParse: any = (await import('pdf-parse/lib/pdf-parse.js')).default;
        const data = await pdfParse(buffer);
        const text = String(data.text || '');
        if (text.replace(/\s/g, '').length < 40) throw new Error('This PDF has no readable text — it looks like a scanned paper. Upload the Word (.docx) version, or a PDF saved from Word.');
        return { lines: text.split(/\r?\n/), images: [], pages: Number(data.numpages) || 1, warnings };
    }
    if (name.endsWith('.txt') || name.endsWith('.md')) return { lines: buffer.toString('utf8').split(/\r?\n/), images: [], pages: 1, warnings };
    if (name.endsWith('.doc')) throw new Error('Old Word files (.doc) can\'t be read — open it in Word and save it as .docx, then upload again.');
    throw new Error('Upload a Word (.docx), PDF or text file.');
}

const MARKS_RE = /[([]\s*(\d{1,3})\s*(?:marks?|mks?|mk|pts?|points?)\.?\s*[)\]]|\b(\d{1,3})\s*(?:marks|mks)\.?\s*$/i;
function takeMarks(text: string): { text: string; marks: number | null } {
    const m = text.match(MARKS_RE);
    if (!m) return { text: text.trim(), marks: null };
    return { text: text.replace(m[0], ' ').replace(/\s{2,}/g, ' ').trim(), marks: Number(m[1] || m[2]) };
}
const isNoise = (l: string) => /^(page\s*\d+(\s*(of|\/)\s*\d+)?|\d{1,3}|(please\s+)?turn\s+over\.?|this paper consists of.*|©.*|[-_=.*•\s]+)$/i.test(l);
const nextLetter = (l: string) => LETTERS[LETTERS.indexOf(l) + 1] || '';

export function parseQuestions(rawLines: string[], images: string[] = []): ExtractResult {
    const lines = rawLines.map(l => l.replace(/\t/g, ' ').replace(/\s+/g, ' ').trim()).filter(l => l && !isNoise(l));
    const header: string[] = [], instructions: string[] = [], warnings: string[] = [];
    const questions: ExtractedQuestion[] = [];
    let section = '';
    let q: ExtractedQuestion | null = null;
    let part: ExtractedPart | null = null;
    let sub: ExtractedPart | null = null;
    let inInstructions = false;

    const newQ = (n: number, text: string) => {
        // "2. (a) State…" — the first part sits on the question's own line
        const first = text.match(/^\(?a[.)]\s+(.+)$/);
        const t = takeMarks(first ? '' : text);
        q = { number: n, text: t.text, marks: t.marks, section, parts: [], options: [], answer: '', images: [], type: 'Short Answer', difficulty: 'MEDIUM' };
        questions.push(q); part = null; sub = null; inInstructions = false;
        if (first) { const pt = takeMarks(first[1]); part = { label: 'a', text: pt.text, marks: pt.marks, parts: [] }; q.parts.push(part); }
    };
    const append = (text: string) => {
        const t = takeMarks(text);
        const target: any = sub || part || q;
        if (!target) return;
        if (target === q && q!.options.length) { q!.options[q!.options.length - 1].text += ' ' + t.text; return; }
        target.text = `${target.text} ${t.text}`.trim();
        if (t.marks !== null && target.marks === null) target.marks = t.marks;
    };
    const expected = () => (questions.length ? questions[questions.length - 1].number + 1 : 1);

    for (const line0 of lines) {
        let line = line0;
        // images stay with the current question
        const imgs = [...line.matchAll(/\[\[IMG:(\d+)\]\]/g)].map(x => images[Number(x[1])]).filter(Boolean);
        line = line.replace(/\[\[IMG:\d+\]\]/g, '').trim();
        if (imgs.length && q) (q as ExtractedQuestion).images.push(...imgs);
        if (!line) continue;

        let m: RegExpMatchArray | null;
        if ((m = line.match(/^(section|part)\s+([A-Z0-9]{1,4})\b\s*[:.\-–]?\s*(.*)$/i)) && line.length < 120) {
            section = `${m[1][0].toUpperCase()}${m[1].slice(1).toLowerCase()} ${m[2].toUpperCase()}${m[3] ? ` — ${m[3]}` : ''}`.trim();
            part = null; sub = null; continue;
        }
        if ((m = line.match(/^question\s+(\d{1,3}|[a-z]+)\b\s*[:.\-–)]?\s*(.*)$/i)) && (Number(m[1]) || WORDS[m[1].toLowerCase()])) {
            newQ(Number(m[1]) || WORDS[m[1].toLowerCase()], m[2] || ''); continue;
        }
        // "1. text", "1) text", "Q1. text", "1 text" (only when it is the next number)
        if ((m = line.match(/^(?:q\.?\s*)?(\d{1,3})\s*[.)]\s*(.*)$/i)) || (m = line.match(/^(\d{1,3})\s+([A-Z(].*)$/))) {
            const n = Number(m[1]);
            const ok = n === expected() || (n === 1 && questions.length > 0) || (!questions.length && n <= 3);
            if (ok && (m[2] || '').length) { newQ(n, m[2]); continue; }
        }
        if (!q) {
            if (/^instructions?\b/i.test(line) || inInstructions) {
                inInstructions = true;
                const rest = line.replace(/^instructions?\s*(to\s+(the\s+)?candidates)?\s*[:.\-]?\s*/i, '').trim();
                if (rest) instructions.push(rest);
            }
            else header.push(line);
            continue;
        }
        const cq = q as ExtractedQuestion;
        // answers
        if ((m = line.match(/^(?:ans(?:wer)?|correct\s+answer|key)\s*[:.\-]\s*(.+)$/i))) { cq.answer = m[1].trim(); continue; }
        // several MCQ options on one line: "A. x  B. y  C. z"
        const inline = [...line.matchAll(/(?:^|\s)\(?([A-E])[.)]\s+(.+?)(?=\s+\(?[A-E][.)]\s+|$)/g)];
        if (inline.length >= 2 && inline[0][1] === (cq.options.length ? String.fromCharCode(cq.options[cq.options.length - 1].label.charCodeAt(0) + 1) : 'A')) {
            inline.forEach(x => cq.options.push({ label: x[1], text: x[2].trim() })); continue;
        }
        if ((m = line.match(/^\(?([A-E])[.)]\s+(.+)$/))) {
            const want = cq.options.length ? String.fromCharCode(cq.options[cq.options.length - 1].label.charCodeAt(0) + 1) : 'A';
            if (m[1] === want) { cq.options.push({ label: m[1], text: m[2].trim() }); continue; }
        }
        // (i) (ii) … under the current part, or as parts when there are none
        if ((m = line.match(/^\(?(i|ii|iii|iv|v|vi|vii|viii|ix|x|xi|xii)[.)]\s*(.+)$/i))) {
            const r = m[1].toLowerCase();
            const host: any = part || cq;
            const prev = host.parts.length ? host.parts[host.parts.length - 1].label : '';
            const isNextRoman = (prev === '' && r === 'i') || ROMAN.indexOf(r) === ROMAN.indexOf(prev) + 1;
            // "(i)" right after "(h)" is the letter i, not roman one
            const letterContinuation = !part && cq.parts.length && nextLetter(cq.parts[cq.parts.length - 1].label) === r;
            if (isNextRoman && !letterContinuation) {
                const t = takeMarks(m[2]);
                const p: ExtractedPart = { label: r, text: t.text, marks: t.marks, parts: [] };
                host.parts.push(p);
                if (part) sub = p; else { part = p; sub = null; }
                continue;
            }
        }
        if ((m = line.match(/^\(?([a-h])[.)]\s*(.+)$/)) || (m = line.match(/^\(([a-z])\)\s*(.+)$/))) {
            const l = m[1];
            const prev = cq.parts.length ? cq.parts[cq.parts.length - 1].label : '';
            if ((prev === '' && l === 'a') || (prev && nextLetter(prev) === l)) {
                const t = takeMarks(m[2]);
                part = { label: l, text: t.text, marks: t.marks, parts: [] };
                cq.parts.push(part); sub = null; continue;
            }
        }
        append(line);
    }

    const sumParts = (ps: ExtractedPart[]): number | null => {
        let total = 0, any = false;
        for (const p of ps) { const v = p.marks ?? sumParts(p.parts); if (v !== null) { total += v; any = true; } }
        return any ? total : null;
    };
    for (const x of questions) {
        if (x.marks === null) x.marks = sumParts(x.parts);
        x.type = x.options.length >= 2 ? 'MCQ' : x.parts.length ? 'Structured' : (x.marks ?? 0) >= 10 ? 'Essay' : 'Short Answer';
        x.difficulty = (x.marks ?? 0) >= 10 ? 'HARD' : (x.marks ?? 3) <= 2 ? 'EASY' : 'MEDIUM';
        if (x.options.length && !x.answer) {
            // "*C." or "(correct)" markers some papers use
            const starred = x.options.find(o => /\*\s*$|\(correct\)/i.test(o.text));
            if (starred) { x.answer = starred.label; starred.text = starred.text.replace(/\*\s*$|\(correct\)/i, '').trim(); }
        }
    }
    // numbering gaps → tell the teacher to check
    questions.forEach((x, i) => { if (i && x.number !== questions[i - 1].number + 1 && x.number !== 1) warnings.push(`Question ${questions[i - 1].number} is followed by ${x.number} — check nothing was missed.`); });
    if (!questions.length) warnings.push('No numbered questions were found. Questions should start with a number like "1." or "Question 1".');
    return { header, instructions, questions, warnings, pages: 1 };
}

/** The whole question as plain text (for the bank's search and older screens). */
export function questionPlainText(q: { text: string; parts?: ExtractedPart[]; options?: { label: string; text: string }[] }): string {
    const out = [q.text];
    const walk = (ps: ExtractedPart[] = [], depth = 0) => ps.forEach(p => { out.push(`${'  '.repeat(depth)}(${p.label}) ${p.text}${p.marks ? ` (${p.marks} marks)` : ''}`); walk(p.parts, depth + 1); });
    walk(q.parts);
    (q.options || []).forEach(o => out.push(`${o.label}. ${o.text}`));
    return out.filter(Boolean).join('\n');
}

export async function extractPaper(buffer: Buffer, filename: string): Promise<ExtractResult> {
    const doc = await documentLines(buffer, filename);
    const r = parseQuestions(doc.lines, doc.images);
    return { ...r, pages: doc.pages, warnings: [...doc.warnings, ...r.warnings] };
}
