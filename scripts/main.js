--- paintbynumbersgenerator-master/scripts/main.js	2025-01-05 10:27:55.000000000 +0000
+++ hatch-fork/scripts/main.js	2026-08-02 03:17:49.920433217 +0000
@@ -2649,7 +2649,23 @@
             return __awaiter(this, void 0, void 0, function* () {
                 const c = document.getElementById("canvas");
                 const ctx = c.getContext("2d");
-                let imgData = ctx.getImageData(0, 0, c.width, c.height);
+                let imgData = ctx.getImageData(0, 0, c.width, c.height);
+                // --- HATCH FORK: force grayscale ---
+                // Desaturate to luminance so k-means clustering (still RGB internally)
+                // effectively clusters purely on brightness, since r=g=b for every pixel.
+                if (settings.forceGrayscale !== false) {
+                    const gdata = imgData.data;
+                    for (let gi = 0; gi < gdata.length; gi += 4) {
+                        const gr = gdata[gi], gg = gdata[gi + 1], gb = gdata[gi + 2];
+                        // standard luminance weighting
+                        const gray = Math.round(0.2126 * gr + 0.7152 * gg + 0.0722 * gb);
+                        gdata[gi] = gray;
+                        gdata[gi + 1] = gray;
+                        gdata[gi + 2] = gray;
+                    }
+                    ctx.putImageData(imgData, 0, 0);
+                }
+                // --- end HATCH FORK ---
                 if (settings.resizeImageIfTooLarge && (c.width > settings.resizeImageWidth || c.height > settings.resizeImageHeight)) {
                     let width = c.width;
                     let height = c.height;
@@ -2900,6 +2916,58 @@
                 const svg = document.createElementNS(xmlns, "svg");
                 svg.setAttribute("width", sizeMultiplier * facetResult.width + "");
                 svg.setAttribute("height", sizeMultiplier * facetResult.height + "");
+
+                // --- HATCH FORK: build brightness-ranked hatch pattern defs ---
+                // colorsByIndex[c] is an [r,g,b] centroid (r=g=b since we forced grayscale
+                // upstream). Rank all clusters actually used by brightness so cluster index
+                // (which is arbitrary from k-means) maps to a meaningful hatch level:
+                // darkest cluster -> level 1 (near-solid), lightest cluster -> level 16 (empty).
+                const useHatch = (typeof window.HATCH_MODE_ENABLED !== "undefined") ? window.HATCH_MODE_ENABLED : true;
+                let colorIndexToHatchLevel = {};
+                if (useHatch && window.HATCH_TILES) {
+                    const brightnessByIndex = colorsByIndex.map((rgb, idx) => ({
+                        idx,
+                        brightness: (rgb[0] + rgb[1] + rgb[2]) / 3,
+                    }));
+                    brightnessByIndex.sort((a, b) => b.brightness - a.brightness); // brightest first
+                    const n = brightnessByIndex.length;
+                    const nLevels = 16;
+                    brightnessByIndex.forEach((entry, rank) => {
+                        // rank 0 = brightest -> level 16 (empty/white)
+                        // rank n-1 = darkest -> level 1 (near-solid)
+                        let level;
+                        if (n <= 1) {
+                            level = nLevels;
+                        } else {
+                            level = nLevels - Math.round((rank / (n - 1)) * (nLevels - 1));
+                        }
+                        colorIndexToHatchLevel[entry.idx] = level;
+                    });
+
+                    // define one <pattern> per hatch level actually in use
+                    const defs = document.createElementNS(xmlns, "defs");
+                    const usedLevels = new Set(Object.values(colorIndexToHatchLevel));
+                    const patternTileSize = 48; // on-screen tile size in px (independent of sizeMultiplier)
+                    for (const level of usedLevels) {
+                        const pattern = document.createElementNS(xmlns, "pattern");
+                        pattern.setAttribute("id", "hatchLevel" + level);
+                        pattern.setAttribute("patternUnits", "userSpaceOnUse");
+                        pattern.setAttribute("width", patternTileSize + "");
+                        pattern.setAttribute("height", patternTileSize + "");
+                        const img = document.createElementNS(xmlns, "image");
+                        img.setAttributeNS("http://www.w3.org/1999/xlink", "href", window.HATCH_TILES["level" + level]);
+                        img.setAttribute("href", window.HATCH_TILES["level" + level]);
+                        img.setAttribute("x", "0");
+                        img.setAttribute("y", "0");
+                        img.setAttribute("width", patternTileSize + "");
+                        img.setAttribute("height", patternTileSize + "");
+                        pattern.appendChild(img);
+                        defs.appendChild(pattern);
+                    }
+                    svg.appendChild(defs);
+                }
+                // --- end HATCH FORK ---
+
                 let count = 0;
                 for (const f of facetResult.facets) {
                     if (f != null && f.borderSegments.length > 0) {
@@ -2943,12 +3011,22 @@
                             // make the border the same color as the fill color if there is no border stroke
                             // to not have gaps in between facets
                             if (fill) {
-                                svgPath.style.stroke = `rgb(${colorsByIndex[f.color][0]},${colorsByIndex[f.color][1]},${colorsByIndex[f.color][2]})`;
+                                if (useHatch && window.HATCH_TILES) {
+                                    // use a neutral mid-gray stroke so facet seams don't show a color halo
+                                    svgPath.style.stroke = "rgb(200,200,200)";
+                                } else {
+                                    svgPath.style.stroke = `rgb(${colorsByIndex[f.color][0]},${colorsByIndex[f.color][1]},${colorsByIndex[f.color][2]})`;
+                                }
                             }
                         }
                         svgPath.style.strokeWidth = "1px"; // Set stroke width
                         if (fill) {
-                            svgPath.style.fill = `rgb(${colorsByIndex[f.color][0]},${colorsByIndex[f.color][1]},${colorsByIndex[f.color][2]})`;
+                            if (useHatch && window.HATCH_TILES) {
+                                const level = colorIndexToHatchLevel[f.color];
+                                svgPath.style.fill = `url(#hatchLevel${level})`;
+                            } else {
+                                svgPath.style.fill = `rgb(${colorsByIndex[f.color][0]},${colorsByIndex[f.color][1]},${colorsByIndex[f.color][2]})`;
+                            }
                         }
                         else {
                             svgPath.style.fill = "none";
@@ -2986,7 +3064,7 @@
                             txt.setAttribute("dominant-baseline", "middle");
                             txt.setAttribute("text-anchor", "middle");
                             txt.setAttribute("fill", fontColor);
-                            txt.textContent = f.color + "";
+                            txt.textContent = (useHatch && window.HATCH_TILES) ? (colorIndexToHatchLevel[f.color] + "") : (f.color + "");
                             const subsvg = document.createElementNS(xmlns, "svg");
                             subsvg.setAttribute("width", f.labelBounds.width * sizeMultiplier + "");
                             subsvg.setAttribute("height", f.labelBounds.height * sizeMultiplier + "");
