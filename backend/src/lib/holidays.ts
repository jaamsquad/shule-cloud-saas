/**
 * Public holidays, religious observances and international observance days — computed, not
 * hard-coded per year, so the calendar keeps working correctly every future year with zero
 * maintenance.
 *
 * - Easter-anchored dates (Good Friday, Easter Sunday/Monday, UK Mothering Sunday) use the
 *   Anonymous Gregorian / Meeus–Jones–Butcher algorithm.
 * - Islamic (Hijri) dates (Ramadan, Eid al-Fitr, Eid al-Adha, Islamic New Year, Mawlid) use the
 *   civil/tabular Islamic calendar (Dershowitz & Reingold, "Calendrical Calculations") — a
 *   well-defined arithmetic approximation. The real date of each depends on local moon sighting
 *   and can shift by a day or two; every Islamic event is returned with `approxDate: true` and a
 *   note saying so, and is never presented as more certain than that.
 * - "Second Sunday of May" / "third Sunday of June" style rules compute Mother's/Father's Day
 *   per the convention a country actually uses (not a single hard-coded global date).
 *
 * Country coverage is a small, explicit registry (`COUNTRIES`) rather than a hard-coded list of
 * dates — adding a country is adding one entry, not a migration.
 */

export type HolidayCategory = 'PUBLIC_HOLIDAY' | 'RELIGIOUS' | 'INTERNATIONAL';

export interface HolidayEvent {
    id: string;                 // stable, deterministic — safe to use as a synthetic calendar event id
    title: string;
    eventDate: string;          // YYYY-MM-DD
    category: HolidayCategory;
    isPublicHoliday: boolean;   // officially gazetted non-working day in `country`
    isObservance: boolean;      // marked/celebrated, whether or not it is a day off
    approxDate: boolean;        // true for moon-sighting-dependent Islamic dates
    country: string | null;     // ISO 3166-1 alpha-2, or null for international/religious days shown everywhere
    source: 'public_holiday' | 'religious' | 'international';
    note?: string;
}

const pad2 = (n: number) => String(n).padStart(2, '0');
const toIso = (y: number, m: number, d: number) => `${y}-${pad2(m)}-${pad2(d)}`;

// ── Easter (Gregorian calendar, Western/Christian churches) ────────────────────────────────────
/** Anonymous Gregorian algorithm (Meeus/Jones/Butcher). Returns {month, day} (1-based month). */
function easterSunday(year: number): { month: number; day: number } {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return { month, day };
}
const addDaysToYmd = (year: number, month: number, day: number, delta: number) => {
    const d = new Date(Date.UTC(year, month - 1, day));
    d.setUTCDate(d.getUTCDate() + delta);
    return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
};

// ── Islamic (Hijri) calendar — civil/tabular approximation ─────────────────────────────────────
// R.D. (fixed date, day 1 = 0001-01-01 proleptic Gregorian) of 1 Muharram, AH 1, and of the
// Unix epoch, per Dershowitz & Reingold's "Calendrical Calculations" — standard constants used
// by most open-source Hijri converters.
const ISLAMIC_EPOCH_RD = 227014;
const UNIX_EPOCH_RD = 719163;

function islamicToFixed(year: number, month: number, day: number): number {
    return (year - 1) * 354 + Math.floor((3 + 11 * year) / 30) + 29 * (month - 1) + Math.floor(month / 2) + day + ISLAMIC_EPOCH_RD - 1;
}
function fixedToGregorianYmd(rd: number): { year: number; month: number; day: number } {
    const ms = Date.UTC(1970, 0, 1) + (rd - UNIX_EPOCH_RD) * 86400000;
    const d = new Date(ms);
    return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}
function islamicToGregorian(hYear: number, hMonth: number, hDay: number) {
    return fixedToGregorianYmd(islamicToFixed(hYear, hMonth, hDay));
}
/** Every Gregorian-year occurrence of a given Hijri (month, day) — usually one, occasionally two. */
function islamicDatesInGregorianYear(targetYear: number, hMonth: number, hDay: number): { year: number; month: number; day: number }[] {
    const estimate = Math.floor((targetYear - 622) * (33 / 32));
    const hits: { year: number; month: number; day: number }[] = [];
    for (let hy = estimate - 1; hy <= estimate + 2; hy++) {
        const g = islamicToGregorian(hy, hMonth, hDay);
        if (g.year === targetYear) hits.push(g);
    }
    return hits;
}

