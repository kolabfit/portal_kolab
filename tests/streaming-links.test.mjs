import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseYoutube, parseStreamingLink } from '../api/lib/streamingLinks.js';

test('YouTube links of every common shape give the video or playlist ID', () => {
  const video = 'dQw4w9WgXcQ', list = 'PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf';
  assert.deepEqual(parseYoutube(`https://www.youtube.com/watch?v=${video}`), { videoId: video });
  assert.deepEqual(parseYoutube(`youtu.be/${video}?si=x`), { videoId: video });
  assert.deepEqual(parseYoutube(`https://m.youtube.com/watch?v=${video}&list=${list}`), { videoId: video, playlistId: list });
  assert.deepEqual(parseYoutube(`https://www.youtube.com/live/${video}`), { videoId: video });
  assert.deepEqual(parseYoutube(`https://youtube.com/shorts/${video}`), { videoId: video });
  assert.deepEqual(parseYoutube(`https://www.youtube.com/playlist?list=${list}`), { playlistId: list });
  assert.equal(parseYoutube('https://evil.example/watch?v=' + video), null);
  assert.equal(parseYoutube('https://www.youtube.com/watch?v=bad'), null);
});

test('links become safe embed URLs for YouTube and Spotify only, including old iframe codes', () => {
  assert.equal(parseStreamingLink('https://www.youtube.com/playlist?list=PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf').embedUrl,
    'https://www.youtube.com/embed/videoseries?list=PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf');
  const spotify = parseStreamingLink('https://open.spotify.com/intl-id/playlist/37i9dQZF1DX0XUsuxWHRQd?si=abc');
  assert.deepEqual([spotify.provider, spotify.kind, spotify.embedUrl], ['SPOTIFY', 'playlist', 'https://open.spotify.com/embed/playlist/37i9dQZF1DX0XUsuxWHRQd']);
  assert.equal(parseStreamingLink('<iframe src="https://open.spotify.com/embed/album/4aawyAB9vmqN3uQ7FjRGTy" onload="alert(1)"></iframe>').embedUrl,
    'https://open.spotify.com/embed/album/4aawyAB9vmqN3uQ7FjRGTy');
  for (const bad of ['<img src=x onerror=alert(1)>', 'https://evil.example/embed', 'https://open.spotify.com/user/abc', '', undefined]) {
    assert.equal(parseStreamingLink(bad), null);
  }
});
