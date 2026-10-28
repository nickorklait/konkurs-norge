import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './config.ts';
import { describeAction, type ControlAction, type DashboardSettings } from './controlsSchema.ts';

/** Everything changed from the dashboard. Stored in data/controls.json (committed). */
export interface Controls {
  paused: boolean;
  /** Publication keys that must not be published. */
  skip: string[];
  /** Edited captions by publication key (feed). */
  captions: Record<string, string>;
  settings: DashboardSettings;
  /** Newest first. */
  log: { at: string; by: string; action: string }[];
}

const MAX_LOG = 200;
const FILE = path.join(ROOT, 'data', 'controls.json');
export const EMPTY_CONTROLS: Controls = { paused: false, skip: [], captions: {}, settings: {}, log: [] };

export function readControls(file = FILE): Controls {
  return fs.existsSync(file) ? { ...structuredClone(EMPTY_CONTROLS), ...JSON.parse(fs.readFileSync(file, 'utf8')) } : structuredClone(EMPTY_CONTROLS);
}

export function writeControls(c: Controls, file = FILE): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(c, null, 2) + '\n');
}

/** Apply one dashboard action. Pure: returns new controls. */
export function applyAction(c: Controls, a: ControlAction, by: string, at = new Date().toISOString()): Controls {
  const next: Controls = structuredClone(c);
  switch (a.type) {
    case 'pause':
      next.paused = true;
      break;
    case 'resume':
      next.paused = false;
      break;
    case 'skip':
      if (!next.skip.includes(a.key)) next.skip.push(a.key);
      break;
    case 'unskip':
      next.skip = next.skip.filter((k) => k !== a.key);
      break;
    case 'caption':
      if (a.text === null) delete next.captions[a.key];
      else next.captions[a.key] = a.text;
      break;
    case 'settings':
      next.settings = { ...next.settings, ...a.settings };
      break;
    case 'publish-now':
      break; // only logged; the workflow publishes
  }
  next.log = [{ at, by, action: describeAction(a) }, ...next.log].slice(0, MAX_LOG);
  return next;
}
