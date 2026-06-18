"use strict";
/**
 * Node.js Question Splitter Engine
 * Splits raw extracted examination text into highly structured cognitive question units.
 * Detects question numbers, main question text, sub-questions, marks, instructions, and MCQ options.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.questionSplitterInstance = exports.QuestionSplitterEngine = void 0;
class QuestionSplitterEngine {
    constructor() {
        // Matches "Question 1", "Question 1a", "Q1", "1.", "1)", "1. ", "I.", "A."
        // Group 1: The entire number/letter/roman block
        // Group 2: The actual question text
        this.qPattern = /^(?:[Qq]uestion\s+([0-9]+[a-zA-Z]?|[IVXLCDM]+|[A-Z])|[Qq]([0-9]+[a-zA-Z]?)|([0-9]+[a-zA-Z]?|[IVXLCDM]+|[A-Z])[\.\)])\s+(.*)/;
        // Matches "(a)", "a)", "a.", "i.", "i)", "(i)", "[a]"
        this.subPattern = /^\s*[\(\[]?([0-9]+|[a-z]+|[ivxlcdm]+)[\)\]\.]\s+(.*)/i;
        // Matches MCQ options: A., B., C., D. exactly
        this.mcqPattern = /^\s*([A-E])[\.\)]\s+(.*)/;
        // Marks pattern (e.g. "(5 Marks)", "[10 marks]")
        this.marksPattern = /[\(\[]\s*(\d+)\s*[Mm]arks?\s*[\)\]]/i;
        // Matches "SECTION A", "SECTION 1", "PART I", "PART B", etc.
        this.sectionPattern = /^\s*(?:[Ss][Ee][Cc][Tt][Ii][Oo][Nn]|[Pp][Aa][Rr][Tt])\s+([A-Za-z0-9IVXLCDM]+)(?:[\:\-\.]?\s*(.*))?/i;
    }
    splitIntoQuestions(text) {
        const lines = text.split('\n');
        const questions = [];
        let currentQuestion = null;
        let currentSub = null;
        let currentSection = "General";
        for (const line of lines) {
            const lineStr = line.trim();
            if (!lineStr)
                continue;
            // 1. Check if line is a Section Header (SECTION A, PART I)
            const secMatch = lineStr.match(this.sectionPattern);
            if (secMatch) {
                const secId = secMatch[1].toUpperCase();
                const secTitle = secMatch[2] ? secMatch[2].trim() : "";
                currentSection = secTitle ? `SECTION ${secId} - ${secTitle}` : `SECTION ${secId}`;
                continue; // Do not append section headers to previous questions
            }
            // 2. Check if line is an MCQ option (must do this BEFORE qPattern if main qPattern allows A.)
            const mcqMatch = lineStr.match(this.mcqPattern);
            if (mcqMatch && currentQuestion && currentQuestion.options.length < 5) {
                const optLabel = mcqMatch[1].toUpperCase();
                const optText = mcqMatch[2].trim();
                currentQuestion.options.push(`${optLabel}. ${optText}`);
                continue;
            }
            // 3. Check if line is a main question header
            const qMatch = lineStr.match(this.qPattern);
            if (qMatch) {
                if (currentQuestion) {
                    questions.push(currentQuestion);
                }
                const rawNum = qMatch[1] || qMatch[2] || qMatch[3] || "1";
                const rawContent = qMatch[4] || "";
                const marksMatch = lineStr.match(this.marksPattern);
                const marks = marksMatch ? parseInt(marksMatch[1], 10) : 5;
                const cleanText = rawContent.replace(this.marksPattern, '').trim();
                currentQuestion = {
                    questionNumber: rawNum.toString().trim(),
                    section: currentSection,
                    questionText: cleanText,
                    marks,
                    subQuestions: [],
                    options: [],
                    instructions: "",
                    rawText: lineStr
                };
                currentSub = null;
                continue;
            }
            // 4. Check if line is a sub-question
            const subMatch = lineStr.match(this.subPattern);
            if (subMatch && currentQuestion) {
                const subLabel = subMatch[1];
                const subContent = subMatch[2];
                const marksMatch = lineStr.match(this.marksPattern);
                const subMarks = marksMatch ? parseInt(marksMatch[1], 10) : 2;
                const cleanSubText = subContent.replace(this.marksPattern, '').trim();
                currentSub = {
                    label: subLabel,
                    text: cleanSubText,
                    marks: subMarks
                };
                currentQuestion.subQuestions.push(currentSub);
                continue;
            }
            // 5. Append continuation text
            if (currentSub) {
                currentSub.text += ` ${lineStr}`;
            }
            else if (currentQuestion) {
                if (lineStr.toUpperCase().includes("INSTRUCTION") || lineStr.toUpperCase().includes("ANSWER")) {
                    currentQuestion.instructions += ` ${lineStr}`;
                }
                else {
                    currentQuestion.questionText += ` ${lineStr}`;
                }
            }
        }
        if (currentQuestion) {
            questions.push(currentQuestion);
        }
        // Fallback: if no numbered questions were detected but there IS real text,
        // split on blank lines / sentences so the import is never empty.
        if (questions.length === 0 && text.replace(/\s/g, '').length > 40) {
            const chunks = text
                .split(/\n\s*\n+/)
                .map(c => c.replace(/\s+/g, ' ').trim())
                .filter(c => c.length > 15);
            chunks.slice(0, 100).forEach((c, i) => {
                const marksMatch = c.match(this.marksPattern);
                questions.push({
                    questionNumber: String(i + 1),
                    section: "General",
                    questionText: c.replace(this.marksPattern, '').trim(),
                    marks: marksMatch ? parseInt(marksMatch[1], 10) : 5,
                    subQuestions: [], options: [], instructions: "", rawText: c,
                });
            });
        }
        return questions;
    }
}
exports.QuestionSplitterEngine = QuestionSplitterEngine;
exports.questionSplitterInstance = new QuestionSplitterEngine();
