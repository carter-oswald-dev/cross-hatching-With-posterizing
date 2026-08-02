# Exact change list: original repo -> cross-hatch fork

Verified with `diff -rq` against a clean copy of the original repo. This is the
complete set of changes — nothing else in the repo was touched.

## New files/folders to add (2)

| Path | What it is |
|---|---|
| `assets/hatch-tiles.js` | New folder + file. The 16 cross-hatch PNGs, base64-embedded as `window.HATCH_TILES.level1`..`level16`. Copy this file in as-is. |
| `HATCH_FORK_README.md` | Optional — documents the fork's changes. Not required for the site to work. |

## Existing files modified (2)

| Path | What changed |
|---|---|
| `index.html` | 1 line added: a `<script>` tag loading `assets/hatch-tiles.js`, placed before the `scripts/main.js` tag |
| `scripts/main.js` | 3 edits inside existing functions (details below) — no new functions, no files renamed, nothing deleted |

## Files/folders NOT touched

Everything else — `src/*.ts`, `src-cli/`, `styles/`, `package.json`, `LICENSE`,
`README.md`, `dist/` — is unmodified. The TypeScript source under `src/` was
left as-is; this fork only patches the pre-compiled `scripts/main.js` browser
bundle, so no build step (npm/webpack/tsc) is required to use it.

---

## How to apply this to your own fork

### Step 1 — Fork and clone
Fork `drake7707/paintbynumbersgenerator` on GitHub as normal, then clone your fork locally.

### Step 2 — Add the new asset file
Copy `assets/hatch-tiles.js` (included alongside this file) into a new `assets/`
folder at the repo root:
```
your-fork/
  assets/
    hatch-tiles.js   <- copy this in
  index.html
  scripts/
    main.js
  ...
```

### Step 3 — Edit `index.html`
Apply `index.html.patch`, or make the change by hand: find this block near the
bottom of the file (around line 413-416):
```html
<script src="scripts/lib/require.js"></script>
<script src="scripts/lib/jquery-1.11.0.min.js"></script>
<script src="scripts/lib/materialize.min.js"></script>
<script src='scripts/main.js'></script>
```
and add one line before the `main.js` script tag:
```html
<script src="scripts/lib/require.js"></script>
<script src="scripts/lib/jquery-1.11.0.min.js"></script>
<script src="scripts/lib/materialize.min.js"></script>
<script src="assets/hatch-tiles.js"></script>
<script src='scripts/main.js'></script>
```

### Step 4 — Edit `scripts/main.js`
Apply `main.js.patch` with:
```bash
cd your-fork
patch -p1 < path/to/main.js.patch
```
(If `patch` fails due to line-ending differences — the original file uses
CRLF — see the troubleshooting note at the bottom.)

Or apply the 3 changes by hand. All three are inside the `guiprocessmanager`
module:

**Change A — grayscale forcing, inside `GUIProcessManager.process()`:**
Find this line (near the top of the function):
```js
let imgData = ctx.getImageData(0, 0, c.width, c.height);
```
Add immediately after it:
```js
// --- HATCH FORK: force grayscale ---
if (settings.forceGrayscale !== false) {
    const gdata = imgData.data;
    for (let gi = 0; gi < gdata.length; gi += 4) {
        const gr = gdata[gi], gg = gdata[gi + 1], gb = gdata[gi + 2];
        const gray = Math.round(0.2126 * gr + 0.7152 * gg + 0.0722 * gb);
        gdata[gi] = gray;
        gdata[gi + 1] = gray;
        gdata[gi + 2] = gray;
    }
    ctx.putImageData(imgData, 0, 0);
}
// --- end HATCH FORK ---
```

**Change B — hatch pattern defs, inside `GUIProcessManager.createSVG()`:**
Find:
```js
svg.setAttribute("height", sizeMultiplier * facetResult.height + "");
let count = 0;
```
Insert the pattern-building block between those two lines (see `main.js.patch`
for the exact ~50 lines — this ranks clusters by brightness and creates one
SVG `<pattern>` per hatch level used).

**Change C — fill/stroke/label swap, still inside `createSVG()`:**
Three small replacements further down in the same function's facet loop:
1. The `stroke` fallback color: wrap in `if (useHatch...) { grey } else { original rgb }`
2. The `fill` color: wrap in `if (useHatch...) { url(#hatchLevelN) } else { original rgb }`
3. The label text: `txt.textContent = f.color + ""` becomes a ternary that
   shows the hatch level instead when hatch mode is active

Full exact code for all of these is in `main.js.patch`.

### Step 5 — Test locally before deploying
```bash
cd your-fork
python3 -m http.server 8000
```
Open `http://localhost:8000`, try the built-in example images, confirm:
- Regions fill with hatch texture (not flat color)
- Numbers 1-16 appear, darkest region = 1, lightest = 16
- Nothing throws console errors

### Step 6 — Push and enable GitHub Pages
Push to your fork, then repo Settings → Pages → set source branch. No CI/build
step needed since everything is already plain JS/HTML.

---

## Troubleshooting: patch fails to apply

The original `scripts/main.js` uses Windows line endings (CRLF). If
`patch -p1 < main.js.patch` complains about line endings or fails to match,
try:
```bash
patch -p1 --binary < main.js.patch
```
or apply the 3 changes by hand using the "Change A/B/C" descriptions above —
they're short enough to paste in directly, and none of them depend on exact
surrounding whitespace beyond what's shown.
