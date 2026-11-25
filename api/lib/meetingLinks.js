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
