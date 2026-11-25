import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadTs } from './load-ts.mjs';
const { parseYoutube, embedUrl } = loadTs('lib/streamingLinks.ts', {}, { URL });

test('YouTube links of every common shape give the video or playlist ID', () => {
  const video = 'dQw4w9WgXcQ', list = 'PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf';
  assert.deepEqual({ ...parseYoutube(`https://www.youtube.com/watch?v=${video}`) }, { videoId: video });
  assert.deepEqual({ ...parseYoutube(`youtu.be/${video}?si=x`) }, { videoId: video });
  assert.deepEqual({ ...parseYoutube(`https://m.youtube.com/watch?v=${video}&list=${list}`) }, { videoId: video, playlistId: list });
  assert.deepEqual({ ...parseYoutube(`https://www.youtube.com/live/${video}`) }, { videoId: video });
  assert.deepEqual({ ...parseYoutube(`https://youtube.com/shorts/${video}`) }, { videoId: video });
  assert.deepEqual({ ...parseYoutube(`https://www.youtube.com/playlist?list=${list}`) }, { playlistId: list });
  assert.equal(parseYoutube('https://evil.example/watch?v=' + video), null);
  assert.equal(parseYoutube('https://www.youtube.com/watch?v=bad'), null);
});

test('embed URLs accept YouTube, Spotify and old iframe codes, and reject other hosts', () => {
  assert.equal(embedUrl('https://www.youtube.com/playlist?list=PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf'), 'https://www.youtube.com/embed/videoseries?list=PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf');
  assert.equal(embedUrl('https://open.spotify.com/intl-id/playlist/37i9dQZF1DX0XUsuxWHRQd?si=abc'), 'https://open.spotify.com/embed/playlist/37i9dQZF1DX0XUsuxWHRQd');
  assert.equal(embedUrl('<iframe src="https://open.spotify.com/embed/album/4aawyAB9vmqN3uQ7FjRGTy" onload="alert(1)"></iframe>'), 'https://open.spotify.com/embed/album/4aawyAB9vmqN3uQ7FjRGTy');
  assert.equal(embedUrl('<img src=x onerror=alert(1)>'), null);
  assert.equal(embedUrl('https://evil.example/embed'), null);
  assert.equal(embedUrl(''), null);
});
