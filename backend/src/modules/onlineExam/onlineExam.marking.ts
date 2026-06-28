/**
 * Auto-marking engine for the Online Examination module.
 *
 * Given a question (with its correct answer) and a student's answer, returns the
 * awarded marks. Manual types (essay/short/file/optionally fill-blank) return null
 * to signal "needs teacher marking".
 */
import { QuestionType, AUTO_TYPES } from './onlineExam.types';

const norm = (v: any) => String(v ?? '').trim().toLowerCase();
const arr = (v: any): string[] => Array.isArray(v) ? v.map(String) : (v == null || v === '' ? [] : [String(v)]);

export interface MarkResult { awarded: number; auto: boolean; correct: boolean | null; }

/**
 * Mark a single question. `q` is the stored question, `answer` is the student's
 * submitted answer for it. Partial credit is given where it makes sense
 * (mcq_multiple, matching, ordering) so honest partial knowledge is rewarded.
 */
export function markQuestion(q: any, answer: any): MarkResult {
    const type: QuestionType = q.type;
    const max = Number(q.marks) || 1;
    const isAuto = AUTO_TYPES.includes(type) || (type === 'fill_blank' && q.autoMark !== false);

    if (!isAuto) return { awarded: 0, auto: false, correct: null };   // teacher marks later
    if (answer === undefined || answer === null || answer === '') return { awarded: 0, auto: true, correct: false };

    switch (type) {
        case 'mcq_single':
        case 'true_false': {
            const correct = norm(answer) === norm(q.correctAnswer);
            return { awarded: correct ? max : 0, auto: true, correct };
        }
        case 'mcq_multiple': {
            // Partial credit: (correct picks − wrong picks) / total correct, floored at 0.
            const correctSet = new Set(arr(q.correctAnswers ?? q.correctAnswer).map(norm));
            const picks = arr(answer).map(norm);
            if (correctSet.size === 0) return { awarded: 0, auto: true, correct: false };
            let right = 0, wrong = 0;
            picks.forEach(p => correctSet.has(p) ? right++ : wrong++);
            const score = Math.max(0, (right - wrong) / correctSet.size);
            const awarded = Math.round(score * max * 100) / 100;
            return { awarded, auto: true, correct: awarded === max };
        }
        case 'numeric': {
            const target = Number(q.correctAnswer);
            const tol = Number(q.tolerance) || 0;
            const val = Number(answer);
            if (Number.isNaN(val)) return { awarded: 0, auto: true, correct: false };
            const correct = Math.abs(val - target) <= tol;
            return { awarded: correct ? max : 0, auto: true, correct };
        }
        case 'fill_blank': {
            // Accept any of the configured acceptable answers (case-insensitive).
            const accepted = arr(q.correctAnswers ?? q.correctAnswer).map(norm);
            const correct = accepted.includes(norm(answer));
            return { awarded: correct ? max : 0, auto: true, correct };
        }
        case 'matching': {
            // q.pairs = [{ left, right }]; answer = { [left]: chosenRight }. Partial credit.
            const pairs: any[] = Array.isArray(q.pairs) ? q.pairs : [];
            if (!pairs.length) return { awarded: 0, auto: true, correct: false };
            let right = 0;
            pairs.forEach(p => { if (norm(answer?.[p.left]) === norm(p.right)) right++; });
            const awarded = Math.round((right / pairs.length) * max * 100) / 100;
            return { awarded, auto: true, correct: right === pairs.length };
        }
        case 'ordering': {
            // q.correctOrder = [ids in order]; answer = [ids in student order]. Partial.
            const correctOrder = arr(q.correctOrder ?? q.correctAnswer);
            const given = arr(answer);
            if (!correctOrder.length) return { awarded: 0, auto: true, correct: false };
            let right = 0;
            correctOrder.forEach((id, i) => { if (norm(given[i]) === norm(id)) right++; });
            const awarded = Math.round((right / correctOrder.length) * max * 100) / 100;
            return { awarded, auto: true, correct: right === correctOrder.length };
        }
        default:
            return { awarded: 0, auto: false, correct: null };
    }
}

/**
 * Auto-mark a whole attempt against its questions. Returns the partial score and
 * whether any questions still need manual marking.
 */
export function autoMarkAttempt(questions: any[], answers: Record<string, any>) {
    let autoScore = 0;
    let needsManual = false;
    const perQuestion: Record<string, { awarded: number; auto: boolean; correct: boolean | null }> = {};
    for (const q of questions) {
        const qid = String(q._id);
        const r = markQuestion(q, answers?.[qid]);
        perQuestion[qid] = r;
        if (r.auto) autoScore += r.awarded; else needsManual = true;
    }
    return { autoScore: Math.round(autoScore * 100) / 100, needsManual, perQuestion };
}
