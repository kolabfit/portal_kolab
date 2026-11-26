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

test('meeting phase follows the schedule date and times', async () => {
  const { meetingPhase } = await import('../api/lib/meetingLinks.js');
  const m = { date: '2026-11-28T00:00:00.000Z', time: '08:30:00', endTime: '10:00' };
  const at = clock => new Date(`2026-11-28T${clock}:00`);
  assert.equal(meetingPhase(m, at('08:00')).phase, 'UPCOMING');
  assert.equal(meetingPhase(m, at('08:21')).phase, 'LIVE');
  assert.equal(meetingPhase(m, at('09:59')).phase, 'LIVE');
  assert.equal(meetingPhase(m, at('10:00')).phase, 'ENDED');
  assert.equal(meetingPhase({ ...m, endTime: null }, at('10:29')).phase, 'LIVE');
  assert.equal(meetingPhase({ ...m, endTime: '07:00' }, at('10:29')).phase, 'LIVE');
  assert.equal(meetingPhase({ date: '', time: '' }), null);
});
