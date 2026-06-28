/**
 * Online Examination Module — shared types & constants.
 *
 * Collections (tenant DB, per-branch scoped via fields):
 *   online_exams            — exam definitions (settings, schedule, status)
 *   online_exam_questions   — questions belonging to an exam (order, type, marks)
 *   online_exam_attempts    — one row per student per exam (answers, autosave, status)
 *   online_exam_violations  — proctoring/anti-cheat events
 *   online_exam_audit       — audit trail
 *
 * Results sync target: exam_marks (read by ScholarSheet/analytics/report cards).
 */

export const QUESTION_TYPES = [
    'mcq_single',      // Multiple choice, one answer — auto
    'mcq_multiple',    // Multiple choice, many answers — auto
    'true_false',      // True/False — auto
    'short_answer',    // Short answer — manual
    'essay',           // Long answer / essay — manual
    'fill_blank',      // Fill in the blank — auto or manual
    'matching',        // Matching pairs — auto
    'ordering',        // Order items — auto
    'numeric',         // Numeric with tolerance — auto
    'file_upload',     // File upload — manual
] as const;
export type QuestionType = typeof QUESTION_TYPES[number];

// Which types mark automatically (no teacher needed).
export const AUTO_TYPES: QuestionType[] = ['mcq_single', 'mcq_multiple', 'true_false', 'matching', 'ordering', 'numeric'];

export const EXAM_CATEGORIES = ['CAT', 'Midterm', 'End Term', 'Holiday Assignment', 'Mock', 'Revision'] as const;
export const EXAM_STATUS = ['Draft', 'Published', 'Closed'] as const;
export const ATTEMPT_STATUS = ['not_started', 'in_progress', 'submitted', 'auto_submitted', 'marked', 'published'] as const;

// Default exam settings — every flag the spec lists, with safe defaults.
export const DEFAULT_SETTINGS = {
    randomizeQuestions: false,
    randomizeChoices: false,
    shuffleSections: false,
    showQuestionNumbers: true,
    allowPrevious: true,
    allowNext: true,
    allowReview: true,
    showRemainingTime: true,
    autosave: true,
    autoSubmitOnExpiry: true,
    autoSubmitOnLeave: false,
    autoSubmitOnRefresh: false,
    preventCopy: true,
    preventPaste: true,
    preventRightClick: true,
    disableTextSelection: true,
    disablePrinting: true,
    requireFullScreen: false,
    lockKeyboardShortcuts: false,
    requireStableInternet: false,
    warnBeforeAutoSubmit: true,
    // Anti-cheat / strict mode
    strictMode: false,
    maxTabSwitches: 3,
    maxFullscreenExits: 3,
    maxWarnings: 2,
    autoSubmitAfterViolation: true,
    // Review (what students may see after results release)
    reviewMode: 'nothing' as 'nothing' | 'marks_only' | 'marks_and_answers' | 'correct_answers' | 'with_comments' | 'with_explanations',
};
export type ExamSettings = typeof DEFAULT_SETTINGS;
