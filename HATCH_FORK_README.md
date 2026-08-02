# Cross-Hatch Fork of paintbynumbersgenerator

This is a fork of [drake7707/paintbynumbersgenerator](https://github.com/drake7707/paintbynumbersgenerator)
(MIT licensed — original copyright notice preserved in `LICENSE`).

Instead of filling each posterized region with a flat color, each region is filled
with one of 16 fixed-angle (45°/135°, "X" pattern) cross-hatch tiles, chosen by
that region's brightness. Region 1 (darkest) gets near-solid hatching; region 16
(lightest) gets no hatching (pure white). The number printed in each region shows
which of the 16 levels it belongs to — the number itself sits in the most open
part of the shape (least detail covered), the same "pole of inaccessibility"
placement the original tool already used for its color-swatch numbers.

## What changed vs. the original repo

- **`scripts/main.js`** (the pre-compiled browser bundle — no build step needed):
  - `GUIProcessManager.process()`: the loaded image is desaturated to grayscale
    luminance immediately after being read from the canvas, so the existing
    k-means clustering (still nominally "RGB") ends up clustering purely on
    brightness, since r=g=b for every pixel from that point on.
  - `GUIProcessManager.createSVG()`: after clustering, the 16 (or fewer) resulting
    clusters are ranked by brightness and mapped onto hatch levels 1–16.
    Flat `fill: rgb(...)` is replaced with `fill: url(#hatchLevelN)`, referencing
    an SVG `<pattern>` that tiles the corresponding hatch PNG. The printed label
    text is switched from the arbitrary cluster index to the hatch level number.
- **`assets/hatch-tiles.js`** (new file): the 16 cross-hatch tiles, base64-embedded
  as `window.HATCH_TILES.level1` .. `level16`, loaded before `main.js`.
- **`index.html`**: one new `<script>` tag to load `assets/hatch-tiles.js`.

The original `src/*.ts` TypeScript source is left untouched/unedited in this
fork — the actual behavior change lives in the compiled `scripts/main.js` only,
to avoid needing a working npm/webpack toolchain just to test this. If you want
to carry the same change back into the TypeScript source for a "proper" fork,
the equivalent edits are:
- `src/guiprocessmanager.ts`, in `process()` right after `ctx.getImageData(...)`
- `src/guiprocessmanager.ts`, in `createSVG()`, the `fill`/`stroke`/label block

## Known limitations / things to check once you can test in a real browser

1. **Not yet tested in an actual browser** — this was built and validated by
   hand-tracing the compiled JS and unit-testing the brightness-ranking logic
   in isolation (Node), since this sandbox has no browser/network available.
   Test locally first (see below) before publishing.
2. **Cluster count**: default is 16 (matches the hatch level count exactly),
   but the UI still lets a person set a different `Number of colors` value.
   If they pick fewer than 16, brightness ranks are spread proportionally
   across the 1–16 range (verified this works, e.g. 6 clusters → levels
   1,4,7,10,13,16). If they pick *more* than 16, multiple clusters can map to
   the same hatch level, which just means two different brightness bands look
   the same — not broken, just less granular than the input warrants. You may
   want to clamp `kMeansNrOfClusters` to a max of 16 in the UI for this fork.
3. **Pattern tile size** is fixed at 48px on-screen (`patternUnits="userSpaceOnUse"`),
   independent of the "Size multiplier" output setting — this keeps the hatching
   density looking consistent at any output size rather than stretching. If you
   want the hatching to scale with output size instead, this is the one
   knob (`patternTileSize` in `createSVG`) to change.
4. **PNG output** (`saveSvgAsPng.js`) — untested with pattern fills specifically;
   flat-color fills definitely worked in the original, patterns *should* work
   since it's standard SVG, but rasterizing SVG patterns via canvas has had
   cross-browser quirks historically. SVG download should work regardless.

## Testing locally

No build step required — it's plain JS/HTML.

```bash
cd hatch-fork
python3 -m http.server 8000
# open http://localhost:8000 in a browser
```

Try the built-in example images first (small/medium/trivial), then a real photo.
Check:
- Facets fill with visibly different hatch densities, darkest regions densest
- Numbers 1–16 appear in each region, in the most open part of the shape
- No numbers show anything outside 1–16
- Try setting "Number of colors" to something other than 16 and confirm it
  still looks reasonable

## Deploying to GitHub Pages

1. Push this folder to a new GitHub repo
2. Repo Settings → Pages → set source to the branch/root (or `/docs` if you
   move things there)
3. Done — no build/CI step needed since `scripts/main.js` is already compiled
