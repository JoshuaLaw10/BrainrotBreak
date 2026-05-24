# Clip Sourcing Guide

This guide walks you through sourcing the 80 licensed video clips that ship
with Doomscroll Break. Budget about 3 hours of focused work.

---

## What you're producing

```
media/
  sport_01.mp4
  sport_02.mp4
  …
  sport_15.mp4
  funny_01.mp4
  …
  funny_12.mp4
  calm_01.mp4
  …
  calm_16.mp4
  general_01.mp4
  …
  general_17.mp4
metadata.json   ← this gets generated; you fill in fields
```

Each clip:
- **Format:** mp4, H.264 baseline profile
- **Resolution:** 360×640 vertical (or 480×854 — pick one and stick with it)
- **Duration:** 8–15 seconds
- **Bitrate:** ~500 kbps video, ~96 kbps audio
- **Final size:** ~400–600 KB per clip
- **Total bundle:** ~30 MB across 80 clips

---

## Step 1: Where to source clips

Use ONE OF (in order of preference):

### Pexels Videos — https://www.pexels.com/videos/
- License: Pexels License (free for commercial use, no attribution required)
- Most variety, best search
- Sign up for a free account to download

### Pixabay Video — https://pixabay.com/videos/
- License: Pixabay Content License (similar terms)
- Smaller library but high quality

### Mixkit — https://mixkit.co/free-stock-video/
- License: Mixkit License (free, attribution-friendly)
- Curated, fewer options

**DO NOT USE:**
- ❌ YouTube (rips violate ToS regardless of "Creative Commons" labels)
- ❌ TikTok / Instagram (rips violate ToS)
- ❌ Stock sites that require paid licenses (Shutterstock, Getty)
- ❌ Anything where you can't point to an explicit "free for commercial use" license

---

## Step 2: Search queries per tag

Copy-paste these into the source site's search box. Pick the best 3–5 from each.

### `sport` — 15 clips
```
basketball dunk vertical short
soccer goal celebration vertical
gym workout vertical short
running marathon vertical
tennis serve vertical
skiing snowboard vertical
yoga stretching vertical
boxing training vertical
parkour jump vertical
swimming pool vertical
cycling vertical short
```

### `funny` — 12 clips
```
funny cat vertical short
dog being silly vertical
slapstick fail vertical
unexpected reaction vertical
goofy animal vertical
kid funny moment vertical
dance fail vertical
absurd moment vertical
```

### `calm` — 16 clips
```
ocean waves vertical
forest trees vertical
rain on window vertical
candle flame vertical
mountain timelapse vertical
flower blooming vertical
snow falling vertical
ASMR satisfying vertical
slow motion water drop vertical
sunset clouds vertical
fireplace cozy vertical
```

### `general` (untagged) — 17 clips
```
city street vertical
coffee pour vertical
food cooking vertical
abstract pattern vertical
nature wildlife vertical
travel landscape vertical
urban architecture vertical
art creation vertical
hands working vertical
```

---

## Step 3: Selection criteria

Pick clips that are:
- **Vertical or near-vertical** — landscape clips will letterbox in the 1/3-width panels
- **8–15 seconds** — shorter feels jarring, longer wastes bundle size
- **Visually clear at 360p** — avoid tiny details that pixelate
- **Mute-friendly** — the user defaults to muted; clips that depend on audio aren't useful here
- **Inoffensive** — Doombreak runs while ChatGPT generates. Users are working. No NSFW, gore, jump-scares, or politically charged content.

Reject clips that are:
- Watermarked (most stock sites' previews are watermarked — use the actual download)
- Logo-heavy (bundling logos = trademark risk)
- Real identifiable people (privacy)
- Contain text in non-English languages (looks weird in a US/EU-focused product)

---

## Step 4: Download and rename

For each chosen clip:

1. Click "Free Download" on the source page. Pick the smallest available
   resolution that's still ≥720×1280 (we'll downscale).
2. Rename the file to match the slot you're filling:
   `sport_01.mp4`, `sport_02.mp4`, etc.
3. Note the creator's display name and the source URL — you'll need them in
   step 5.
4. Drop the file in `media/` (create the folder if it doesn't exist).

---

## Step 5: Re-encode

Install ffmpeg if you don't have it:
```
brew install ffmpeg          # macOS
sudo apt install ffmpeg      # Ubuntu/Debian
choco install ffmpeg         # Windows (with Chocolatey)
```

Re-encode all clips with this single command (run from the project root):

```bash
mkdir -p media_encoded
for f in media/*.mp4; do
  name=$(basename "$f")
  ffmpeg -y -i "$f" \
    -vf "scale=-2:640:flags=lanczos,crop=360:640" \
    -c:v libx264 -profile:v baseline -preset slow -crf 28 \
    -maxrate 600k -bufsize 1200k \
    -c:a aac -b:a 96k -ac 1 \
    -movflags +faststart \
    -t 15 \
    "media_encoded/$name"
done
mv media media_original
mv media_encoded media
```

What this does:
- Scales to 640px tall, then crops to 360×640 (vertical)
- Encodes H.264 baseline (best compatibility)
- Targets ~500 kbps (CRF 28 + maxrate cap)
- Mono AAC audio at 96 kbps
- `+faststart` puts the moov atom at the front so playback can start
  before the full file loads
- Caps duration at 15 seconds

Verify with:
```bash
ls -lh media/ | head
ffprobe media/sport_01.mp4 2>&1 | grep -E "Duration|Stream"
```

Expect ~400–600KB per file, 360×640, ≤15 seconds.

---

## Step 6: Generate FEED metadata

Fill in `metadata.json` with one entry per clip — this is what the codegen
script reads. Template is provided as `metadata.template.json`.

```json
{
  "sport_01.mp4": {
    "tags": ["sport"],
    "creator": "@CreatorName",
    "title": "Brief description of clip",
    "license": "Pexels License",
    "source": "https://www.pexels.com/video/1234567/"
  },
  …
}
```

Then run:
```bash
node scripts/generate-feed.mjs
```

This validates that:
- Every file in `media/` has a metadata entry (and vice versa)
- Every file is 360×640 (or your chosen size)
- Every file is ≤15 seconds
- Every file is ≤700KB
- Every metadata entry has all required fields
- Tags are from the allowed set

If validation passes, it overwrites `data/feed.js` with the generated FEED
array. Re-run `npx vitest run` to confirm the new feed passes the data-
integrity tests.

---

## Step 7: Sanity check

```bash
du -sh media/                 # should be ~30MB
ls media/*.mp4 | wc -l        # should be 80
npx vitest run                # should still pass
```

---

## Common mistakes to avoid

1. **Downloading the watermarked preview** — the actual download is on the
   clip's detail page, often behind a "Free Download" button.
2. **Forgetting attribution** — Pexels doesn't require it but it's good
   practice to record `creator` so users see real credits in the overlay.
3. **Skipping re-encoding** — uncompressed clips can be 5–20MB each, blowing
   past the bundle size budget.
4. **Using non-vertical clips** — they'll letterbox awkwardly in the panels.
5. **Audio that startles** — avoid clips with sudden loud sounds; users may
   toggle sound on and get jumpscared.
