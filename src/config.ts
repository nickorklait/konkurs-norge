import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const paths = {
  fonts: path.join(ROOT, 'assets', 'fonts'),
  output: path.join(ROOT, 'output'),
  data: path.join(ROOT, 'data'),
};

export interface Fylke {
  /** Two digits, the first two of the municipality number ("03"). */
  nummer: string;
  navn: string;
}

export interface Config {
  brand: { name: string; tagline: string; hashtags: string[] };
  fylker: Fylke[];
  source: { brreg: string; ssb: string; short: string; userAgent: string };
  colors: { surface: string; panel: string; line: string; text: string; muted: string; accent: string; up: string; down: string; normal: string };
  sponsor: { label: string; text: string };
}

export function loadConfig(): Config {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'config.json'), 'utf8'));
}
