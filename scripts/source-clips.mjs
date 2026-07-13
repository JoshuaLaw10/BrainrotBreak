#!/usr/bin/env node
// scripts/source-clips.mjs
// =================================================================
// Downloads portrait clips from the Pexels API into media/ and writes
// metadata.json, ready for `npm run feed`.
//
// Setup (one-time, ~2 min):
//   1. Get a free API key: https://www.pexels.com/api/
//   2. export PEXELS_API_KEY=your_key
//
// Run:  npm run source            (4 clips per tag = 20 total)
//       npm run source -- --per-tag 8
//
// Requires ffmpeg on PATH (compresses each clip to fit the ≤700KB
// bundle budget enforced by generate-feed.mjs).
//
// Licensing: Pexels License permits free commercial use and
// redistribution without attribution (we attribute anyway in
// metadata.json). Do NOT point this at any other source.
// =================================================================

import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, statSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = join(__dirname, '..');
const MEDIA_DIR = join(ROOT, 'media');
const TMP_DIR   = join(ROOT, '.clip-tmp');
const METADATA  = join(ROOT, 'metadata.json');

const API_KEY = process.env.PEXELS_API_KEY;
if (!API_KEY) {
  console.error('✗ PEXELS_API_KEY is not set.');
  console.error('  Get a free key at https://www.pexels.com/api/ then:');
  console.error('  PEXELS_API_KEY=xxx npm run source');
  process.exit(1);
}

try {
  execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' });
} catch {
  console.error('✗ ffmpeg not found on PATH. Install it (brew install ffmpeg) and retry.');
  process.exit(1);
}

const perTagArg = process.argv.indexOf('--per-tag');
const PER_TAG   = perTagArg !== -1 ? parseInt(process.argv[perTagArg + 1], 10) : 4;
if (!Number.isInteger(PER_TAG) || PER_TAG < 1 || PER_TAG > 20) {
  console.error('✗ --per-tag must be an integer between 1 and 20.');
  process.exit(1);
}

// Search queries per tag. 'general' maps to untagged clips.
const QUERIES = {
  calm:    ['ocean waves slow', 'rain on window', 'forest stream', 'clouds timelapse', 'candle flame'],
  funny:   ['funny dog', 'funny cat', 'puppy playing', 'baby goat', 'parrot talking'],
  sport:   ['basketball dunk', 'skateboard trick', 'surfing wave', 'soccer training', 'snowboarding'],
  focus:   ['typing keyboard close up', 'pouring coffee', 'writing notebook', 'chess pieces', 'library study'],
  general: ['city night timelapse', 'aerial coastline drone', 'neon street', 'northern lights', 'street food cooking'],
};

const MAX_CLIP_SECONDS = 10;
const TARGET_BYTES     = 700 * 1024; // must match generate-feed.mjs budget

async function pexels(path) {
  const res = await fetch('https://api.pexels.com/videos/' + path, {
    headers: { Authorization: API_KEY },
  });
  if (!res.ok) throw new Error('Pexels API ' + res.status + ' for ' + path);
  return res.json();
}

/** Smallest portrait-ish file that is still at least ~540px wide. */
function pickFile(video) {
  const candidates = (video.video_files || [])
    .filter(f => f.file_type === 'video/mp4' && f.width && f.height && f.height > f.width)
    .sort((a, b) => (a.width * a.height) - (b.width * b.height));
  return candidates.find(f => f.width >= 480) || candidates[candidates.length - 1] || null;
}

async function download(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('download failed ' + res.status);
  writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
}

function compress(src, dest) {
  // Portrait 540px wide, capped duration + bitrate to land under budget.
  execFileSync('ffmpeg', [
    '-y', '-i', src,
    '-t', String(MAX_CLIP_SECONDS),
    '-vf', 'scale=540:-2',
    '-c:v', 'libx264', '-preset', 'veryfast',
    '-b:v', '400k', '-maxrate', '500k', '-bufsize', '1000k',
    '-c:a', 'aac', '-b:a', '64k',
    '-movflags', '+faststart',
    dest,
  ], { stdio: 'ignore' });
  return statSync(dest).size;
}

const metadata = existsSync(METADATA) ? JSON.parse(readFileSync(METADATA, 'utf-8')) : {};
for (const k of Object.keys(metadata)) if (k.startsWith('_')) delete metadata[k];

mkdirSync(MEDIA_DIR, { recursive: true });
mkdirSync(TMP_DIR, { recursive: true });

const usedIds = new Set();
let sourced = 0, failed = 0;

for (const [tag, queries] of Object.entries(QUERIES)) {
  let got = 0, qi = 0, page = 1;

  while (got < PER_TAG && qi < queries.length) {
    const query = queries[qi];
    let data;
    try {
      data = await pexels('search?query=' + encodeURIComponent(query) +
        '&orientation=portrait&size=medium&per_page=10&page=' + page);
    } catch (e) {
      console.error('✗ search failed for "' + query + '": ' + e.message);
      qi++; page = 1; continue;
    }

    const videos = (data.videos || []).filter(v => !usedIds.has(v.id) && v.duration >= 5);
    if (!videos.length) { qi++; page = 1; continue; }

    for (const video of videos) {
      if (got >= PER_TAG) break;
      const file = pickFile(video);
      if (!file) continue;

      const name = tag + '_' + String(got + 1).padStart(2, '0') + '.mp4';
      const tmp  = join(TMP_DIR, name);
      const out  = join(MEDIA_DIR, name);

      try {
        process.stdout.write('… ' + name + ' ← pexels #' + video.id + ' (' + query + ') ');
        await download(file.link, tmp);
        const size = compress(tmp, out);
        if (size > TARGET_BYTES) {
          rmSync(out);
          console.log('skipped (still ' + Math.round(size / 1024) + 'KB after compress)');
          continue;
        }
        usedIds.add(video.id);
        metadata[name] = {
          tags:    tag === 'general' ? [] : [tag],
          creator: '@' + ((video.user && video.user.name) || 'unknown').replace(/\s+/g, ''),
          title:   query,
          license: 'Pexels License',
          source:  video.url,
        };
        got++; sourced++;
        console.log('✓ ' + Math.round(size / 1024) + 'KB');
      } catch (e) {
        failed++;
        console.log('✗ ' + e.message);
      }
    }
    // Exhausted this page for this query; advance query (keeps variety up).
    qi++; page = 1;
  }

  if (got < PER_TAG) {
    console.warn('⚠ tag "' + tag + '": only sourced ' + got + '/' + PER_TAG + ' clips.');
  }
}

rmSync(TMP_DIR, { recursive: true, force: true });
writeFileSync(METADATA, JSON.stringify(metadata, null, 2) + '\n');

console.log('\nDone: ' + sourced + ' clips sourced' + (failed ? ', ' + failed + ' failed' : '') + '.');
console.log('metadata.json written. Now run:  npm run feed');
