// Plain dates ("YYYY-MM-DD") in Oslo time, Norwegian names, and public holidays (they change the traffic,
// so they are left out of the "normal day" and mentioned when they explain a quiet day).

export const addDays = (day: string, n: number) => {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/** 0 = Sunday … 6 = Saturday */
export const weekday = (day: string) => new Date(`${day}T12:00:00Z`).getUTCDay();

export const DAYS = ['søndag', 'mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag'];
/** Plural, for "en vanlig onsdag" vs "de siste fire onsdagene". */
export const DAYS_PLURAL = ['søndagene', 'mandagene', 'tirsdagene', 'onsdagene', 'torsdagene', 'fredagene', 'lørdagene'];
const MONTHS = ['januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'desember'];

/** "onsdag 28. oktober" */
export const dayText = (day: string) => `${DAYS[weekday(day)]} ${Number(day.slice(8, 10))}. ${MONTHS[Number(day.slice(5, 7)) - 1]}`;

export const osloToday = (now = new Date()) => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Oslo' }).format(now);

/** "+01:00" or "+02:00" for Oslo at noon that day. */
export function osloOffset(day: string): string {
  const part = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Oslo', timeZoneName: 'longOffset' }).formatToParts(new Date(`${day}T12:00:00Z`)).find((p) => p.type === 'timeZoneName')?.value ?? 'GMT+01:00';
  return part.replace('GMT', '') || '+00:00';
}

/** Oslo midnight at the start of the day, as the traffic API wants it. */
export const osloMidnight = (day: string) => `${day}T00:00:00${osloOffset(day)}`;

/** Easter Sunday (anonymous Gregorian algorithm). */
export function easter(year: number): string {
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
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Norwegian public holidays (helligdager) of a year, date → name. */
export function holidays(year: number): Record<string, string> {
  const e = easter(year);
  return {
    [`${year}-01-01`]: '1. nyttårsdag',
    [addDays(e, -3)]: 'skjærtorsdag',
    [addDays(e, -2)]: 'langfredag',
    [e]: '1. påskedag',
    [addDays(e, 1)]: '2. påskedag',
    [`${year}-05-01`]: '1. mai',
    [`${year}-05-17`]: '17. mai',
    [addDays(e, 39)]: 'Kristi himmelfartsdag',
    [addDays(e, 49)]: '1. pinsedag',
    [addDays(e, 50)]: '2. pinsedag',
    [`${year}-12-25`]: '1. juledag',
    [`${year}-12-26`]: '2. juledag',
  };
}

export const holidayName = (day: string): string | null => holidays(Number(day.slice(0, 4)))[day] ?? null;

/** ISO week number. */
export function isoWeek(day: string): { year: number; week: number } {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 3 - ((d.getUTCDay() + 6) % 7));
  const year = d.getUTCFullYear();
  const firstThursday = new Date(Date.UTC(year, 0, 4));
  firstThursday.setUTCDate(firstThursday.getUTCDate() + 3 - ((firstThursday.getUTCDay() + 6) % 7));
  return { year, week: 1 + Math.round((d.getTime() - firstThursday.getTime()) / (7 * 864e5)) };
}
