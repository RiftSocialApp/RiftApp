/**
 * Canonical logo: frontend/public/icon.png
 * Copies into app/build (electron-builder) and app/assets/tray.png.
 * If missing, generate-icon.cjs creates a placeholder in all three places.
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

function pngToIcoFile(pngPath, icoPath) {
  execFileSync(
    process.execPath,
    [path.join(__dirname, "write-ico.mjs"), pngPath, icoPath],
    { stdio: "inherit" }
  );
}

const appDir = path.join(__dirname, "..");
const repoRoot = path.join(appDir, "..");
const canonicalIcon = path.join(repoRoot, "frontend", "public", "icon.png");
const buildDir = path.join(appDir, "build");
const assetsDir = path.join(appDir, "assets");

fs.mkdirSync(buildDir, { recursive: true });
fs.mkdirSync(assetsDir, { recursive: true });
fs.mkdirSync(path.join(repoRoot, "frontend", "public"), { recursive: true });

if (fs.existsSync(canonicalIcon)) {
  const buildPng = path.join(buildDir, "icon.png");
  fs.copyFileSync(canonicalIcon, buildPng);
  fs.copyFileSync(canonicalIcon, path.join(assetsDir, "tray.png"));
  fs.copyFileSync(canonicalIcon, path.join(assetsDir, "icon.png"));
  pngToIcoFile(buildPng, path.join(buildDir, "icon.ico"));
  console.log(
    "Icons synced from frontend/public/icon.png → app/build (png+ico), app/assets (tray+icon)"
  );
} else {
  console.warn("frontend/public/icon.png missing; generating placeholder icons.");
  execFileSync(process.execPath, [path.join(__dirname, "generate-icon.cjs")], {
    stdio: "inherit",
    cwd: appDir,
  });
}
