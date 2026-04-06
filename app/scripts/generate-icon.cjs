/**
 * Fallback when frontend/public/icon.png is absent.
 * Writes build/icon.png, assets/tray.png, and frontend/public/icon.png.
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { PNG } = require("pngjs");

const root = path.join(__dirname, "..");
const repoRoot = path.join(root, "..");
const buildDir = path.join(root, "build");
const assetsDir = path.join(root, "assets");
const fePublic = path.join(repoRoot, "frontend", "public");

function roundedRectMask(x, y, size, cornerR) {
  const lx = Math.min(x, size - 1 - x);
  const ly = Math.min(y, size - 1 - y);
  if (lx >= cornerR && ly >= cornerR) return true;
  if (lx >= cornerR || ly >= cornerR) {
    if (lx < cornerR && ly < cornerR) {
      const dx = cornerR - lx;
      const dy = cornerR - ly;
      return Math.hypot(dx, dy) <= cornerR;
    }
    return true;
  }
  const dx = cornerR - lx;
  const dy = cornerR - ly;
  return Math.hypot(dx, dy) <= cornerR;
}

function drawIcon(size) {
  const png = new PNG({ width: size, height: size });
  const cx = size / 2;
  const cy = size / 2;
  const cornerR = size * 0.19;
  const innerR = size * 0.22;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (size * y + x) << 2;
      if (!roundedRectMask(x, y, size, cornerR)) {
        png.data[i] = 0;
        png.data[i + 1] = 0;
        png.data[i + 2] = 0;
        png.data[i + 3] = 0;
        continue;
      }
      const inner = Math.hypot(x - cx, y - cy) < innerR;
      png.data[i] = inner ? 0xaa : 0x58;
      png.data[i + 1] = inner ? 0xb3 : 0x65;
      png.data[i + 2] = inner ? 0xff : 0xf2;
      png.data[i + 3] = 255;
    }
  }
  return PNG.sync.write(png);
}

fs.mkdirSync(buildDir, { recursive: true });
fs.mkdirSync(assetsDir, { recursive: true });
fs.mkdirSync(fePublic, { recursive: true });

const buf512 = drawIcon(512);
const buf32 = drawIcon(32);
const buildPng = path.join(buildDir, "icon.png");
fs.writeFileSync(buildPng, buf512);
fs.writeFileSync(path.join(assetsDir, "tray.png"), buf32);
fs.writeFileSync(path.join(assetsDir, "icon.png"), buf512);
fs.writeFileSync(path.join(fePublic, "icon.png"), buf512);
execFileSync(
  process.execPath,
  [path.join(__dirname, "write-ico.mjs"), buildPng, path.join(buildDir, "icon.ico")],
  { stdio: "inherit" }
);
console.log(
  "Wrote build/icon.png, build/icon.ico, assets/tray.png, frontend/public/icon.png (placeholder)"
);
