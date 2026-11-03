import test from 'node:test';
import assert from 'node:assert/strict';
import {
  f2,
  f1,
  dl,
  tc,
  bqName,
  bqEst,
  parseSrt,
  normSubs,
  snapToMagnetic,
  detectSilences,
  COLOR_FILTERS,
  validatePreset,
} from './exportUtils';

test('f2 formats seconds into MM:SS correctly', () => {
  assert.equal(f2(0), '00:00');
  assert.equal(f2(65), '01:05');
  assert.equal(f2(3661), '61:01');
});

test('f1 formats seconds into MM:SS.m correctly', () => {
  assert.equal(f1(0), '00:00.0');
  assert.equal(f1(65.4), '01:05.4');
});

test('dl formats short and long durations properly', () => {
  assert.equal(dl(12.34), '12.3s');
  assert.equal(dl(75), '01:15');
});

test('tc parses timestamp prefixes correctly', () => {
  assert.equal(tc('01_30_intro.jpg'), 90);
  assert.equal(tc('05_20_clip.png'), 320);
  assert.equal(tc('no_timecode.png'), null);
});

test('bqName deduplicates file names correctly', () => {
  const used = new Set<string>();
  assert.equal(bqName('My Video', used), 'My Video');
  assert.equal(bqName('My Video', used), 'My Video-2');
  assert.equal(bqName('My Video', used), 'My Video-3');
  assert.equal(bqName('Another?? Video!!', used), 'Another Video');
});

test('bqEst calculates estimated size accurately', () => {
  assert.equal(bqEst({ built: false }), 0);
  const size = bqEst({ built: true, mbps: 8, dur: 10 });
  assert.equal(size, (8 * 125000 + 20000) * 10);
});

test('parseSrt parses SRT string into sorted normalized subtitles', () => {
  const srt = `1
00:00:01,000 --> 00:00:03,500
Hello world!

2
00:00:04,000 --> 00:00:06,000
<b>Welcome</b> to Clip Studio
`;
  const parsed = parseSrt(srt);
  assert.equal(parsed.length, 2);
  assert.equal(parsed[0].x, 'Hello world!');
  assert.equal(parsed[0].a, 1.0);
  assert.equal(parsed[0].b, 3.5);
  assert.equal(parsed[1].x, 'Welcome to Clip Studio');
  assert.equal(parsed[1].a, 4.0);
  assert.equal(parsed[1].b, 6.0);
});

test('snapToMagnetic snaps to nearest target within threshold', () => {
  const targets = [0, 2.0, 5.0, 8.5];
  // Close to 2.0 within 0.15 threshold
  const res1 = snapToMagnetic(2.08, targets, 0.15);
  assert.equal(res1.best, 2.0);
  assert.equal(res1.hit, 2.0);

  // Far from any target
  const res2 = snapToMagnetic(3.5, targets, 0.15);
  assert.equal(res2.best, 3.5);
  assert.equal(res2.hit, null);
});

test('detectSilences detects pauses below threshold', () => {
  // 50 samples at 25Hz = 2 seconds total
  // 0-10: loud, 10-25: quiet (15 samples = 0.6s), 25-50: loud
  const peaks = new Float32Array(50);
  peaks.fill(0.8);
  for (let i = 10; i < 25; i++) peaks[i] = 0.01;

  const silences = detectSilences(peaks, 0.05, 0.4, 25);
  assert.equal(silences.length, 1);
  assert.equal(silences[0].s, 10 / 25);
  assert.equal(silences[0].e, 25 / 25);
  assert.equal(silences[0].d, 0.6);
});

test('validatePreset normalizes presets and provides safe defaults', () => {
  const valid = validatePreset({
    name: 'TikTok Clean',
    font: 'anton',
    filter: 'cinematic',
    fmt: '9:16',
  });
  assert.ok(valid);
  assert.equal(valid.name, 'TikTok Clean');
  assert.equal(valid.font, 'anton');
  assert.equal(valid.filter, 'cinematic');
  assert.equal(valid.fmt, '9:16');
  assert.equal(valid.fps, 24);

  const invalid = validatePreset(null);
  assert.equal(invalid, null);
});

test('COLOR_FILTERS contains expected preset keys', () => {
  assert.ok('none' in COLOR_FILTERS);
  assert.ok('cinematic' in COLOR_FILTERS);
  assert.ok('noir' in COLOR_FILTERS);
  assert.ok('vibrant' in COLOR_FILTERS);
  assert.ok('vintage' in COLOR_FILTERS);
  assert.ok('highcontrast' in COLOR_FILTERS);
});
