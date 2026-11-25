import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseMeetingLink } from '../api/lib/meetingLinks.js';

test('only https Google Meet and Zoom meeting links are accepted', () => {
  assert.equal(parseMeetingLink(' https://meet.google.com/abc-defg-hij ').provider, 'GOOGLE_MEET');
  assert.equal(parseMeetingLink('https://us02web.zoom.us/j/123456789?pwd=x').provider, 'ZOOM');
  assert.equal(parseMeetingLink('https://zoom.us/my/kolab').label, 'Zoom');
  for (const bad of ['', 'meet.google.com/abc-defg-hij', 'http://meet.google.com/abc-defg-hij', 'https://meet.google.com/',
    'https://evil.com/meet.google.com/abc', 'https://zoom.us.evil.com/j/1', 'https://evilzoom.us/j/1', 'javascript:alert(1)', 'https://zoom.us/pricing']) {
    assert.equal(parseMeetingLink(bad), null, bad);
  }
});
