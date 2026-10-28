// Reels reach people who do not follow the account yet, so each story set is also published as a short Reel
// (9:16, the same images one after another). It goes to the Reels tab only, so the grid gets no duplicates.
// ffmpeg comes from the ffmpeg-static package, so it works the same locally and on GitHub.

import { spawnSync } from 'node:child_process';
import ffmpegPath from 'ffmpeg-static';

/** One image stays 7 s; several get 3.5 s each (a Reel must be at least 3 s). */
export const secondsPer = (images: number) => (images === 1 ? 7 : 3.5);

/** A silent MP4 (H.264, 30 fps, 1080×1920) with an empty AAC track, which Instagram handles best. */
export function makeReel(pngs: string[], out: string): void {
  if (!ffmpegPath) throw new Error('ffmpeg-static has no binary for this platform');
  if (!pngs.length) throw new Error('No images for the Reel');
  const s = secondsPer(pngs.length);
  const args = ['-y', '-loglevel', 'error'];
  for (const p of pngs) args.push('-loop', '1', '-t', String(s), '-i', p);
  args.push('-f', 'lavfi', '-t', String(s * pngs.length), '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100');
  const scaled = pngs.map((_, i) => `[${i}:v]scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30[v${i}]`);
  const filter = `${scaled.join(';')};${pngs.map((_, i) => `[v${i}]`).join('')}concat=n=${pngs.length}:v=1:a=0,format=yuv420p[v]`;
  args.push('-filter_complex', filter, '-map', '[v]', '-map', `${pngs.length}:a`, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-c:a', 'aac', '-b:a', '128k', '-shortest', '-movflags', '+faststart', out);
  const r = spawnSync(ffmpegPath as unknown as string, args, { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`ffmpeg failed: ${(r.stderr || r.error?.message || '').slice(0, 300)}`);
}
