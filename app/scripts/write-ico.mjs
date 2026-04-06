/**
 * Writes Windows .ico from a square PNG (for NSIS / electron-builder).
 * Usage: node scripts/write-ico.mjs <input.png> <output.ico>
 */
import fs from "fs";
import pngToIco from "png-to-ico";

const [, , inPath, outPath] = process.argv;
if (!inPath || !outPath) {
  console.error("usage: node write-ico.mjs <input.png> <output.ico>");
  process.exit(1);
}
const ico = await pngToIco(inPath);
fs.writeFileSync(outPath, Buffer.from(ico));
