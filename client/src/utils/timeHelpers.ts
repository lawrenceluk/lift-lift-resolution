/**
 * Time helpers for the seam contract: performedDate is always the
 * America/Los_Angeles calendar date (D8) — never a UTC slice.
 */

const PT_FORMAT = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Los_Angeles',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** YYYY-MM-DD in America/Los_Angeles for a given instant (default: now). */
export function ptDate(d: Date = new Date()): string {
  return PT_FORMAT.format(d);
}

export function todayPT(): string {
  return ptDate();
}

/**
 * Slugify a session name — MUST match the server's slugify
 * (server/lib/point-one-store.ts) so the client can predict its log filename.
 */
export function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'session';
}

/** The log filename a performed session will be (or was) delivered as. */
export function logFileName(name: string, performedDate: string): string {
  return `${performedDate}-${slugify(name)}.json`;
}
