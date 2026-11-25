// Turns links people paste (YouTube/Spotify URLs, or an old <iframe> embed code) into safe embed URLs.
// Only YouTube and Spotify hosts are accepted; anything else returns null.

export type YoutubeLink = { videoId?: string; playlistId?: string };

const videoPattern = /^[A-Za-z0-9_-]{11}$/;
const playlistPattern = /^[A-Za-z0-9_-]{10,64}$/;

function toUrl(input: string): URL | null {
  let text = input.trim();
  const src = text.match(/<iframe[^>]*\ssrc=["']([^"']+)["']/i);
  if (src) text = src[1];
  if (!/^https?:\/\//i.test(text)) text = 'https://' + text;
  try { return new URL(text); } catch { return null; }
}

export function parseYoutube(input: string): YoutubeLink | null {
  const url = toUrl(input);
  if (!url) return null;
  const host = url.hostname.replace(/^(www|m|music)\./, '');
  let videoId: string | undefined;
  if (host === 'youtu.be') videoId = url.pathname.slice(1).split('/')[0];
  else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    const [, first, second] = url.pathname.split('/');
    if (first === 'watch') videoId = url.searchParams.get('v') ?? undefined;
    else if (['embed', 'live', 'shorts', 'v'].includes(first) && second !== 'videoseries') videoId = second;
  } else return null;
  const playlistId = url.searchParams.get('list') ?? undefined;
  const link: YoutubeLink = {
    ...(videoId && videoPattern.test(videoId) ? { videoId } : {}),
    ...(playlistId && playlistPattern.test(playlistId) ? { playlistId } : {})
  };
  return link.videoId || link.playlistId ? link : null;
}

export const youtubeThumbnail = (videoId: string) => `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

export function embedUrl(input?: string): string | null {
  if (!input?.trim()) return null;
  const youtube = parseYoutube(input);
  if (youtube?.playlistId) return `https://www.youtube.com/embed/videoseries?list=${youtube.playlistId}`;
  if (youtube?.videoId) return `https://www.youtube.com/embed/${youtube.videoId}`;
  const url = toUrl(input);
  if (url?.hostname !== 'open.spotify.com') return null;
  const parts = url.pathname.split('/').filter(part => part && part !== 'embed' && !part.startsWith('intl-'));
  const [kind, id] = parts;
  if (!['playlist', 'album', 'track', 'artist', 'show', 'episode'].includes(kind) || !/^[A-Za-z0-9]+$/.test(id ?? '')) return null;
  return `https://open.spotify.com/embed/${kind}/${id}`;
}