// ── "Nth weekday of month" (for Mother's/Father's Day style rules) ─────────────────────────────
/** nth (1-based) occurrence of `weekday` (0=Sun..6=Sat) in `month`. */
function nthWeekdayOfMonth(year: number, month: number, weekday: number, n: number): { month: number; day: number } {
    const first = new Date(Date.UTC(year, month - 1, 1));
    const firstWeekday = first.getUTCDay();
    const offset = (weekday - firstWeekday + 7) % 7;
    const day = 1 + offset + (n - 1) * 7;
    return { month, day };
}

type MothersDayRule = 'second-sunday-may' | 'uk-mothering-sunday';
type FathersDayRule = 'third-sunday-june';

interface CountryConfig {
    name: string;
    fixedPublicHolidays: { month: number; day: number; name: string }[];
    goodFriday: boolean;
    easterMonday: boolean;
    eidIsPublicHoliday: boolean;
    mothersDay: MothersDayRule;
    fathersDay: FathersDayRule;
    includeDayOfAfricanChild: boolean;
}

/** Small, explicit, extensible registry — add a country by adding one entry here. */
export const COUNTRIES: Record<string, CountryConfig> = {
    KE: {
        name: 'Kenya',
        fixedPublicHolidays: [
            { month: 1, day: 1, name: "New Year's Day" },
            { month: 5, day: 1, name: 'Labour Day' },
            { month: 6, day: 1, name: 'Madaraka Day' },
            { month: 10, day: 10, name: 'Huduma Day' },
            { month: 10, day: 20, name: 'Mashujaa Day' },
            { month: 12, day: 12, name: 'Jamhuri Day' },
            { month: 12, day: 25, name: 'Christmas Day' },
            { month: 12, day: 26, name: 'Boxing Day (Utamaduni Day)' },
        ],
        goodFriday: true, easterMonday: true, eidIsPublicHoliday: true,
        mothersDay: 'second-sunday-may', fathersDay: 'third-sunday-june', includeDayOfAfricanChild: true,
    },
    NG: {
        name: 'Nigeria',
        fixedPublicHolidays: [
            { month: 1, day: 1, name: "New Year's Day" },
            { month: 5, day: 1, name: "Workers' Day" },
            { month: 6, day: 12, name: 'Democracy Day' },
            { month: 10, day: 1, name: 'Independence Day' },
            { month: 12, day: 25, name: 'Christmas Day' },
            { month: 12, day: 26, name: 'Boxing Day' },
        ],
        goodFriday: true, easterMonday: true, eidIsPublicHoliday: true,
        mothersDay: 'second-sunday-may', fathersDay: 'third-sunday-june', includeDayOfAfricanChild: true,
    },
    UG: {
        name: 'Uganda',
        fixedPublicHolidays: [
            { month: 1, day: 1, name: "New Year's Day" },
            { month: 1, day: 26, name: 'Liberation Day' },
            { month: 3, day: 8, name: "International Women's Day" },
            { month: 5, day: 1, name: 'Labour Day' },
            { month: 6, day: 9, name: 'Heroes Day' },
            { month: 10, day: 9, name: 'Independence Day' },
            { month: 12, day: 25, name: 'Christmas Day' },
            { month: 12, day: 26, name: 'Boxing Day' },
        ],
        goodFriday: true, easterMonday: true, eidIsPublicHoliday: true,
        mothersDay: 'second-sunday-may', fathersDay: 'third-sunday-june', includeDayOfAfricanChild: true,
    },
    TZ: {
        name: 'Tanzania',
        fixedPublicHolidays: [
            { month: 1, day: 1, name: "New Year's Day" },
            { month: 1, day: 12, name: 'Zanzibar Revolution Day' },
            { month: 4, day: 26, name: 'Union Day' },
            { month: 5, day: 1, name: 'Workers Day' },
            { month: 7, day: 7, name: 'Saba Saba Day' },
            { month: 8, day: 8, name: 'Farmers Day (Nane Nane)' },
            { month: 10, day: 14, name: 'Mwalimu Nyerere Day' },
            { month: 12, day: 9, name: 'Independence Day' },
            { month: 12, day: 25, name: 'Christmas Day' },
            { month: 12, day: 26, name: 'Boxing Day' },
        ],
        goodFriday: true, easterMonday: true, eidIsPublicHoliday: true,
        mothersDay: 'second-sunday-may', fathersDay: 'third-sunday-june', includeDayOfAfricanChild: true,
    },
    GB: {
        name: 'United Kingdom',
        fixedPublicHolidays: [
            { month: 1, day: 1, name: "New Year's Day" },
            { month: 12, day: 25, name: 'Christmas Day' },
            { month: 12, day: 26, name: 'Boxing Day' },
        ],
        goodFriday: true, easterMonday: true, eidIsPublicHoliday: false,
        mothersDay: 'uk-mothering-sunday', fathersDay: 'third-sunday-june', includeDayOfAfricanChild: false,
    },
    US: {
        name: 'United States',
        fixedPublicHolidays: [
            { month: 1, day: 1, name: "New Year's Day" },
            { month: 7, day: 4, name: 'Independence Day' },
            { month: 12, day: 25, name: 'Christmas Day' },
        ],
        goodFriday: false, easterMonday: false, eidIsPublicHoliday: false,
        mothersDay: 'second-sunday-may', fathersDay: 'third-sunday-june', includeDayOfAfricanChild: false,
    },
};
export const DEFAULT_COUNTRY = 'KE';
const countryConfig = (country: string) => COUNTRIES[country] || COUNTRIES[DEFAULT_COUNTRY];

