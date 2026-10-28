/** The bankruptcies go out at 08:00 (working days: the day before; Saturday: the week), and until 14:00. */
export const SCHEDULE = { publishTime: '08:00', lastUsefulTime: '14:00' };

export interface Unit {
  /** "2026-10-25-feed" / "2026-10-25-story": the key in data/published.json. */
  key: string;
  date: string;
  kind: 'feed' | 'story';
  images: string[];
  caption: string | null;
  /** Oslo local "YYYY-MM-DDTHH:MM". */
  publishAt: string;
  expiresAt: string;
}

export function unitsFor(date: string, post: { caption: string; images: { feed: string[]; story: string[] } }, stories: boolean): Unit[] {
  const publishAt = `${date}T${SCHEDULE.publishTime}`;
  const expiresAt = `${date}T${SCHEDULE.lastUsefulTime}`;
  const units: Unit[] = [{ key: `${date}-feed`, date, kind: 'feed', images: post.images.feed, caption: post.caption, publishAt, expiresAt }];
  if (stories) units.push({ key: `${date}-story`, date, kind: 'story', images: post.images.story, caption: null, publishAt, expiresAt });
  return units;
}

/** Not yet published, and within the window (unless forced). */
export const isDue = (u: Unit, published: Record<string, unknown>, now: string, force = false) => !published[u.key] && (force || (u.publishAt <= now && now < u.expiresAt));
