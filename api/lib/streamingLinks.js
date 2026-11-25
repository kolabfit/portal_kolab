// Shared by the API (validation) and the frontend (preview): turns a pasted YouTube or Spotify link,
// or an old <iframe> embed code, into a safe embed URL. Any other host returns null.

const videoPattern = /^[A-Za-z0-9_-]{11}$/;
const playlistPattern = /^[A-Za-z0-9_-]{10,64}$/;
const spotifyKinds = ['playlist', 'album', 'track', 'artist', 'show', 'episode'];

function toUrl(input) {
  let text = String(input ?? '').trim();
  const src = text.match(/<iframe[^>]*\ssrc=["']([^"']+)["']/i);
  if (src) text = src[1];
  if (!text) return null;
  if (!/^https?:\/\//i.test(text)) text = 'https://' + text;
  try { return new URL(text); } catch { return null; }
}

export function parseYoutube(input) {
  const url = toUrl(input);
  if (!url) return null;
  const host = url.hostname.replace(/^(www|m|music)\./, '');
  let videoId;
  if (host === 'youtu.be') videoId = url.pathname.slice(1).split('/')[0];
  else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    const [, first, second] = url.pathname.split('/');
    if (first === 'watch') videoId = url.searchParams.get('v') ?? undefined;
    else if (['embed', 'live', 'shorts', 'v'].includes(first) && second !== 'videoseries') videoId = second;
  } else return null;
  const playlistId = url.searchParams.get('list') ?? undefined;
  const link = {
    ...(videoId && videoPattern.test(videoId) ? { videoId } : {}),
    ...(playlistId && playlistPattern.test(playlistId) ? { playlistId } : {})
  };
  return link.videoId || link.playlistId ? link : null;
}

/**
 * @returns {{ provider: 'YOUTUBE' | 'SPOTIFY', kind: string, url: string, embedUrl: string, thumbnail: string } | null}
 */
export function parseStreamingLink(input) {
  const youtube = parseYoutube(input);
  if (youtube?.playlistId) return {
    provider: 'YOUTUBE', kind: 'playlist',
    url: `https://www.youtube.com/playlist?list=${youtube.playlistId}`,
    embedUrl: `https://www.youtube.com/embed/videoseries?list=${youtube.playlistId}`,
    thumbnail: youtube.videoId ? `https://i.ytimg.com/vi/${youtube.videoId}/hqdefault.jpg` : ''
  };
  if (youtube?.videoId) return {
    provider: 'YOUTUBE', kind: 'video',
    url: `https://www.youtube.com/watch?v=${youtube.videoId}`,
    embedUrl: `https://www.youtube.com/embed/${youtube.videoId}`,
    thumbnail: `https://i.ytimg.com/vi/${youtube.videoId}/hqdefault.jpg`
  };
  const url = toUrl(input);
  if (url?.hostname !== 'open.spotify.com') return null;
  const [kind, id] = url.pathname.split('/').filter(part => part && part !== 'embed' && !part.startsWith('intl-'));
  if (!spotifyKinds.includes(kind) || !/^[A-Za-z0-9]{10,40}$/.test(id ?? '')) return null;
  return {
    provider: 'SPOTIFY', kind,
    url: `https://open.spotify.com/${kind}/${id}`,
    embedUrl: `https://open.spotify.com/embed/${kind}/${id}`,
    thumbnail: ''
  };
}
