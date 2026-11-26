// Shared by the API and the frontend: accepts only https Google Meet or Zoom meeting links.
export function parseMeetingLink(input) {
  let url;
  try { url = new URL(String(input || '').trim()); } catch { return null; }
  if (url.protocol !== 'https:') return null;
  const host = url.hostname.toLowerCase();
  if (host === 'meet.google.com' && /^\/[a-z0-9-]{3,}/i.test(url.pathname)) return { provider: 'GOOGLE_MEET', label: 'Google Meet', url: url.href };
  if ((host === 'zoom.us' || host.endsWith('.zoom.us')) && /^\/(j|w|s|my|wc)\//i.test(url.pathname)) return { provider: 'ZOOM', label: 'Zoom', url: url.href };
  return null;
}

// Phase of a schedule from its date and times (browser local time). Without an end time a meeting is
// assumed to last two hours; it counts as live from ten minutes before the start so people can join early.
export function meetingPhase({ date, time, endTime } = {}, now = new Date()) {
  const day = String(date || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !/^\d{2}:\d{2}/.test(String(time || ''))) return null;
  const at = clock => new Date(`${day}T${String(clock || '').slice(0, 5)}:00`);
  const start = at(time);
  if (Number.isNaN(start.getTime())) return null;
  let end = endTime ? at(endTime) : new Date(start.getTime() + 2 * 3600e3);
  if (Number.isNaN(end.getTime()) || end <= start) end = new Date(start.getTime() + 2 * 3600e3);
  const phase = now < new Date(start.getTime() - 10 * 60e3) ? 'UPCOMING' : now < end ? 'LIVE' : 'ENDED';
  return { phase, start, end };
}
