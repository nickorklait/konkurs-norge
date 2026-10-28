// Dashboard actions and their validation. No Node imports: this file is also bundled into the
// Cloudflare function, which validates actions before they reach GitHub.

export interface DashboardSettings {
  /** Stories (cover + hour grid) alongside the feed post. */
  stories?: boolean;
}

export type ControlAction =
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'skip'; key: string }
  | { type: 'unskip'; key: string }
  | { type: 'caption'; key: string; text: string | null }
  | { type: 'publish-now'; key: string }
  | { type: 'settings'; settings: DashboardSettings };

/** Publication keys from the plan: "2026-10-25-feed", "2026-10-25-story". */
export const UNIT_KEY = /^\d{4}-\d{2}-\d{2}-(feed|story)$/;
/** Instagram's caption limit. */
export const MAX_CAPTION = 2200;

const fail = (msg: string): never => {
  throw new Error(msg);
};
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : fail('Ugyldig forespørsel.'));
const key = (v: unknown): string => (typeof v === 'string' && UNIT_KEY.test(v) ? v : fail('Ugyldig innleggsnøkkel.'));

/** Parse and validate an action from the dashboard. Throws an Error with a Norwegian message. */
export function parseAction(input: unknown): ControlAction {
  const a = obj(input);
  switch (a.type) {
    case 'pause':
    case 'resume':
      return { type: a.type };
    case 'skip':
    case 'unskip':
    case 'publish-now':
      return { type: a.type, key: key(a.key) };
    case 'caption': {
      if (a.text === null) return { type: 'caption', key: key(a.key), text: null };
      if (typeof a.text !== 'string' || !a.text.trim()) return fail('Teksten kan ikke være tom.');
      if (a.text.length > MAX_CAPTION) return fail(`Teksten er for lang (maks ${MAX_CAPTION} tegn).`);
      return { type: 'caption', key: key(a.key), text: a.text.trim() };
    }
    case 'settings': {
      const s = obj(a.settings);
      if (typeof s.stories !== 'boolean') return fail('Stories må være av eller på.');
      return { type: 'settings', settings: { stories: s.stories } };
    }
    default:
      return fail('Ukjent handling.');
  }
}

/** Short Norwegian description for the activity log. */
export function describeAction(a: ControlAction): string {
  switch (a.type) {
    case 'pause':
      return 'Satte automatisk publisering på pause';
    case 'resume':
      return 'Startet automatisk publisering igjen';
    case 'skip':
      return `Hoppet over ${a.key}`;
    case 'unskip':
      return `Angret hopp over for ${a.key}`;
    case 'caption':
      return a.text === null ? `Tilbakestilte teksten for ${a.key}` : `Endret teksten for ${a.key}`;
    case 'publish-now':
      return `Publiserte ${a.key} manuelt`;
    case 'settings':
      return `Stories ${a.settings.stories ? 'på' : 'av'}`;
  }
}
