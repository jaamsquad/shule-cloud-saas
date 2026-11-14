/**
 * Ready-made SMS wishes for the holidays/observances holidays.ts already computes (Eid,
 * Christmas, Mother's/Father's Day, World Teachers' Day, etc.) — a school picks one, picks who
 * to send it to, and it goes out branded with the school name, same as any other SMS
 * (services/smsGateway.service.ts). Afey (lib/afey.ts) is handed this same list so when asked to
 * draft a holiday wish it quotes one of these instead of inventing its own.
 *
 * Only occasions people actually wish each other on are templated here — national/public-sector
 * days (Jamhuri Day, Madaraka Day, …) are left out on purpose; a school can still ask Afey to
 * draft something for those.
 */
import { HolidayEvent } from './holidays';

export interface GreetingTemplate { key: string; title: string; message: string }

const norm = (v: string) => String(v || '').toLowerCase().replace(/[^a-z0-9]+/g, '');

/** `{school}` is filled in automatically (queueSms brands every SMS with the school name
 *  already, so templates don't need to repeat it) — kept here only for occasions where it
 *  reads better inline. */
const TEMPLATES: GreetingTemplate[] = [
    { key: 'new-years-day', title: "New Year's Day", message: "Happy New Year! Wishing you and your family a year full of health, joy and success." },
    { key: 'easter-sunday', title: 'Easter Sunday', message: 'Happy Easter! May this season bring you peace, hope and joy.' },
    { key: 'good-friday', title: 'Good Friday', message: 'Wishing you a peaceful and reflective Good Friday.' },
    { key: 'ramadan-begins', title: 'Ramadan begins', message: 'Ramadan Kareem! Wishing you a blessed month of reflection, peace and togetherness.' },
    { key: 'eid-al-fitr', title: 'Eid al-Fitr', message: 'Eid Mubarak! Wishing you and your family joy, peace and prosperity this Eid al-Fitr.' },
    { key: 'eid-al-adha', title: 'Eid al-Adha', message: 'Eid Mubarak! Wishing you and your family a blessed Eid al-Adha.' },
    { key: 'islamic-new-year', title: 'Islamic New Year', message: 'Happy Islamic New Year! Wishing you a year of peace and blessings.' },
    { key: 'mawlid', title: "Mawlid (Prophet’s Birthday)", message: 'Wishing you a blessed Mawlid.' },
    { key: 'mothers-day', title: "Mother's Day", message: "Happy Mother's Day to all the amazing mothers in our school community — thank you for everything you do!" },
    { key: 'fathers-day', title: "Father's Day", message: "Happy Father's Day to all the wonderful fathers in our school community — thank you for your support!" },
    { key: 'world-teachers-day', title: "World Teachers' Day", message: "Happy World Teachers' Day! Thank you to every teacher shaping our learners' futures." },
    { key: 'valentines-day', title: "Valentine's Day", message: 'Happy Valentine’s Day! Wishing our school community a day full of love and kindness.' },
    { key: 'international-womens-day', title: "International Women's Day", message: "Happy International Women's Day! Celebrating the strength and achievements of the women in our school community." },
    { key: 'universal-childrens-day', title: "Universal Children's Day", message: "Happy Children's Day! Wishing every learner joy, curiosity and a bright future." },
    { key: 'day-of-the-african-child', title: 'Day of the African Child', message: "Happy Day of the African Child! Celebrating every child's right to learn and thrive." },
    { key: 'christmas-day', title: 'Christmas Day', message: 'Merry Christmas! Wishing you and your family a joyful holiday season.' },
    { key: 'boxing-day', title: 'Boxing Day (Utamaduni Day)', message: 'Wishing you a wonderful Boxing Day with family and friends.' },
];

export const GREETING_TEMPLATES = TEMPLATES;
const byKey = new Map(TEMPLATES.map(t => [t.key, t]));
const byTitleNorm = new Map(TEMPLATES.map(t => [norm(t.title), t]));

export const greetingByKey = (key: string): GreetingTemplate | null => byKey.get(key) || null;
/** Best-effort match — tolerates a title that's close but not byte-identical (e.g. "Boxing Day"). */
export const greetingForTitle = (title: string): GreetingTemplate | null => {
    const n = norm(title);
    if (byTitleNorm.has(n)) return byTitleNorm.get(n)!;
    const hit = TEMPLATES.find(t => n.includes(norm(t.key.replace(/-/g, ' '))) || norm(t.title).includes(n) || n.includes(norm(t.title)));
    return hit || null;
};

/** This year's holidays/observances that have a ready wish, nearest first. */
export function upcomingGreetableOccasions(holidays: HolidayEvent[], fromDate: string): (HolidayEvent & { template: GreetingTemplate })[] {
    return holidays
        .map(h => ({ ...h, template: greetingForTitle(h.title) }))
        .filter((h): h is HolidayEvent & { template: GreetingTemplate } => !!h.template)
        .filter(h => h.eventDate >= fromDate)
        .sort((a, b) => a.eventDate.localeCompare(b.eventDate));
}