// ── Fixed-date international observance days (not public holidays anywhere) ────────────────────
const INTERNATIONAL_FIXED: { month: number; day: number; name: string }[] = [
    { month: 1, day: 24, name: 'International Day of Education' },
    { month: 2, day: 14, name: "Valentine's Day" },
    { month: 3, day: 8, name: "International Women's Day" },
    { month: 4, day: 7, name: 'World Health Day' },
    { month: 4, day: 23, name: 'World Book Day' },
    { month: 6, day: 5, name: 'World Environment Day' },
    { month: 8, day: 12, name: 'International Youth Day' },
    { month: 10, day: 5, name: "World Teachers' Day" },
    { month: 10, day: 16, name: 'World Food Day' },
    { month: 11, day: 19, name: "International Men's Day" },
    { month: 11, day: 20, name: "Universal Children's Day" },
    { month: 12, day: 10, name: 'Human Rights Day' },
];

/** All holidays and observances for one calendar year, scoped to `country`. */
export function getHolidaysForYear(year: number, country: string = DEFAULT_COUNTRY): HolidayEvent[] {
    const cfg = countryConfig(country);
    const cc = COUNTRIES[country] ? country : DEFAULT_COUNTRY;
    const out: HolidayEvent[] = [];

    // Country public holidays (fixed-date)
    for (const h of cfg.fixedPublicHolidays) {
        out.push({
            id: `holiday-${cc}-${year}-${pad2(h.month)}${pad2(h.day)}-${h.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
            title: h.name, eventDate: toIso(year, h.month, h.day), category: 'PUBLIC_HOLIDAY',
            isPublicHoliday: true, isObservance: true, approxDate: false, country: cc, source: 'public_holiday',
        });
    }

    // Easter-anchored
    const easter = easterSunday(year);
    out.push({
        id: `religious-${year}-easter-sunday`, title: 'Easter Sunday', eventDate: toIso(year, easter.month, easter.day),
        category: 'RELIGIOUS', isPublicHoliday: false, isObservance: true, approxDate: false, country: null, source: 'religious',
    });
    const goodFriday = addDaysToYmd(year, easter.month, easter.day, -2);
    const easterMonday = addDaysToYmd(year, easter.month, easter.day, 1);
    if (cfg.goodFriday) {
        out.push({ id: `holiday-${cc}-${year}-good-friday`, title: 'Good Friday', eventDate: toIso(goodFriday.year, goodFriday.month, goodFriday.day), category: 'PUBLIC_HOLIDAY', isPublicHoliday: true, isObservance: true, approxDate: false, country: cc, source: 'public_holiday' });
    } else {
        out.push({ id: `religious-${year}-good-friday`, title: 'Good Friday', eventDate: toIso(goodFriday.year, goodFriday.month, goodFriday.day), category: 'RELIGIOUS', isPublicHoliday: false, isObservance: true, approxDate: false, country: null, source: 'religious' });
    }
    if (cfg.easterMonday) {
        out.push({ id: `holiday-${cc}-${year}-easter-monday`, title: 'Easter Monday', eventDate: toIso(easterMonday.year, easterMonday.month, easterMonday.day), category: 'PUBLIC_HOLIDAY', isPublicHoliday: true, isObservance: true, approxDate: false, country: cc, source: 'public_holiday' });
    }
    if (cfg.mothersDay === 'uk-mothering-sunday') {
        const ms = addDaysToYmd(year, easter.month, easter.day, -21);
        out.push({ id: `international-${year}-mothers-day`, title: "Mother's Day (Mothering Sunday)", eventDate: toIso(ms.year, ms.month, ms.day), category: 'INTERNATIONAL', isPublicHoliday: false, isObservance: true, approxDate: false, country: cc, source: 'international' });
    }

    // Mother's / Father's Day (US-convention countries — computed per year, not hard-coded)
    if (cfg.mothersDay === 'second-sunday-may') {
        const md = nthWeekdayOfMonth(year, 5, 0, 2);
        out.push({ id: `international-${year}-mothers-day`, title: "Mother's Day", eventDate: toIso(year, md.month, md.day), category: 'INTERNATIONAL', isPublicHoliday: false, isObservance: true, approxDate: false, country: cc, source: 'international' });
    }
    if (cfg.fathersDay === 'third-sunday-june') {
        const fd = nthWeekdayOfMonth(year, 6, 0, 3);
        out.push({ id: `international-${year}-fathers-day`, title: "Father's Day", eventDate: toIso(year, fd.month, fd.day), category: 'INTERNATIONAL', isPublicHoliday: false, isObservance: true, approxDate: false, country: cc, source: 'international' });
    }

    // Islamic (Hijri) — approximate, moon-sighting dependent
    const moonNote = 'Approximate date — the actual day depends on local moon sighting and may differ by a day or two, and (where it is a public holiday) is only confirmed once gazetted.';
    const islamic = (hMonth: number, hDay: number, title: string, asPublicHoliday: boolean) => {
        for (const g of islamicDatesInGregorianYear(year, hMonth, hDay)) {
            out.push({
                id: `${asPublicHoliday ? 'holiday' : 'religious'}-${cc}-${year}-${g.month}-${g.day}-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
                title, eventDate: toIso(g.year, g.month, g.day), category: asPublicHoliday ? 'PUBLIC_HOLIDAY' : 'RELIGIOUS',
                isPublicHoliday: asPublicHoliday, isObservance: true, approxDate: true,
                country: asPublicHoliday ? cc : null, source: asPublicHoliday ? 'public_holiday' : 'religious', note: moonNote,
            });
        }
    };
    islamic(9, 1, 'Ramadan begins', false);
    islamic(10, 1, 'Eid al-Fitr', cfg.eidIsPublicHoliday);
    islamic(12, 10, 'Eid al-Adha', cfg.eidIsPublicHoliday);
    islamic(1, 1, 'Islamic New Year', false);
    islamic(3, 12, 'Mawlid (Prophet’s Birthday)', false);

    // International observance days
    for (const d of INTERNATIONAL_FIXED) {
        out.push({ id: `international-${year}-${pad2(d.month)}${pad2(d.day)}-${d.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`, title: d.name, eventDate: toIso(year, d.month, d.day), category: 'INTERNATIONAL', isPublicHoliday: false, isObservance: true, approxDate: false, country: null, source: 'international' });
    }
    if (cfg.includeDayOfAfricanChild) {
        out.push({ id: `international-${year}-day-of-african-child`, title: 'Day of the African Child', eventDate: toIso(year, 6, 16), category: 'INTERNATIONAL', isPublicHoliday: false, isObservance: true, approxDate: false, country: cc, source: 'international' });
    }

    return out.sort((a, b) => a.eventDate.localeCompare(b.eventDate));
}

/** Holidays/observances across every Gregorian year a [start, end] date range touches. */
export function getHolidaysInRange(start: string, end: string, country: string = DEFAULT_COUNTRY): HolidayEvent[] {
    const y1 = Number(start.slice(0, 4)) || new Date().getFullYear();
    const y2 = Number(end.slice(0, 4)) || y1;
    const out: HolidayEvent[] = [];
    for (let y = y1; y <= y2; y++) out.push(...getHolidaysForYear(y, country));
    return out.filter(h => h.eventDate >= start && h.eventDate <= end);
}
