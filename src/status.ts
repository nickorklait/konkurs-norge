import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './config.ts';

/** Outcome of the last generate / publish, shown on the dashboard. Committed in the cloud. */
export interface Status {
  generate?: { at: string; date: string; total: number; diff: number; passed: number; errors: string[]; warnings: string[] };
  publish?: { at: string; paused: boolean; published: string[]; failed: { key: string; error: string }[] };
}

const FILE = path.join(ROOT, 'data', 'status.json');

export function readStatus(): Status {
  return fs.existsSync(FILE) ? JSON.parse(fs.readFileSync(FILE, 'utf8')) : {};
}

/** Only writes when something besides the time changed, so quiet runs make no commits. */
export function updateStatus<K extends keyof Status>(section: K, data: Omit<NonNullable<Status[K]>, 'at'>): void {
  const s = readStatus();
  const { at: _, ...prev } = (s[section] ?? {}) as { at?: string };
  if (JSON.stringify(prev) === JSON.stringify(data)) return;
  s[section] = { at: new Date().toISOString(), ...data } as Status[K];
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(s, null, 2) + '\n');
}
